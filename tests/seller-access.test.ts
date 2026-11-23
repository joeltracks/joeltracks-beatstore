import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp, type Bindings } from '../server/app.ts';
import { sellerEmail, SellerAuthError, type SellerAuth, type SellerAuthState, type SellerRepository, type SellerSession } from '../server/seller-auth.ts';
import { hash, unseal } from '../server/security.ts';
const env:Bindings={APP_ORIGIN:'https://store.example',SELLER_SESSION_SECRET:'test-only-seller-encryption-key-'.repeat(2)};
class Auth implements SellerAuth {
  verified=false;confirmed=true;email=sellerEmail;revoked=false;aal='aal1';elevatedLogin=false;
  state():SellerAuthState{return {tokens:{accessToken:'private-access-token',refreshToken:'private-refresh-token'},identity:{id:'owner',email:this.email,confirmed:this.confirmed,aal:this.aal,authSessionId:'upstream-session'},factors:this.verified?[{id:'factor-one',verified:true}]:[]};}
  async login(password:string){if(password!=='correct-password')throw new SellerAuthError('Bad password');const s=this.state();if(this.elevatedLogin)s.identity.aal='aal2';return s;}
  async inspect(tokens:SellerAuthState['tokens']){if(this.revoked)throw new SellerAuthError('Revoked');return {...this.state(),tokens};}
  async enroll(tokens:SellerAuthState['tokens']){return {state:{...this.state(),tokens},factorId:'factor-one',secret:'TESTONLYKEY',uri:'otpauth://totp/test?secret=TESTONLYKEY'};}
  async verify(tokens:SellerAuthState['tokens'],factorId:string,code:string){if(code!=='012345'||factorId!=='factor-one')throw new SellerAuthError('Invalid code');this.verified=true;this.aal='aal2';return {...this.state(),tokens};}
  async logout(){this.revoked=true;}
}
class Store implements SellerRepository {
  sessions=new Map<string,SellerSession&{lease?:string}>(); rates=new Map<string,number>();ownerEnabled=true;busy=false;overviewCalls=0;
  async rate(key:string,limit:number){const count=(this.rates.get(key)||0)+1;this.rates.set(key,count);return count<=limit;}
  async create(userId:string,authSessionId:string,key:string,payload:string,mfa:boolean,previous?:string){if(!this.ownerEnabled||userId!=='owner')return false;this.sessions.set(key,{userId,authSessionId,payload,mfa});if(previous)this.sessions.delete(previous);return true;}
  async acquire(key:string,lease:string){if(!this.ownerEnabled)return null;if(this.busy)return {busy:true as const};const row=this.sessions.get(key);if(row)row.lease=lease;return row||null;}
  async save(key:string,lease:string,payload:string){const row=this.sessions.get(key);if(!row||row.lease!==lease)return false;row.payload=payload;row.lease=undefined;return true;}
  async revoke(key:string){this.sessions.delete(key);}
  async overview(){this.overviewCalls++;return {paidOrders:0,revenueCents:0,pendingOrders:0,recentOrders:[]};}
}
function fixture(){const auth=new Auth(),db=new Store();return {auth,db,app:createApp({sellerAuth:auth,sellerRepository:db})};}
function request(path:string,body?:unknown,cookie='',origin=env.APP_ORIGIN){return new Request(env.APP_ORIGIN+'/api/seller/'+path,{method:body===undefined?'GET':'POST',headers:{Cookie:cookie,...(body===undefined?{}:{Origin:origin,'Content-Type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body)});}
const cookieOf=(r:Response)=>r.headers.get('set-cookie')!.split(';')[0];
async function login(f:ReturnType<typeof fixture>){const response=await f.app.fetch(request('login',{password:'correct-password'}),env);assert.equal(response.status,200);return cookieOf(response);}
async function ready(f:ReturnType<typeof fixture>){f.auth.verified=true;const pre=await login(f);const response=await f.app.fetch(request('verify',{code:'012345'},pre),env);assert.equal(response.status,200);return cookieOf(response);}

test('unconfigured sign-in is closed and studio URL leads to the login UI',async()=>{
  const app=createApp();assert.equal((await app.fetch(request('login',{password:'anything'}),{APP_ORIGIN:env.APP_ORIGIN})).status,503);
  const page=await app.fetch(new Request(env.APP_ORIGIN+'/studio'),{APP_ORIGIN:env.APP_ORIGIN});assert.equal(page.status,303);assert.equal(page.headers.get('location'),'/#studio');
});
test('anonymous and forged cookies cannot read seller data',async()=>{
  const f=fixture();for(const cookie of ['', '__Host-jt-seller=forged', '__Host-jt-seller='+'a'.repeat(64)])assert.equal((await f.app.fetch(request('overview',undefined,cookie),env)).status,401);
  assert.equal(f.db.overviewCalls,0);
});
test('password alone cannot open private data; credentials are encrypted and never returned',async()=>{
  const f=fixture();const r=await f.app.fetch(request('login',{password:'correct-password'}),env);const cookie=cookieOf(r);
  assert.match(r.headers.get('set-cookie')!,/HttpOnly/);assert.match(r.headers.get('set-cookie')!,/Secure/);assert.match(r.headers.get('set-cookie')!,/SameSite=Lax/);
  assert.match(r.headers.get('cache-control')!,/no-store/);assert.doesNotMatch(await r.text(),/private-access|private-refresh|correct-password/);
  const row=[...f.db.sessions.values()][0];assert(!row.payload.includes('private-access'));assert.equal((await unseal(env.SELLER_SESSION_SECRET!,row.payload)).refreshToken,'private-refresh-token');
  assert.equal((await f.app.fetch(request('overview',undefined,cookie),env)).status,403);assert.equal(f.db.overviewCalls,0);
});
test('unapproved and unconfirmed identities are denied even with a valid provider login',async()=>{
  for(const change of [(f:ReturnType<typeof fixture>)=>{f.auth.email='other@example.com';},(f:ReturnType<typeof fixture>)=>{f.auth.confirmed=false;},(f:ReturnType<typeof fixture>)=>{f.db.ownerEnabled=false;}]){
    const f=fixture();change(f);assert.notEqual((await f.app.fetch(request('login',{password:'correct-password'}),env)).status,200);assert.equal(f.db.sessions.size,0);
  }
});
test('first login can enroll TOTP and only a valid code rotates into dashboard access',async()=>{
  const f=fixture(),pre=await login(f);const setup=await f.app.fetch(request('enroll',{},pre),env);assert.equal(setup.status,200);assert.equal((await setup.json()).secret,'TESTONLYKEY');
  assert.equal((await f.app.fetch(request('verify',{code:'999999'},pre),env)).status,400);
  const checked=await f.app.fetch(request('verify',{code:'012345'},pre),env);assert.equal(checked.status,200);const session=cookieOf(checked);assert.notEqual(session,pre);
  assert.equal((await f.app.fetch(request('overview',undefined,pre),env)).status,401);
  const view=await f.app.fetch(request('overview',undefined,session),env);assert.equal(view.status,200);assert.deepEqual(await view.json(),{paidOrders:0,revenueCents:0,pendingOrders:0,recentOrders:[]});
});
test('existing authenticator cannot be replaced at the password-only step',async()=>{
  const f=fixture();f.auth.verified=true;const cookie=await login(f);assert.equal((await f.app.fetch(request('enroll',{},cookie),env)).status,409);
});
test('provider elevated claims alone do not promote a password-only application session',async()=>{
  const f=fixture();f.auth.elevatedLogin=true;f.auth.aal='aal2';f.auth.verified=true;const cookie=await login(f);
  const state=await f.app.fetch(request('session',undefined,cookie),env);assert.equal((await state.json()).stage,'mfa');assert.equal((await f.app.fetch(request('overview',undefined,cookie),env)).status,403);
});
test('revocation, expiry and changed identity stop private access immediately',async()=>{
  for(const revoke of [(f:ReturnType<typeof fixture>)=>{f.auth.revoked=true;},(f:ReturnType<typeof fixture>)=>{f.db.sessions.clear();},(f:ReturnType<typeof fixture>)=>{f.db.ownerEnabled=false;},(f:ReturnType<typeof fixture>)=>{f.auth.email='other@example.com';}]){
    const f=fixture(),cookie=await ready(f);revoke(f);assert.equal((await f.app.fetch(request('overview',undefined,cookie),env)).status,401);assert.equal(f.db.overviewCalls,0);
  }
});
test('MFA removal or assurance downgrade blocks data even with a former full session',async()=>{
  for(const downgrade of [(f:ReturnType<typeof fixture>)=>{f.auth.verified=false;},(f:ReturnType<typeof fixture>)=>{f.auth.aal='aal1';}]){const f=fixture(),cookie=await ready(f);downgrade(f);assert.equal((await f.app.fetch(request('overview',undefined,cookie),env)).status,403);}
});
test('CSRF, oversized bodies and password guessing are rejected',async()=>{
  const f=fixture();assert.equal((await f.app.fetch(request('login',{password:'correct-password'},'','https://evil.example'),env)).status,403);
  assert.equal((await f.app.fetch(request('login',{password:'x'.repeat(5000)}),env)).status,413);
  for(let i=0;i<20;i++)assert.equal((await f.app.fetch(request('login',{password:'bad'}),env)).status,401);
  assert.equal((await f.app.fetch(request('login',{password:'correct-password'}),env)).status,429);
});
test('MFA guessing is rate-limited and stale cookie does not survive logout',async()=>{
  const f=fixture();f.auth.verified=true;const pre=await login(f);
  for(let i=0;i<10;i++)assert.equal((await f.app.fetch(request('verify',{code:'999999'},pre),env)).status,400);
  assert.equal((await f.app.fetch(request('verify',{code:'012345'},pre),env)).status,429);
  f.db.rates.clear();const full=await f.app.fetch(request('verify',{code:'012345'},pre),env),cookie=cookieOf(full);
  const logout=await f.app.fetch(request('logout',{},cookie),env);assert.equal(logout.status,200);assert.match(logout.headers.get('set-cookie')!,/Max-Age=0/);
  assert.equal((await f.app.fetch(request('overview',undefined,cookie),env)).status,401);
});
test('concurrent refresh lease returns a retryable response without changing the cookie',async()=>{
  const f=fixture(),cookie=await ready(f);f.db.busy=true;const r=await f.app.fetch(request('overview',undefined,cookie),env);assert.equal(r.status,409);assert.equal(r.headers.get('retry-after'),'1');assert.equal(r.headers.get('set-cookie'),null);
});


test('malformed JSON shapes cannot trigger login or MFA work',async()=>{
  const f=fixture(),cookie=await login(f);
  for(const value of [null,[],42]){
    assert.equal((await f.app.fetch(request('login',value),env)).status,400);
    assert.equal((await f.app.fetch(request('verify',value,cookie),env)).status,400);
  }
});
