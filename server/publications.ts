import { createClient } from '@supabase/supabase-js';
import { S3Client, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { parseWebStream } from 'music-metadata';
import { UploadError, type Asset } from './uploads.ts';

export interface PublicationCandidate { snapshot: Record<string,unknown>; mp3: Asset; cover: Asset|null; files?:Asset[]; previousVersion:string|null; }
export interface PublicMedia { key:string; contentType:string; size:number; }
export interface PublicationRepository {
  catalog():Promise<unknown[]>;
  states(hash:string):Promise<Record<string,unknown>>;
  candidate(hash:string,id:string):Promise<PublicationCandidate>;
  publish(hash:string,id:string,snapshot:Record<string,unknown>,duration:number,previousVersion:string|null):Promise<unknown>;
  unpublish(hash:string,id:string):Promise<unknown>;
  media(id:string,version:string,kind:string):Promise<PublicMedia|null>;
}
export interface PublicationStorage {
  inspect(candidate:PublicationCandidate):Promise<number>;
  sign(media:PublicMedia):Promise<string>;
}
export interface PublicationDependencies { publicationRepository?:PublicationRepository; publicationStorage?:PublicationStorage; }
export const previewLinkSeconds=600;
export function createPublicationRepository(url:string,key:string):PublicationRepository {
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(10000)})}});
  async function rpc<T>(name:string,args:Record<string,unknown>={}):Promise<T>{
    const {data,error}=await db.rpc(name,args);
    if(error){
      if(error.code==='42501')throw new UploadError('Your seller session expired. Sign in again.',401);
      if(error.message.includes('BEAT_NOT_FOUND'))throw new UploadError('Beat not found.',404);
      if(error.message.includes('PUBLICATION_MP3_REQUIRED'))throw new UploadError('Upload and verify an MP3 before publishing. A WAV upload creates the MP3 automatically.');
      if(error.message.includes('PUBLICATION_PENDING'))throw new UploadError('Finish or cancel incomplete uploads before publishing.',409);
      if(error.message.includes('PUBLICATION_CHANGED'))throw new UploadError('The draft changed during publication. Review it and publish again.',409);
      throw new Error('PUBLICATION_DATABASE_UNAVAILABLE');
    }
    return data as T;
  }
  return {
    catalog:()=>rpc('jt_public_catalog'),states:hash=>rpc('jt_publication_states',{p_hash:hash}),
    candidate:(hash,id)=>rpc('jt_publication_candidate',{p_hash:hash,p_id:id}),
    publish:(hash,id,snapshot,duration,previousVersion)=>rpc('jt_publish_beat',{p_hash:hash,p_id:id,p_snapshot:snapshot,p_duration:duration,p_previous:previousVersion}),
    unpublish:(hash,id)=>rpc('jt_unpublish_beat',{p_hash:hash,p_id:id}),
    media:(id,version,kind)=>rpc('jt_public_media',{p_id:id,p_version:version,p_kind:kind})
  };
}
export function createPublicationStorage(accountId:string,accessKeyId:string,secretAccessKey:string,localEndpoint?:string):PublicationStorage {
  const s3=new S3Client({region:'auto',endpoint:localEndpoint||`https://${accountId}.r2.cloudflarestorage.com`,forcePathStyle:true,credentials:{accessKeyId,secretAccessKey},requestChecksumCalculation:'WHEN_REQUIRED',responseChecksumValidation:'WHEN_REQUIRED',maxAttempts:2});
  const Bucket='joeltracks-private';
  return {
    async inspect(candidate){
      for(const asset of candidate.files||[candidate.mp3,candidate.cover].filter((a):a is Asset=>Boolean(a))){
        if(asset.status!=='ready'||!asset.final_key||asset.final_key!==`beats/${asset.beat_id}/${asset.id}`)throw new UploadError('Publish only verified beat files.');
        const head=await s3.send(new HeadObjectCommand({Bucket,Key:asset.final_key}));
        if(head.ContentLength!==asset.byte_size)throw new UploadError('A verified file is missing or changed. Upload it again before publishing.');
      }
      const response=await s3.send(new GetObjectCommand({Bucket,Key:candidate.mp3.final_key!}),{abortSignal:AbortSignal.timeout(240000)});
      if(!response.Body)throw new UploadError('The MP3 could not be read.');
      const stream=response.Body.transformToWebStream();
      try{
        const metadata=await parseWebStream(stream,{mimeType:'audio/mpeg',size:candidate.mp3.byte_size},{duration:true,skipCovers:true});
        const duration=metadata.format.duration;
        if(!duration||!Number.isFinite(duration)||duration>86400||!/Layer 3/.test(metadata.format.codec||''))throw new UploadError('This MP3 has no readable audio duration. Export a fresh MP3 or upload its WAV.');
        return duration;
      }finally{await stream.cancel().catch(()=>{});(response.Body as {destroy?:()=>void}).destroy?.();}
    },
    sign:media=>getSignedUrl(s3,new GetObjectCommand({Bucket,Key:media.key,ResponseContentType:media.contentType,ResponseContentDisposition:'inline',ResponseCacheControl:'no-store'}),{expiresIn:previewLinkSeconds})
  };
}
