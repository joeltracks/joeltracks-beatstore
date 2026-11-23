import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp, processAccessEmails, type Bindings } from '../server/app.ts';
import { hash, unseal, seal, safeFilename } from '../server/security.ts';
import type { Repository, AccessOrder, MailJob } from '../server/repository.ts';

const env: Bindings = { APP_ORIGIN: 'https://store.example', ACCESS_SECRET: 'test-only-key-'.repeat(4) };
const fixture: AccessOrder = { id:'order-one', reference:'JT-TEST-1', currency:'USD', totalCents:5000, paidAt:'2026-11-23T00:00:00Z', items:[{title:'Test fixture',license:'Basic License'}],files:[{id:'file-one',name:'fixture.mp3',type:'audio/mpeg',key:'private/fixture.mp3'}] };
class Store implements Repository {
  tokens = new Map<string,{used:boolean;expired:boolean}>();
  sessions = new Set<string>();
  jobs: MailJob[] = [];
  paid = true;
  failSend = false;
  async request(input: {reference:string;email:string;tokenHash:string;payload:string}) {
    if (input.reference !== fixture.reference || input.email !== 'buyer@example.com' || !this.paid) return;
    this.tokens.set(input.tokenHash,{used:false,expired:false});this.jobs.push({id:'job-'+this.jobs.length,payload:input.payload,attempts:0});
  }
  async exchange(tokenHash:string,sessionHash:string) {
    const token=this.tokens.get(tokenHash);if(!token||token.used||token.expired||!this.paid)return false;
    token.used=true;this.sessions.add(sessionHash);return true;
  }
  async order(sessionHash:string){return this.sessions.has(sessionHash)&&this.paid?fixture:null;}
  async revoke(sessionHash:string){this.sessions.delete(sessionHash);}
  async claimMail(){return this.jobs.shift()||null;}
  async completeMail(_id:string){}
  async failMail(_id:string){this.failSend=true;}
}
function setup() {
  const db=new Store();const sent:{id:string;email:string;url:string}[]=[];
  const dependencies={repository:db,sendMail:async(job:{id:string;email:string;url:string})=>{sent.push(job);}};
  return {db,sent,dependencies,app:createApp(dependencies)};
}
function post(path:string,body:unknown,origin='https://store.example',cookie='') {
  return new Request('https://store.example'+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify(body)});
}
async function signIn(setupResult:ReturnType<typeof setup>) {
  const {db,app}=setupResult;const token='a'.repeat(64);db.tokens.set(await hash(token),{used:false,expired:false});
  const response=await app.fetch(post('/api/access/exchange',{token}),env);
  return response.headers.get('Set-Cookie')!.split(';')[0];
}
test('unconfigured mail fails honestly and does not claim a link was sent',async()=>{
  const app=createApp();const response=await app.fetch(post('/api/access/request',{email:'buyer@example.com',reference:'JT-TEST-1'}),{APP_ORIGIN:env.APP_ORIGIN});
  assert.equal(response.status,503);assert.match((await response.json()).error,/not available/);
});
test('matching and unknown orders have identical public responses; only paid matching order queues mail',async()=>{
  const x=setup();const request={email:'buyer@example.com',reference:'JT-TEST-1'};
  const yes=await x.app.fetch(post('/api/access/request',request),env);
  const no=await x.app.fetch(post('/api/access/request',{...request,reference:'JT-MISSING'}),env);
  assert.equal(yes.status,202);assert.deepEqual(await yes.json(),await no.json());assert.equal(x.db.jobs.length,1);assert.equal(x.sent.length,0);
  await processAccessEmails(env,x.dependencies);assert.equal(x.sent.length,1);assert.equal(x.sent[0].email,'buyer@example.com');assert.match(x.sent[0].url,/^https:\/\/store\.example\/access#token=[a-f0-9]{64}$/);
});
test('unpaid orders cannot request delivery mail',async()=>{
  const x=setup();x.db.paid=false;await x.app.fetch(post('/api/access/request',{email:'buyer@example.com',reference:'JT-TEST-1'}),env);assert.equal(x.db.jobs.length,0);
});
test('link GETs/scanners do not consume access tokens',async()=>{
  const x=setup();const token='a'.repeat(64);x.db.tokens.set(await hash(token),{used:false,expired:false});
  const response=await x.app.fetch(new Request('https://store.example/api/access/exchange?token='+token),env);
  assert.equal(response.status,404);assert.equal(x.db.tokens.get(await hash(token))!.used,false);
});
test('one-use links cannot be exchanged twice, even with concurrent attempts',async()=>{
  const x=setup();const token='a'.repeat(64);x.db.tokens.set(await hash(token),{used:false,expired:false});
  const responses=await Promise.all([x.app.fetch(post('/api/access/exchange',{token}),env),x.app.fetch(post('/api/access/exchange',{token}),env)]);
  assert.deepEqual(responses.map(r=>r.status).sort(),[200,400]);
  const cookie=responses.find(r=>r.status===200)!.headers.get('Set-Cookie')!;
  assert.match(cookie,/__Host-jt-order=/);assert.match(cookie,/HttpOnly/i);assert.match(cookie,/Secure/i);assert.match(cookie,/SameSite=Lax/i);
});
test('expired and malformed links fail without a session',async()=>{
  const x=setup();const token='a'.repeat(64);x.db.tokens.set(await hash(token),{used:false,expired:true});
  for(const value of [token,'bad-token']) {const response=await x.app.fetch(post('/api/access/exchange',{token:value}),env);assert.equal(response.status,400);assert.equal(response.headers.get('Set-Cookie'),null);}
});
test('sessions reveal only their order and never the storage object key',async()=>{
  const x=setup();const cookie=await signIn(x);
  const response=await x.app.fetch(new Request('https://store.example/api/access/order',{headers:{Cookie:cookie}}),env);
  const result=await response.json();assert.equal(result.reference,'JT-TEST-1');assert.equal(result.files[0].url,'/api/access/files/file-one');assert.equal('key' in result.files[0],false);assert.equal(JSON.stringify(result).includes('private/fixture'),false);
});
test('unauthenticated and cross-order file requests are denied before storage reads',async()=>{
  const x=setup();let reads=0;const bindings={...env,PRIVATE_FILES:{head:async()=>({size:4}),get:async()=>{reads++;return null;}}};
  const cookie=await signIn(x);
  for(const [path,token] of [['file-one',''],['somebody-elses-file',cookie]]){const response=await x.app.fetch(new Request('https://store.example/api/access/files/'+path,{headers:{Cookie:token}}),bindings);assert.equal(response.status,404);}
  assert.equal(reads,0);
});
test('refunding an order invalidates an existing session and its downloads',async()=>{
  const x=setup();const cookie=await signIn(x);x.db.paid=false;
  const response=await x.app.fetch(new Request('https://store.example/api/access/order',{headers:{Cookie:cookie}}),env);assert.equal(response.status,401);
});
test('logout revokes the session; expired cookie copies cannot reopen an order',async()=>{
  const x=setup();const cookie=await signIn(x);
  assert.equal((await x.app.fetch(post('/api/access/logout',{},env.APP_ORIGIN,cookie),env)).status,200);
  assert.equal((await x.app.fetch(new Request('https://store.example/api/access/order',{headers:{Cookie:cookie}}),env)).status,401);
});
test('cross-origin mutations and oversized bodies are rejected',async()=>{
  const x=setup();assert.equal((await x.app.fetch(post('/api/access/exchange',{token:'a'.repeat(64)},'https://evil.example'),env)).status,403);
  assert.equal((await x.app.fetch(post('/api/access/request',{email:'x'.repeat(5000)}),env)).status,413);
});
test('private downloads are streamed, ranged, named, and never cacheable',async()=>{
  const x=setup();const cookie=await signIn(x);
  const bindings={...env,PRIVATE_FILES:{head:async()=>({size:4}),get:async(_key:string,options?:{range?:Headers})=>({body:new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode(options?'bc':'abcd'));controller.close();}}),size:4,etag:'abc',...(options?{range:{offset:1,length:2}}:{})})}};
  const response=await x.app.fetch(new Request('https://store.example/api/access/files/file-one',{headers:{Cookie:cookie,Range:'bytes=1-2'}}),bindings);
  assert.equal(response.status,206);assert.equal(await response.text(),'bc');assert.equal(response.headers.get('Content-Range'),'bytes 1-2/4');assert.equal(response.headers.get('Cache-Control'),'private, no-store');assert.match(response.headers.get('Content-Disposition')!,/fixture.mp3/);
  const invalid=await x.app.fetch(new Request('https://store.example/api/access/files/file-one',{headers:{Cookie:cookie,Range:'bytes=99-100'}}),bindings);assert.equal(invalid.status,416);
});
test('mail jobs survive send failure without creating a paid order',async()=>{
  const x=setup();x.db.jobs.push({id:'test-job',attempts:0,payload:await seal(env.ACCESS_SECRET!,{email:'buyer@example.com',url:'https://store.example/access#token=abc'})});
  await processAccessEmails(env,{repository:x.db,sendMail:async()=>{throw new Error('mail outage');}});assert.equal(x.db.failSend,true);assert.equal(x.db.sessions.size,0);
});
test('email payloads are encrypted with unique nonces; tampering fails',async()=>{
  const value={email:'buyer@example.com',token:'not-public'};const a=await seal(env.ACCESS_SECRET!,value),b=await seal(env.ACCESS_SECRET!,value);
  assert.notEqual(a,b);assert.equal(a.includes(value.email),false);assert.deepEqual(await unseal(env.ACCESS_SECRET!,a),value);
  await assert.rejects(unseal('wrong-key',a));assert.equal(safeFilename('x\r\nInjected:yes.mp3').includes('\n'),false);
});
test('no browser request can activate checkout or access the seller workspace',async()=>{
  const x=setup();assert.equal((await x.app.fetch(post('/api/checkout',{paid:true}),env)).status,503);
  for(const path of ['/studio','/studio/catalog'])assert.equal((await x.app.fetch(new Request('https://store.example'+path),env)).status,503);
  const catalog=await x.app.fetch(new Request('https://store.example/api/catalog'),env);assert.deepEqual((await catalog.json()).beats,[]);
});
test('valid JSON with the wrong shape returns a validation error',async()=>{
  const x=setup();
  for(const value of [null,[],42])assert.equal((await x.app.fetch(post('/api/access/request',value),env)).status,400);
  assert.equal((await x.app.fetch(post('/api/access/exchange',null),env)).status,400);
});
test('HEAD verifies entitlement without fetching the file body',async()=>{
  const x=setup();const cookie=await signIn(x);let reads=0;
  const bindings={...env,PRIVATE_FILES:{head:async()=>({size:4}),get:async()=>{reads++;return null;}}};
  const response=await x.app.fetch(new Request('https://store.example/api/access/files/file-one',{method:'HEAD',headers:{Cookie:cookie}}),bindings);
  assert.equal(response.status,200);assert.equal(response.headers.get('Content-Length'),'4');assert.equal(await response.text(),'');assert.equal(reads,0);
});
test('non-HTTPS origins outside loopback cannot enable access',async()=>{
  const x=setup();const response=await x.app.fetch(new Request('http://store.example/api/access/status'),{...env,APP_ORIGIN:'http://store.example'});
  assert.equal((await response.json()).available,false);
});
