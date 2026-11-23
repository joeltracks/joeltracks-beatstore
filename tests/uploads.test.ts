import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createApp, type Bindings } from '../server/app.ts';
import { hash } from '../server/security.ts';
import { UploadError, uploadLimits, partSize, validateFile, validateBeat, matchesHeader, type Asset, type AssetInput, type BeatInput, type UploadStorage, type UploadRepository } from '../server/uploads.ts';
import type {SellerAuth,SellerRepository} from '../server/seller-auth.ts';
const env:Bindings={APP_ORIGIN:'https://store.example',SELLER_SESSION_SECRET:'fixture-only-session-secret'.repeat(3)};
const token='b'.repeat(64),ownerHash=await hash(token),cookie='__Host-jt-seller='+token;
const sha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
class Drafts implements UploadRepository {
  beats=new Map<string,BeatInput>();assets=new Map<string,Asset>();active=true;
  check(){if(!this.active)throw new UploadError('Session expired',401);}
  async list(){this.check();return [...this.beats].map(([id,b])=>({id,...b,assets:[...this.assets.values()].filter(a=>a.beat_id===id).map(a=>({id:a.id,status:a.status,current:a.is_current,kind:a.kind,filename:a.filename,size:a.byte_size,sha256:a.sha256,expiresAt:a.expires_at})),fileAvailability:Object.fromEntries(['mp3','wav','stems'].map(k=>[k,[...this.assets.values()].some(a=>a.beat_id===id&&a.kind===k&&a.is_current)]))}));}
  async save(_hash:string,id:string,b:BeatInput){this.check();this.beats.set(id,b);return id;}
  async begin(_hash:string,a:AssetInput){this.check();if(!this.beats.has(a.beatId))throw new UploadError('Not found',404);if([...this.assets.values()].some(v=>v.beat_id===a.beatId&&v.kind===a.kind&&['initializing','uploading','verifying'].includes(v.status)))throw new UploadError('Existing upload',409);this.assets.set(a.id,{id:a.id,beat_id:a.beatId,kind:a.kind,filename:a.filename,content_type:a.contentType,byte_size:a.size,sha256:a.sha256,staging_key:a.stagingKey,final_key:null,multipart_id:null,status:'initializing',is_current:false,expires_at:new Date(Date.now()+86400000).toISOString()});}
  async get(_hash:string,id:string){this.check();const a=this.assets.get(id);return a?{...a}:null;}
  async transition(_hash:string,id:string,action:string,data:Record<string,unknown>={}){this.check();const a=this.assets.get(id);if(!a)return false;if(action==='start'){a.multipart_id=String(data.uploadId);a.status='uploading';}else if(action==='claim'){if(a.status!=='uploading')return false;a.status='verifying';}else if(action==='finish'){for(const b of this.assets.values())if(b.beat_id===a.beat_id&&b.kind===a.kind)b.is_current=false;a.status='ready';a.final_key=String(data.finalKey);a.is_current=true;}else if(action==='remove')a.is_current=false;else if(action==='retry')a.status='uploading';else if(action==='fail')a.status='failed';else if(action==='abort'){if(a.status==='ready'||a.status==='verifying')return false;a.status='aborted';}return true;}
}
class Objects implements UploadStorage {
  writes=0;objects=new Map<string,Uint8Array>();uploads=new Map<string,Map<number,Uint8Array>>();failCopy=false;duringVerify:undefined|(()=>void);
  async create(key:string){this.writes++;this.uploads.set(key,new Map());return 'multipart-id';}
  async sign(key:string,_id:string,n:number){return 'https://r2.example/'+key+'?partNumber='+n;}
  async parts(key:string){return [...(this.uploads.get(key)||new Map()).entries()].map(([part,bytes])=>({part,etag:'etag-'+part,size:bytes.length}));}
  async complete(key:string){const chunks=[...this.uploads.get(key)!.entries()].sort((a,b)=>a[0]-b[0]).map(e=>e[1]);this.objects.set(key,Buffer.concat(chunks));this.uploads.delete(key);}
  async head(key:string){const bytes=this.objects.get(key);return bytes?{size:bytes.length,etag:'test-etag'}:null;}
  async verify(key:string,size:number,expected:string,type:string){this.duringVerify?.();const bytes=this.objects.get(key)!;if(bytes.length!==size||sha(bytes)!==expected||!matchesHeader(bytes,type))throw new UploadError('Invalid uploaded contents');}
  async copy(source:string,destination:string){if(this.failCopy)throw new Error('Transient storage error');this.objects.set(destination,this.objects.get(source)!);}
  async remove(key:string){this.objects.delete(key);}
  async abort(key:string){this.uploads.delete(key);}
}
function fixture(){
  const drafts=new Drafts(),objects=new Objects();let mfa=true;let session=true;
  const auth:SellerAuth={async login(){throw Error('Not used');},async inspect(){return {tokens:{accessToken:'test',refreshToken:'test'},identity:{id:'owner',email:'joeltracks2000@gmail.com',confirmed:true,aal:mfa?'aal2':'aal1',authSessionId:'auth-session'},factors:[{id:'factor',verified:true}]};},async enroll(){throw Error('Not used');},async verify(){throw Error('Not used');},async logout(){}};
  const db:SellerRepository={async rate(){return true;},async create(){return true;},async acquire(h){return h===ownerHash&&session?{payload:payload,userId:'owner',authSessionId:'auth-session',mfa}:null;},async save(){return true;},async revoke(){session=false;},async overview(){return {paidOrders:0,revenueCents:0,pendingOrders:0,recentOrders:[]};}};
  const app=createApp({sellerAuth:auth,sellerRepository:db,uploadRepository:drafts,uploadStorage:objects});
  return {app,drafts,objects,setMfa:(value:boolean)=>{mfa=value;}};
}
import {seal} from '../server/security.ts';
const payload=await seal(env.SELLER_SESSION_SECRET!,{accessToken:'test',refreshToken:'test'});
function req(path:string,data?:unknown,credential=cookie,origin=env.APP_ORIGIN){return new Request(env.APP_ORIGIN+'/api/seller/'+path,{method:data===undefined?'GET':'POST',headers:{Cookie:credential,...(data===undefined?{}:{Origin:origin,'Content-Type':'application/json'})},body:data===undefined?undefined:JSON.stringify(data)});}
async function start(f:ReturnType<typeof fixture>,bytes=Buffer.from('ID3fixture'),kind='mp3',beatId?:string){
  const response=await f.app.fetch(req('beats',{title:'Private test draft',genre:'R&B Beats',bpm:88,key:'C min',tags:['soulful'],...(beatId?{id:beatId}:{})}),env);assert.equal(response.status,200);const id=(await response.json()).id;
  const intent=await f.app.fetch(req('beats/'+id+'/uploads',{kind,filename:'fixture.'+(kind==='stems'?'zip':kind),size:bytes.length,sha256:sha(bytes)}),env);assert.equal(intent.status,200);const upload=(await intent.json()).id,a=f.drafts.assets.get(upload)!;return {beatId:id,id:upload,asset:a,bytes};
}
async function finish(f:ReturnType<typeof fixture>,upload:Awaited<ReturnType<typeof start>>){f.objects.uploads.get(upload.asset.staging_key)!.set(1,upload.bytes);return f.app.fetch(req('uploads/'+upload.id+'/complete',{}),env);}

test('anonymous, password-only and cross-origin callers cannot create uploads',async()=>{const f=fixture();assert.equal((await f.app.fetch(req('beats',{},''),env)).status,401);f.setMfa(false);assert.equal((await f.app.fetch(req('beats',{}),env)).status,403);assert.equal((await f.app.fetch(req('beats',{},cookie,'https://evil.example'),env)).status,403);assert.equal(f.objects.writes,0);});
test('file policy rejects empty, oversized, wrong-extension and unsafe filenames',()=>{for(const value of [{kind:'mp3',filename:'a.wav',size:10,sha256:'a'.repeat(64)},{kind:'mp3',filename:'../a.mp3',size:10,sha256:'a'.repeat(64)},{kind:'stems',filename:'a.zip',size:uploadLimits.stems+1,sha256:'a'.repeat(64)},{kind:'cover',filename:'a.svg',size:10,sha256:'a'.repeat(64)},{kind:'mp3',filename:'a.mp3',size:0,sha256:'a'.repeat(64)},null])assert.throws(()=>validateFile(value),UploadError);assert.throws(()=>validateBeat({title:'x',genre:'Other',bpm:90,key:'',tags:[]}),UploadError);});
test('selected and incomplete files do not enable any license package',async()=>{const f=fixture(),a=await start(f);const before=await f.app.fetch(req('beats'),env);assert.deepEqual((await before.json()).beats[0].fileAvailability,{mp3:false,wav:false,stems:false});const result=await f.app.fetch(req('uploads/'+a.id+'/complete',{}),env);assert.equal(result.status,409);assert.equal(f.drafts.assets.get(a.id)!.status,'uploading');});
test('verified multipart files alone become current; no object key leaks in list/status',async()=>{const f=fixture(),a=await start(f);assert.equal((await finish(f,a)).status,200);const r=await f.app.fetch(req('beats'),env),text=await r.text();assert(!text.includes('staging/')&&!text.includes('beats/'));assert.deepEqual(JSON.parse(text).beats[0].fileAvailability,{mp3:true,wav:false,stems:false});assert.equal(f.objects.objects.has(a.asset.staging_key),false);assert.equal((await f.app.fetch(req('uploads/'+a.id+'/complete',{}),env)).status,200);});
test('corrupted bytes and format spoofing fail verification and never activate a tier',async()=>{for(const bytes of [Buffer.from('WRONGbytes'),Buffer.from('ID3fixture')]){const f=fixture(),a=await start(f,bytes);if(bytes.toString().startsWith('ID3'))a.bytes=Buffer.from('ID3altered');assert.equal((await finish(f,a)).status,400);assert.equal(f.drafts.assets.get(a.id)!.status,'failed');assert.equal(f.drafts.assets.get(a.id)!.is_current,false);}});
test('part signing stays within its server-owned upload and expected part count',async()=>{const f=fixture(),a=await start(f);for(const part of [0,-1,2,'1'])assert.equal((await f.app.fetch(req('uploads/'+a.id+'/part',{part,key:'attacker-key'}),env)).status,400);const r=await f.app.fetch(req('uploads/'+a.id+'/part',{part:1,key:'attacker-key'}),env);assert.equal(r.status,200);assert.match((await r.json()).url,new RegExp(a.id));});
test('resume reports only completed part sizes; the full expected fingerprint remains fixed',async()=>{const f=fixture(),bytes=Buffer.alloc(partSize+4);bytes.write('ID3');const a=await start(f,bytes);f.objects.uploads.get(a.asset.staging_key)!.set(1,bytes.subarray(0,partSize));const r=await f.app.fetch(req('uploads/'+a.id),env);assert.deepEqual((await r.json()).parts,[{part:1,size:partSize}]);assert.equal((await f.app.fetch(req('uploads/'+a.id+'/complete',{}),env)).status,409);f.objects.uploads.get(a.asset.staging_key)!.set(2,bytes.subarray(partSize));assert.equal((await f.app.fetch(req('uploads/'+a.id+'/complete',{}),env)).status,200);});
test('a failed replacement keeps the original verified file and successful replacement preserves old bytes',async()=>{const f=fixture(),first=await start(f);await finish(f,first);const original=f.drafts.assets.get(first.id)!;const oldKey=original.final_key!;const next=await start(f,Buffer.from('ID3replacement'),'mp3',first.beatId);f.objects.failCopy=true;assert.equal((await finish(f,next)).status,503);assert.equal(original.is_current,true);f.objects.failCopy=false;assert.equal((await f.app.fetch(req('uploads/'+next.id+'/complete',{}),env)).status,200);assert.equal(original.is_current,false);assert(f.objects.objects.has(oldKey));});
test('cancelling incomplete uploads does not remove an existing package',async()=>{const f=fixture(),first=await start(f);await finish(f,first);const next=await start(f,Buffer.from('ID3replacement'),'mp3',first.beatId);assert.equal((await f.app.fetch(req('uploads/'+next.id+'/abort',{}),env)).status,200);assert.equal(f.drafts.assets.get(first.id)!.is_current,true);assert.equal(f.objects.uploads.has(next.asset.staging_key),false);});
test('removing files disables their package without deleting retained originals',async()=>{const f=fixture(),a=await start(f);await finish(f,a);const key=f.drafts.assets.get(a.id)!.final_key!;assert.equal((await f.app.fetch(req('assets/'+a.id+'/remove',{}),env)).status,200);assert(f.objects.objects.has(key));const list=await f.app.fetch(req('beats'),env);assert.equal((await list.json()).beats[0].fileAvailability.mp3,false);});
test('revoking the seller session during verification prevents availability changes',async()=>{const f=fixture(),a=await start(f);f.objects.duringVerify=()=>{f.drafts.active=false;};assert.equal((await finish(f,a)).status,401);assert.equal(f.drafts.assets.get(a.id)!.is_current,false);});


test('empty ZIP archives are not accepted as stems',()=>{assert.equal(matchesHeader(new Uint8Array([80,75,5,6]),'application/zip'),false);});
