import {createClient} from '@supabase/supabase-js';
import {UploadError,validId} from './uploads.ts';
import {initialLicenseSettings} from './license-defaults.ts';
export const licenseIds=['basic','premium','unlimited','custom'] as const;
export const featureLabels=['Featured beat','Beat of the month','Top played','Top seller'];
export interface DashboardRepository{
  data(hash:string):Promise<unknown>;settings():Promise<unknown>;
  saveSetting(hash:string,key:string,value:unknown,version:number):Promise<unknown>;
  createOffer(data:unknown,emailHash:string):Promise<{reference:string}>;
  updateOffer(hash:string,id:string,data:unknown,version:number):Promise<unknown>;
  seen(hash:string,kind:string):Promise<void>;event(id:string,beatId:string,kind:string):Promise<void>;
}
export interface DashboardDependencies{dashboardRepository?:DashboardRepository;}
export function createDashboardRepository(url:string,key:string):DashboardRepository{
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(10000)})}});
  async function rpc<T>(name:string,args:Record<string,unknown>={}):Promise<T>{const {data,error}=await db.rpc(name,args);if(error){
    if(error.code==='42501')throw new UploadError('Seller session expired. Sign in again.',401);
    if(error.message.includes('VERSION_CHANGED'))throw new UploadError('This record changed in another tab. Refresh and review it before saving.',409);
    if(error.message.includes('NOT_PUBLISHED'))throw new UploadError('Choose a currently published beat.',400);
    if(error.message.includes('RATE_LIMIT'))throw new UploadError('Too many requests. Please try again later.',429);
    throw new Error('DASHBOARD_DATABASE_UNAVAILABLE');}return data as T;}
  return{data:hash=>rpc('jt_seller_dashboard',{p_hash:hash}),settings:()=>rpc('jt_store_settings'),
    saveSetting:(hash,key,value,version)=>rpc('jt_save_store_setting',{p_hash:hash,p_key:key,p_value:value,p_version:version}),
    createOffer:(data,emailHash)=>rpc('jt_submit_custom_offer',{p_data:data,p_email_hash:emailHash}),
    updateOffer:(hash,id,data,version)=>rpc('jt_update_custom_offer',{p_hash:hash,p_id:id,p_data:data,p_version:version}),
    seen:(hash,kind)=>rpc('jt_dashboard_seen',{p_hash:hash,p_kind:kind}),
    event:(id,beatId,kind)=>rpc('jt_record_beat_activity',{p_id:id,p_beat:beatId,p_kind:kind})};
}
function text(value:unknown,max:number,required=false){if(typeof value!=='string'||value.length>max||required&&!value.trim())throw new UploadError('Check the required fields and text lengths.');return value.trim();}
function percent(value:unknown,nullable=false){if(nullable&&(value===null||value===''))return null;if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>100)throw new UploadError('Artist shares must be between 0 and 100.');return Math.round(value*100)/100;}
function price(value:unknown){if(typeof value!=='number'||!Number.isFinite(value)||value<0.01||value>1000000)throw new UploadError('Enter a price between $0.01 and $1,000,000.');return Math.round(value*100)/100;}
export function validateLicense(data:any){
  if(!data||!licenseIds.includes(data.id)||!Number.isInteger(data.version)||data.version<1)throw new UploadError('Choose a valid license version.');
  const id=data.id as typeof licenseIds[number],custom=id==='custom';
  const delivery=custom?[]:data.delivery;
  if(!Array.isArray(delivery)||!custom&&(!delivery.length||delivery.length>3)||delivery.some((v:unknown)=>!['mp3','wav','stems'].includes(String(v))))throw new UploadError('Choose the license delivery files.');
  return {id,name:initialLicenseSettings[id].name,price:custom?null:price(data.price),delivery:[...new Set(delivery)],publishing:custom?50:percent(data.publishing),major:custom?90:percent(data.major),indie:custom?70:percent(data.indie),grant:text(data.grant,4000),limits:text(data.limits,4000),terms:text(data.terms,4000),usageDefaultsVersion:1};
}
export function validateFeature(data:any){if(!data||!(data.beatId===''||validId(data.beatId))||!featureLabels.includes(data.label)||!Number.isInteger(data.version)||data.version<1)throw new UploadError('Choose a published beat, label and current settings version.');return {beatId:data.beatId,label:data.label};}
export function validateOffer(data:any,update=false){
  if(!data||(!update&&!validId(data.beatId)))throw new UploadError('Choose a published beat.');
  const values={price:price(data.price),publishing:percent(data.publishing,true),master:percent(data.master,true),terms:text(data.terms,4000)};
  if(update){if(!['Offer received','Counter offered','Terms agreed','Declined'].includes(data.status)||!Number.isInteger(data.revision)||data.revision<1)throw new UploadError('Choose a valid offer status and revision.');return {...values,status:data.status};}
  const email=text(data.email,254,true).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new UploadError('Enter a valid email address.');
  return {...values,beatId:data.beatId,artist:text(data.artist,100,true),email};
}
