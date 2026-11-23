import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createApp,type Bindings} from '../server/app.ts';
import {hash,seal} from '../server/security.ts';
import {UploadError,type Asset} from '../server/uploads.ts';
import type {SellerAuth,SellerRepository} from '../server/seller-auth.ts';
import type {PublicationRepository,PublicationStorage,PublicationCandidate} from '../server/publications.ts';
const beatId='10000000-0000-4000-8000-000000000001',mp3Id='10000000-0000-4000-8000-000000000002',coverId='10000000-0000-4000-8000-000000000003';
const env:Bindings={APP_ORIGIN:'https://store.example',SELLER_SESSION_SECRET:'publication-test-only-secret'.repeat(3)};
const token='c'.repeat(64),cookie='__Host-jt-seller='+token,ownerHash=await hash(token),payload=await seal(env.SELLER_SESSION_SECRET!,{accessToken:'test',refreshToken:'test'});
function asset(id:string,kind:'mp3'|'cover'):Asset{return {id,beat_id:beatId,kind,filename:kind==='mp3'?'private-original.mp3':'private-original.png',content_type:kind==='mp3'?'audio/mpeg':'image/png',byte_size:2048,sha256:'a'.repeat(64),staging_key:'staging/'+id,final_key:'beats/'+beatId+'/'+id,multipart_id:null,status:'ready',is_current:true,expires_at:new Date(Date.now()+86400000).toISOString()};}
class Publications implements PublicationRepository{
  draft={title:'Real saved beat',genre:'R&B Beats',bpm:88,key:'C min',tags:['soulful'],assets:{mp3:mp3Id,cover:coverId}};
  published:undefined|{snapshot:{title:string;genre:string;bpm:number;key:string;tags:string[];assets:{mp3:string;cover:string}};version:string;duration:number};active=true;ready=true;pending=false;
  async states(){return {[beatId]:{isPublished:Boolean(this.published),version:this.published?.version,needsUpdate:JSON.stringify(this.published?.snapshot)!==JSON.stringify(this.draft)}};}
  async candidate(_hash:string,id:string):Promise<PublicationCandidate>{
    if(id!==beatId)throw new UploadError('Not found',404);if(!this.ready)throw new UploadError('A verified MP3 is required');if(this.pending)throw new UploadError('Finish incomplete uploads',409);
    return {snapshot:structuredClone(this.draft),mp3:asset(mp3Id,'mp3'),cover:asset(coverId,'cover'),previousVersion:this.published?.version||null};
  }
  async publish(_hash:string,_id:string,snapshot:Record<string,unknown>,duration:number,previous:string|null){
    if(!this.active)throw new UploadError('Session revoked',401);
    if(JSON.stringify(snapshot)!==JSON.stringify(this.draft)||(this.published?.version||null)!==previous)throw new UploadError('Draft changed',409);
    this.published={snapshot:structuredClone(snapshot) as typeof this.draft,version:crypto.randomUUID(),duration};return {isPublished:true,version:this.published.version};
  }
  async unpublish(){this.published=undefined;return {isPublished:false};}
  async catalog(){return this.published?[{id:beatId,title:this.published.snapshot.title,status:'Published',duration:this.published.duration,fileAvailability:{mp3:true,wav:false,stems:false},previewUrl:`/api/media/${beatId}/${this.published.version}/preview`,artworkUrl:`/api/media/${beatId}/${this.published.version}/artwork`}]:[];}
  async media(id:string,version:string,kind:string){if(id!==beatId||version!==this.published?.version||!['preview','artwork'].includes(kind))return null;const a=asset(kind==='preview'?mp3Id:coverId,kind==='preview'?'mp3':'cover');return {key:a.final_key!,contentType:a.content_type,size:a.byte_size};}
}
function fixture(){
  const db=new Publications();let mfa=true;const signed:string[]=[];let inspecting=0;let duringInspect:undefined|(()=>void);
  const auth:SellerAuth={async login(){throw Error('Not used');},async inspect(tokens){return {tokens,identity:{id:'owner',email:'joeltracks2000@gmail.com',confirmed:true,aal:mfa?'aal2':'aal1',authSessionId:'session'},factors:[{id:'factor',verified:true}]};},async enroll(){throw Error('Not used');},async verify(){throw Error('Not used');},async logout(){}};
  const sessions:SellerRepository={async rate(){return true;},async create(){return true;},async acquire(h){return h===ownerHash?{payload,userId:'owner',authSessionId:'session',mfa}:null;},async save(){return true;},async revoke(){},async overview(){return {paidOrders:0,revenueCents:0,pendingOrders:0,recentOrders:[]};}};
  const storage:PublicationStorage={async inspect(){inspecting++;duringInspect?.();return 193.25;},async sign(media){signed.push(media.key);return 'https://r2.example/'+media.key+'?signed-test-link';}};
  const app=createApp({sellerAuth:auth,sellerRepository:sessions,publicationRepository:db,publicationStorage:storage});
  return {app,db,signed,setMfa:(value:boolean)=>{mfa=value;},inspecting:()=>inspecting,setInspect:(fn:()=>void)=>{duringInspect=fn;}};
}
const req=(path:string,body?:unknown,session=cookie,origin=env.APP_ORIGIN)=>new Request(env.APP_ORIGIN+path,{method:body===undefined?'GET':'POST',headers:{Cookie:session,...(body===undefined?{}:{Origin:origin,'Content-Type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body)});
const publish=(f:ReturnType<typeof fixture>,body:unknown={})=>f.app.fetch(req('/api/seller/beats/'+beatId+'/publish',body),env);

test('publishing and unpublishing require the pinned seller MFA session and same-origin JSON',async()=>{
  const f=fixture();
  assert.equal((await f.app.fetch(req('/api/seller/beats/'+beatId+'/publish',{},''),env)).status,401);
  f.setMfa(false);assert.equal((await publish(f)).status,403);f.setMfa(true);
  assert.equal((await f.app.fetch(req('/api/seller/beats/'+beatId+'/unpublish',{},'',env.APP_ORIGIN),env)).status,401);
  assert.equal((await f.app.fetch(req('/api/seller/beats/'+beatId+'/publish',{},cookie,'https://evil.example'),env)).status,403);
  assert.equal(f.inspecting(),0);assert.deepEqual(await f.db.catalog(),[]);
});
test('drafts and incomplete file sets cannot leak into the public catalog',async()=>{
  const f=fixture();assert.deepEqual((await (await f.app.fetch(req('/api/catalog'),env)).json()).beats,[]);
  f.db.ready=false;assert.equal((await publish(f)).status,400);f.db.ready=true;f.db.pending=true;
  assert.equal((await publish(f)).status,409);assert.equal(f.inspecting(),0);
});
test('publish uses server-derived files and duration, exposing only the public projection',async()=>{
  const f=fixture();assert.equal((await publish(f,{duration:999,mp3Id:'attacker',snapshot:{title:'Injected'}})).status,200);
  const response=await f.app.fetch(req('/api/catalog'),env),body=await response.text();
  assert.match(response.headers.get('Cache-Control')!,/no-store/);
  assert.equal(JSON.parse(body).beats[0].duration,193.25);assert.equal(JSON.parse(body).beats[0].title,'Real saved beat');
  for(const secret of ['private-original','staging/','sha256','final_key','snapshot','accessToken'])assert(!body.includes(secret));
  assert.deepEqual(JSON.parse(body).beats[0].fileAvailability,{mp3:true,wav:false,stems:false});
});
test('public media authorizes only the published MP3/artwork version and handles HEAD without a GET signature',async()=>{
  const f=fixture();await publish(f);const version=f.db.published!.version,path='/api/media/'+beatId+'/'+version;
  const preview=await f.app.fetch(req(path+'/preview?key=some-private-wav'),env);assert.equal(preview.status,302);assert.equal(f.signed[0],'beats/'+beatId+'/'+mp3Id);
  assert.match(preview.headers.get('Cache-Control')!,/no-store/);
  const head=await f.app.fetch(new Request(env.APP_ORIGIN+path+'/preview',{method:'HEAD'}),env);assert.equal(head.status,200);assert.equal(head.headers.get('Content-Type'),'audio/mpeg');assert.equal(await head.text(),'');assert.equal(f.signed.length,1);
  assert.equal((await f.app.fetch(req(path+'/artwork'),env)).status,302);assert.equal(f.signed[1],'beats/'+beatId+'/'+coverId);
  for(const kind of ['wav','stems','agreement','mp3'])assert.equal((await f.app.fetch(req(path+'/'+kind),env)).status,404);
  assert.equal((await f.app.fetch(req('/api/media/not-a-uuid/'+version+'/preview'),env)).status,404);
});
test('draft edits stay private until an explicit update, which invalidates old media routes',async()=>{
  const f=fixture();await publish(f);const previous=f.db.published!.version;
  f.db.draft.title='Private edit';assert.equal((await f.db.catalog())[0].title,'Real saved beat');
  await publish(f);assert.equal((await f.db.catalog())[0].title,'Private edit');
  assert.equal((await f.app.fetch(req('/api/media/'+beatId+'/'+previous+'/preview'),env)).status,404);
});
test('unpublish removes catalog/media access without deleting source assets or activating checkout',async()=>{
  const f=fixture();await publish(f);const version=f.db.published!.version;
  assert.equal((await f.app.fetch(req('/api/seller/beats/'+beatId+'/unpublish',{}),env)).status,200);
  assert.deepEqual(await f.db.catalog(),[]);assert.equal(f.db.ready,true);
  assert.equal((await f.app.fetch(req('/api/media/'+beatId+'/'+version+'/preview'),env)).status,404);
  assert.equal((await f.app.fetch(req('/api/checkout',{}),env)).status,503);
});
test('changed drafts or revoked access during file inspection cannot be published',async()=>{
  const changed=fixture();changed.setInspect(()=>{changed.db.draft.title='Changed while checking';});assert.equal((await publish(changed)).status,409);assert.deepEqual(await changed.db.catalog(),[]);
  const revoked=fixture();revoked.setInspect(()=>{revoked.db.active=false;});assert.equal((await publish(revoked)).status,401);assert.deepEqual(await revoked.db.catalog(),[]);
});
