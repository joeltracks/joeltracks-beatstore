import { createClient } from '@supabase/supabase-js';
import { S3Client, CreateMultipartUploadCommand, UploadPartCommand, ListPartsCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand, HeadObjectCommand, GetObjectCommand, CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createHash } from 'node:crypto';
export const partSize=10*1024*1024;
export const uploadLimits={mp3:50*1024*1024,wav:250*1024*1024,stems:512*1024*1024,cover:10*1024*1024};
export type AssetKind=keyof typeof uploadLimits;
export interface BeatInput {title:string;genre:string;bpm:number;key:string;tags:string[];}
export interface AssetInput {id:string;beatId:string;kind:AssetKind;filename:string;contentType:string;size:number;sha256:string;stagingKey:string;}
export interface Asset {id:string;beat_id:string;kind:AssetKind;filename:string;content_type:string;byte_size:number;sha256:string;staging_key:string;final_key:string|null;multipart_id:string|null;status:string;is_current:boolean;expires_at:string;}
export interface UploadRepository {
  list(hash:string):Promise<unknown[]>;
  save(hash:string,id:string,input:BeatInput):Promise<string>;
  begin(hash:string,input:AssetInput):Promise<void>;
  get(hash:string,id:string):Promise<Asset|null>;
  transition(hash:string,id:string,action:string,data?:Record<string,unknown>):Promise<boolean>;
}
export class UploadError extends Error {status:number;constructor(message:string,status=400){super(message);this.status=status;}}
export function validId(value:unknown):value is string{return typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);}
export function validateBeat(value:unknown):BeatInput {
  const data=value as Partial<BeatInput>|null;
  if(!data||typeof data.title!=='string'||!data.title.trim()||data.title.trim().length>100||!['R&B Beats','Afro Beats','Trap Beats'].includes(data.genre||'')||!Number.isInteger(data.bpm)||data.bpm!<1||data.bpm!>400||typeof data.key!=='string'||data.key.length>70||!Array.isArray(data.tags)||data.tags.length>16||data.tags.some(t=>typeof t!=='string'||!t.trim()||t.length>40))throw new UploadError('Check the title, category, BPM, key and tags.');
  return {title:data.title.trim(),genre:data.genre!,bpm:data.bpm!,key:data.key.trim(),tags:[...new Set(data.tags.map(t=>t.trim().replace(/^#+/,'').toLowerCase()))]};
}
export function validateFile(value:unknown):{kind:AssetKind;filename:string;size:number;sha256:string;contentType:string}{
  const d=value as Record<string,unknown>|null;
  if(!d||typeof d.kind!=='string'||!Object.hasOwn(uploadLimits,d.kind)||typeof d.filename!=='string'||d.filename.length<1||d.filename.length>180||/[\x00-\x1f\x7f\\/]/.test(d.filename)||!Number.isSafeInteger(d.size)||Number(d.size)<1||Number(d.size)>uploadLimits[d.kind as AssetKind]||typeof d.sha256!=='string'||!/^[a-f0-9]{64}$/.test(d.sha256))throw new UploadError('Choose a supported file within the displayed size limit.');
  const ext=d.filename.split('.').pop()!.toLowerCase(),kind=d.kind as AssetKind;
  const contentType=kind==='mp3'&&ext==='mp3'?'audio/mpeg':kind==='wav'&&ext==='wav'?'audio/wav':kind==='stems'&&ext==='zip'?'application/zip':kind==='cover'?({jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp'} as Record<string,string>)[ext]:undefined;
  if(!contentType)throw new UploadError('The file extension does not match this upload field.');
  return {kind,filename:d.filename,size:Number(d.size),sha256:d.sha256,contentType};
}
export function matchesHeader(bytes:Uint8Array,type:string){
  const text=(a:number,b:number)=>String.fromCharCode(...bytes.slice(a,b));
  if(type==='audio/mpeg')return text(0,3)==='ID3'||bytes[0]===255&&(bytes[1]&224)===224&&(bytes[1]&6)!==0;
  if(type==='audio/wav')return text(0,4)==='RIFF'&&text(8,12)==='WAVE';
  if(type==='application/zip')return bytes[0]===80&&bytes[1]===75&&bytes[2]===3&&bytes[3]===4;
  if(type==='image/jpeg')return bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
  if(type==='image/png')return [137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v);
  return type==='image/webp'&&text(0,4)==='RIFF'&&text(8,12)==='WEBP';
}
export function createUploadRepository(url:string,key:string):UploadRepository {
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(10000)})}});
  async function rpc<T>(name:string,params:Record<string,unknown>):Promise<T>{const {data,error}=await db.rpc(name,params);if(error){if(error.message.includes('BEAT_NOT_FOUND'))throw new UploadError('Beat not found.',404);if(error.code==='23505')throw new UploadError('Finish or cancel the existing upload for this file type.',409);if(error.code==='42501')throw new UploadError('Your seller session expired. Sign in again.',401);throw new Error('UPLOAD_DATABASE_UNAVAILABLE');}return data as T;}
  return {list:hash=>rpc('jt_seller_beats',{p_hash:hash}),save:(hash,id,data)=>rpc('jt_save_beat',{p_hash:hash,p_id:id,p_data:data}),begin:(hash,data)=>rpc('jt_begin_beat_asset',{p_hash:hash,p_data:data}),get:(hash,id)=>rpc('jt_get_beat_asset',{p_hash:hash,p_id:id}),transition:(hash,id,action,data={})=>rpc('jt_transition_beat_asset',{p_hash:hash,p_id:id,p_action:action,p_data:data})};
}
export interface UploadPart {part:number;etag:string;size:number;}
export interface UploadStorage {
  create(key:string,type:string):Promise<string>;
  sign(key:string,uploadId:string,part:number,size:number):Promise<string>;
  parts(key:string,uploadId:string):Promise<UploadPart[]>;
  complete(key:string,uploadId:string,parts:UploadPart[]):Promise<void>;
  head(key:string):Promise<{size:number;etag:string}|null>;
  verify(key:string,size:number,sha256:string,type:string):Promise<void>;
  copy(source:string,destination:string,type:string,etag:string):Promise<void>;
  remove(key:string):Promise<void>;
  abort(key:string,id:string):Promise<void>;
}
export function createUploadStorage(accountId:string,accessKeyId:string,secretAccessKey:string,localEndpoint?:string):UploadStorage {
  const s3=new S3Client({region:'auto',endpoint:localEndpoint||`https://${accountId}.r2.cloudflarestorage.com`,forcePathStyle:true,credentials:{accessKeyId,secretAccessKey},requestChecksumCalculation:'WHEN_REQUIRED',responseChecksumValidation:'WHEN_REQUIRED',maxAttempts:2});
  const bucket='joeltracks-private';
  return {
    async create(key,type){const r=await s3.send(new CreateMultipartUploadCommand({Bucket:bucket,Key:key,ContentType:type}));if(!r.UploadId)throw new Error('UPLOAD_CREATION_FAILED');return r.UploadId;},
    sign:(key,id,part,size)=>getSignedUrl(s3,new UploadPartCommand({Bucket:bucket,Key:key,UploadId:id,PartNumber:part,ContentLength:size}),{expiresIn:600}),
    async parts(key,id){const r=await s3.send(new ListPartsCommand({Bucket:bucket,Key:key,UploadId:id}));if(r.IsTruncated)throw new UploadError('Unexpected multipart manifest.',409);return (r.Parts||[]).map(p=>({part:p.PartNumber!,etag:p.ETag!,size:p.Size!}));},
    async complete(key,id,parts){await s3.send(new CompleteMultipartUploadCommand({Bucket:bucket,Key:key,UploadId:id,MultipartUpload:{Parts:parts.map(p=>({PartNumber:p.part,ETag:p.etag}))}}));},
    async head(key){try{const h=await s3.send(new HeadObjectCommand({Bucket:bucket,Key:key}));return {size:h.ContentLength!,etag:h.ETag!};}catch(e){if((e as {$metadata?:{httpStatusCode?:number}}).$metadata?.httpStatusCode===404)return null;throw e;}},
    async verify(key,size,sha,type){
      const response=await s3.send(new GetObjectCommand({Bucket:bucket,Key:key}),{abortSignal:AbortSignal.timeout(240000)});
      if(!response.Body)throw new Error('UPLOAD_BODY_MISSING');
      const reader=response.Body.transformToWebStream().getReader(),digest=createHash('sha256');let count=0,header=new Uint8Array();
      try{for(;;){const chunk=await reader.read();if(chunk.done)break;count+=chunk.value.length;if(count>size)throw new UploadError('The uploaded file size does not match.');if(header.length<32){const next=new Uint8Array(Math.min(32,header.length+chunk.value.length));next.set(header);next.set(chunk.value.slice(0,next.length-header.length),header.length);header=next;}digest.update(chunk.value);}}
      finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
      if(count!==size||digest.digest('hex')!==sha)throw new UploadError('The uploaded file checksum or size does not match. Choose the original file and upload again.');
      if(!matchesHeader(header,type))throw new UploadError('The file contents do not match the selected format.');
    },
    async copy(source,destination,type,etag){await s3.send(new CopyObjectCommand({Bucket:bucket,Key:destination,CopySource:`${bucket}/${source}`,CopySourceIfMatch:etag,ContentType:type,MetadataDirective:'REPLACE'}));},
    async remove(key){await s3.send(new DeleteObjectCommand({Bucket:bucket,Key:key}));},
    async abort(key,id){try{await s3.send(new AbortMultipartUploadCommand({Bucket:bucket,Key:key,UploadId:id}));}catch(e){if((e as {name?:string}).name!=='NoSuchUpload')throw e;}}
  };
}
