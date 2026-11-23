import type { Hono, Context } from 'hono';
import type { Bindings } from './app.ts';
import { createUploadRepository, createUploadStorage, UploadError, partSize, uploadLimits, validateBeat, validateFile, validId, type UploadRepository, type UploadStorage, type Asset, type UploadPart } from './uploads.ts';
import { publicationRepository,publicationConfigured } from './publication-routes.ts';
import type { PublicationDependencies } from './publications.ts';
export interface UploadDependencies extends PublicationDependencies {uploadRepository?:UploadRepository;uploadStorage?:UploadStorage;}
type C=Context<{Bindings:Bindings}>;
export type SellerGuard=(c:C,action:(hash:string)=>Promise<Response>)=>Promise<Response>;
export function registerUploadRoutes(app:Hono<{Bindings:Bindings}>,guard:SellerGuard,d:UploadDependencies){
  const ready=(env:Bindings)=>Boolean(d.uploadStorage||env.R2_ACCESS_KEY_ID&&env.R2_SECRET_ACCESS_KEY);
  const repo=(env:Bindings)=>d.uploadRepository||createUploadRepository(env.SUPABASE_URL!,env.SUPABASE_SECRET_KEY!);
  const storage=(env:Bindings)=>d.uploadStorage||createUploadStorage('1b4bc53beb85cda4d8618ee8a695585f',env.R2_ACCESS_KEY_ID!,env.R2_SECRET_ACCESS_KEY!);
  async function execute(c:C,action:(hash:string,db:UploadRepository,s:UploadStorage)=>Promise<Response>){
    return guard(c,async hash=>{
      if(!ready(c.env))return c.json({error:'Upload storage configuration is not complete.'},503);
      try{return await action(hash,repo(c.env),storage(c.env));}catch(e){if(e instanceof UploadError)return c.json({error:e.message},e.status as 400);throw e;}
    });
  }
  async function asset(c:C,hash:string,db:UploadRepository){const id=c.req.param('id');if(!validId(id))throw new UploadError('Upload not found.',404);const row=await db.get(hash,id);if(!row)throw new UploadError('Upload not found.',404);return row;}
  function live(a:Asset){if(!a.multipart_id||Date.parse(a.expires_at)<=Date.now()||!['uploading','verifying'].includes(a.status))throw new UploadError('This upload is no longer active. Cancel it and start again.',410);}
  async function parts(s:UploadStorage,a:Asset){try{return await s.parts(a.staging_key,a.multipart_id!);}catch(e){if((e as {name?:string}).name==='NoSuchUpload')throw new UploadError('The upload expired. Cancel it and start again.',410);throw e;}}
  function completeParts(a:Asset,uploaded:UploadPart[]){
    const count=Math.ceil(a.byte_size/partSize);uploaded.sort((x,y)=>x.part-y.part);
    if(uploaded.length!==count||uploaded.some((p,i)=>p.part!==i+1||p.size!==Math.min(partSize,a.byte_size-i*partSize)||!p.etag))throw new UploadError('Some file parts are missing or incomplete. Resume the upload before verifying.',409);
    return uploaded;
  }
  app.get('/api/seller/beats',c=>guard(c,async hash=>{
    try{
      const db=repo(c.env),beats=await db.list(hash) as Record<string,unknown>[];
      const publications=publicationConfigured(c.env,d)?await publicationRepository(c.env,d).states(hash):{};
      return c.json({beats:beats.map(b=>({...b,publication:publications[String(b.id)]||null})),storageAvailable:ready(c.env),publishingAvailable:publicationConfigured(c.env,d),limits:uploadLimits,partSize});
    }
    catch(e){if(e instanceof UploadError)return c.json({error:e.message},e.status as 400);throw e;}
  }));
  app.post('/api/seller/beats',c=>execute(c,async(hash,db)=>{
    const data=await c.req.json(),id=data?.id||crypto.randomUUID();if(!validId(id))throw new UploadError('Invalid beat ID.');
    return c.json({id:await db.save(hash,id,validateBeat(data))});
  }));
  app.post('/api/seller/beats/:beatId/uploads',c=>execute(c,async(hash,db,s)=>{
    const beatId=c.req.param('beatId');if(!validId(beatId))throw new UploadError('Invalid beat ID.');
    const input=validateFile(await c.req.json()),id=crypto.randomUUID(),stagingKey=`staging/${beatId}/${id}`;
    await db.begin(hash,{...input,id,beatId,stagingKey});
    let uploadId:string|undefined;
    try{uploadId=await s.create(stagingKey,input.contentType);if(!await db.transition(hash,id,'start',{uploadId}))throw new Error('UPLOAD_STATE_CHANGED');}
    catch(e){if(uploadId)await s.abort(stagingKey,uploadId).catch(()=>{});await db.transition(hash,id,'abort').catch(()=>{});throw e;}
    return c.json({id,partSize,partCount:Math.ceil(input.size/partSize)});
  }));
  app.get('/api/seller/uploads/:id',c=>execute(c,async(hash,db,s)=>{
    const a=await asset(c,hash,db);if(a.status==='ready')return c.json({status:'ready',id:a.id,parts:[]});
    live(a);const head=await s.head(a.staging_key);
    return c.json({id:a.id,status:a.status,filename:a.filename,size:a.byte_size,sha256:a.sha256,partSize,completed:Boolean(head),parts:head?[]:(await parts(s,a)).map(p=>({part:p.part,size:p.size}))});
  }));
  app.post('/api/seller/uploads/:id/part',c=>execute(c,async(hash,db,s)=>{
    const a=await asset(c,hash,db);live(a);if(a.status!=='uploading')throw new UploadError('Verification is in progress. Retry shortly.',409);
    const n=(await c.req.json())?.part;if(!Number.isInteger(n)||n<1||n>Math.ceil(a.byte_size/partSize))throw new UploadError('Invalid upload part.');
    return c.json({url:await s.sign(a.staging_key,a.multipart_id!,n,Math.min(partSize,a.byte_size-(n-1)*partSize)),expiresIn:600});
  }));
  app.post('/api/seller/uploads/:id/complete',c=>execute(c,async(hash,db,s)=>{
    const a=await asset(c,hash,db);if(a.status==='ready')return c.json({id:a.id,status:'ready'});
    live(a);const lease=crypto.randomUUID();if(!await db.transition(hash,a.id,'claim',{lease}))throw new UploadError('Verification is already running. Retry after it finishes.',409);
    try{
      let head=await s.head(a.staging_key);
      if(!head){const uploaded=completeParts(a,await parts(s,a));await s.complete(a.staging_key,a.multipart_id!,uploaded);head=await s.head(a.staging_key);}
      if(!head||head.size!==a.byte_size)throw new UploadError('The uploaded file size does not match.');
      await s.verify(a.staging_key,a.byte_size,a.sha256,a.content_type);
      const finalKey=`beats/${a.beat_id}/${a.id}`;
      await s.copy(a.staging_key,finalKey,a.content_type,head.etag);
      // The DB rechecks the still-active owner session before changing availability.
      if(!await db.transition(hash,a.id,'finish',{lease,finalKey}))throw new Error('UPLOAD_FINALIZATION_FAILED');
      await s.remove(a.staging_key).catch(()=>console.error(JSON.stringify({event:'staging_cleanup_pending',assetId:a.id})));
      return c.json({id:a.id,status:'ready'});
    }catch(e){
      const bad=e instanceof UploadError&&e.status!==409;
      await db.transition(hash,a.id,bad?'fail':'retry',{lease}).catch(()=>{});
      if(bad)await s.remove(a.staging_key).catch(()=>{});
      throw e;
    }
  }));
  app.post('/api/seller/uploads/:id/abort',c=>execute(c,async(hash,db,s)=>{
    const a=await asset(c,hash,db);if(a.status==='ready')throw new UploadError('This file is already verified. Remove it from the beat instead.',409);
    if(a.status!=='aborted'&&!await db.transition(hash,a.id,'abort'))throw new UploadError('Verification is still running. Retry shortly.',409);
    if(a.multipart_id)await s.abort(a.staging_key,a.multipart_id).catch(()=>console.error(JSON.stringify({event:'multipart_cleanup_pending',assetId:a.id})));
    await s.remove(a.staging_key).catch(()=>{});
    // A failed DB commit can leave an unreferenced immutable copy. This ID has
    // never reached ready; cancelling it must not touch any older ready version.
    await s.remove(`beats/${a.beat_id}/${a.id}`).catch(()=>{});
    return c.json({status:'aborted'});
  }));
  app.post('/api/seller/assets/:id/remove',c=>execute(c,async(hash,db)=>{
    const a=await asset(c,hash,db);if(!await db.transition(hash,a.id,'remove'))throw new UploadError('Verified file not found.',404);
    return c.json({removed:true});
  }));
}
