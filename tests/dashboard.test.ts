import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp,type Bindings} from '../server/app.ts';
import {hash,seal} from '../server/security.ts';
import type {DashboardRepository} from '../server/dashboard.ts';
import {validateLicense,validateOffer} from '../server/dashboard.ts';
import {initialLicenseSettings} from '../server/license-defaults.ts';
import type {SellerAuth,SellerRepository} from '../server/seller-auth.ts';
const id='10000000-0000-4000-8000-000000000001';
const env:Bindings={APP_ORIGIN:'https://store.example',SELLER_SESSION_SECRET:'dashboard-test-secret'.repeat(4)};
const token='d'.repeat(64),cookie='__Host-jt-seller='+token,ownerHash=await hash(token),payload=await seal(env.SELLER_SESSION_SECRET!,{accessToken:'test',refreshToken:'test'});
function fixture(){
 let mfa=true;const writes:unknown[][]=[];
 const auth:SellerAuth={async login(){throw Error('unused');},async inspect(tokens){return {tokens,identity:{id:'owner',email:'joeltracks2000@gmail.com',confirmed:true,aal:mfa?'aal2':'aal1',authSessionId:'session'},factors:[{id:'factor',verified:true}]};},async enroll(){throw Error('unused');},async verify(){throw Error('unused');},async logout(){}};
 const sessions:SellerRepository={async rate(){return true;},async create(){return true;},async acquire(h){return h===ownerHash?{payload,userId:'owner',authSessionId:'session',mfa}:null;},async save(){return true;},async revoke(){},async overview(){return {paidOrders:0,revenueCents:0,pendingOrders:0,recentOrders:[]};}};
 const db:DashboardRepository={async data(){return {offers:[{email:'private@example.test'}]};},async settings(){return {licenses:initialLicenseSettings,feature:{beatId:'',label:'Featured beat',version:1}};},async saveSetting(...args){writes.push(args);return {version:2};},async createOffer(...args){writes.push(args);return {reference:'JT-OFFER-TEST'};},async updateOffer(...args){writes.push(args);return {revision:2};},async seen(...args){writes.push(args);},async event(...args){writes.push(args);}};
 return {app:createApp({sellerAuth:auth,sellerRepository:sessions,dashboardRepository:db}),writes,setMfa:(v:boolean)=>mfa=v};
}
const request=(path:string,body?:unknown,session=cookie,origin=env.APP_ORIGIN)=>new Request(env.APP_ORIGIN+path,{method:body===undefined?'GET':'POST',headers:{Cookie:session,...(body===undefined?{}:{Origin:origin,'Content-Type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body)});
test('restored management requires owner MFA and same-origin writes',async()=>{
 const f=fixture();assert.equal((await f.app.fetch(request('/api/seller/dashboard',undefined,''),env)).status,401);
 f.setMfa(false);assert.equal((await f.app.fetch(request('/api/seller/dashboard'),env)).status,403);f.setMfa(true);
 assert.equal((await f.app.fetch(request('/api/seller/dashboard'),env)).status,200);
 for(const path of ['/api/seller/settings/feature','/api/seller/seen','/api/seller/offers/'+id]){
  assert.equal((await f.app.fetch(request(path,{},''),env)).status,401);
  assert.equal((await f.app.fetch(request(path,{},cookie,'https://evil.example'),env)).status,403);
 }assert.equal(f.writes.length,0);
});
test('long license text can save through protected settings while other endpoints retain small limits',async()=>{
 const f=fixture(),body={...initialLicenseSettings.basic,version:1,terms:'Approved terms '.repeat(260)};
 const response=await f.app.fetch(request('/api/seller/settings/license',body),env);assert.equal(response.status,200);assert.equal((await response.json()).version,2);
 assert.equal(f.writes[0][0],ownerHash);assert.equal(f.writes[0][1],'license.basic');
 assert.equal((await f.app.fetch(request('/api/seller/seen',{kind:'offers',extra:'x'.repeat(5000)}),env)).status,413);
 assert.equal((await f.app.fetch(request('/api/seller/settings/license',{...body,price:-1}),env)).status,400);
 assert.equal((await f.app.fetch(request('/api/seller/settings/license',{...body,version:0}),env)).status,400);
});
test('public offers return a reference without exposing inbox records or creating payments',async()=>{
 const f=fixture(),offer={beatId:id,artist:'Artist',email:'ARTIST@example.test',price:200,publishing:null,master:80,terms:'Discuss release plans'};
 const response=await f.app.fetch(request('/api/offers',offer,''),env);assert.equal(response.status,200);assert.deepEqual(await response.json(),{reference:'JT-OFFER-TEST'});
 assert.equal((f.writes[0][0] as {email:string}).email,'artist@example.test');assert.notEqual(f.writes[0][1],offer.email);
 assert.equal((await f.app.fetch(request('/api/offers',{...offer,master:101},''),env)).status,400);
 assert.equal((await f.app.fetch(request('/api/checkout',{},''),env)).status,503);
 assert.equal((await f.app.fetch(request('/api/seller/seen',{kind:'offers'}),env)).status,200);
});
test('anonymous action recording accepts only typed UUID events and no settings mutations',async()=>{
 const f=fixture();assert.equal((await f.app.fetch(request('/api/activity',{id,beatId:id,kind:'play'},''),env)).status,204);
 assert.deepEqual(f.writes[0],[id,id,'play']);
 assert.equal((await f.app.fetch(request('/api/activity',{id,beatId:id,kind:'sale'},''),env)).status,400);
 assert.equal((await f.app.fetch(request('/api/activity',{id:'bad',beatId:id,kind:'play'},''),env)).status,400);
});
test('license validation retains approved file packages and rejects invalid shares or delivery',()=>{
 for(const tier of Object.values(initialLicenseSettings)){
  const value=validateLicense({...tier,version:1});assert.equal(value.grant,tier.grant);assert.deepEqual(value.delivery,tier.delivery);
 }
 assert.throws(()=>validateLicense({...initialLicenseSettings.basic,version:1,publishing:101}));
 assert.throws(()=>validateLicense({...initialLicenseSettings.basic,version:1,delivery:[]}));
 assert.throws(()=>validateOffer({beatId:id,artist:'A',email:'bad',price:50,publishing:null,master:null,terms:''}));
});
