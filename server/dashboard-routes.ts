import type {Hono} from 'hono';
import type {Bindings} from './app.ts';
import type {SellerGuard} from './upload-routes.ts';
import {createDashboardRepository,validateFeature,validateLicense,validateOffer,type DashboardDependencies} from './dashboard.ts';
import {validId,UploadError} from './uploads.ts';
import {keyedHash} from './security.ts';
export function dashboardConfigured(env:Bindings,d:DashboardDependencies){return Boolean(d.dashboardRepository||env.SUPABASE_URL&&env.SUPABASE_SECRET_KEY);}
export function dashboardRepository(env:Bindings,d:DashboardDependencies){return d.dashboardRepository||createDashboardRepository(env.SUPABASE_URL!,env.SUPABASE_SECRET_KEY!);}
async function handled(c:any,work:()=>Promise<unknown>){try{return c.json(await work());}catch(e){if(e instanceof UploadError)return c.json({error:e.message},e.status);throw e;}}
export function registerDashboardRoutes(app:Hono<{Bindings:Bindings}>,guard:SellerGuard,d:DashboardDependencies){
 app.get('/api/seller/dashboard',c=>guard(c,async hash=>{
  if(!dashboardConfigured(c.env,d))return c.json({error:'Seller management is not configured.'},503);
  return handled(c,()=>dashboardRepository(c.env,d).data(hash));
 }));
 app.post('/api/seller/settings/:kind',c=>guard(c,async hash=>handled(c,async()=>{
  if(!dashboardConfigured(c.env,d))throw new UploadError('Settings are unavailable.',503);
  const data=await c.req.json(),kind=c.req.param('kind');
  const value=kind==='feature'?validateFeature(data):kind==='license'?validateLicense(data):null;
  if(!value)throw new UploadError('Settings not found.',404);
  return dashboardRepository(c.env,d).saveSetting(hash,kind==='feature'?'feature':'license.'+data.id,value,data.version);
 })));
 app.post('/api/seller/offers/:id',c=>guard(c,async hash=>handled(c,async()=>{
  const id=c.req.param('id'),data=await c.req.json();if(!validId(id))throw new UploadError('Offer not found.',404);
  return dashboardRepository(c.env,d).updateOffer(hash,id,validateOffer(data,true),data.revision);
 })));
 app.post('/api/seller/seen',c=>guard(c,async hash=>handled(c,async()=>{
  const kind=(await c.req.json())?.kind;if(!['offers','payments'].includes(kind))throw new UploadError('Unknown notification section.');
  await dashboardRepository(c.env,d).seen(hash,kind);return {saved:true};
 })));
}
export function registerPublicManagementRoutes(app:Hono<{Bindings:Bindings}>,d:DashboardDependencies){
 app.post('/api/offers',c=>handled(c,async()=>{
  if(!dashboardConfigured(c.env,d)||!c.env.SELLER_SESSION_SECRET&&!d.dashboardRepository)throw new UploadError('Custom offers are temporarily unavailable. Email JT instead.',503);
  const data=validateOffer(await c.req.json());
  return dashboardRepository(c.env,d).createOffer(data,await keyedHash(c.env.SELLER_SESSION_SECRET||'isolated-test-only','email' in data?data.email:''));
 }));
 app.post('/api/activity',async c=>{
  const data=await c.req.json();if(!data||!validId(data.id)||!validId(data.beatId)||!['play','favorite','cart'].includes(data.kind))return c.json({error:'Invalid event.'},400);
  if(dashboardConfigured(c.env,d))await dashboardRepository(c.env,d).event(data.id,data.beatId,data.kind);
  return c.body(null,204);
 });
}
