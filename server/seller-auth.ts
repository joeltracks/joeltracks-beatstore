import { createClient } from '@supabase/supabase-js';
export const sellerEmail='joeltracks2000@gmail.com';
export interface SellerTokens { accessToken:string; refreshToken:string; factorId?:string; }
export interface SellerIdentity { id:string; email:string; confirmed:boolean; aal:string; authSessionId:string; }
export interface SellerAuthState { tokens:SellerTokens; identity:SellerIdentity; factors:{id:string;verified:boolean}[]; }
export interface SellerAuth {
  login(password:string):Promise<SellerAuthState>;
  inspect(tokens:SellerTokens):Promise<SellerAuthState>;
  enroll(tokens:SellerTokens):Promise<{state:SellerAuthState;factorId:string;secret:string;uri:string}>;
  verify(tokens:SellerTokens,factorId:string,code:string):Promise<SellerAuthState>;
  logout(tokens:SellerTokens):Promise<void>;
}
export class SellerAuthError extends Error {}
export function createSellerAuth(url:string,key:string):SellerAuth {
  const client=()=>createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(10000)})}});
  async function restored(tokens:SellerTokens) {
    const api=client();
    const {data,error}=await api.auth.setSession({access_token:tokens.accessToken,refresh_token:tokens.refreshToken});
    if(error||!data.session)throw new SellerAuthError('Sign in again.');
    return {api,session:data.session};
  }
  async function state(api:ReturnType<typeof client>,session:{access_token:string;refresh_token:string},factorId?:string):Promise<SellerAuthState> {
    // Verify with Auth on every request; do not authorize from cached user metadata.
    const {data,error}=await api.auth.getUser(session.access_token);
    if(error||!data.user)throw new SellerAuthError('Sign in again.');
    const user=data.user;
    let claims;
    try{claims=JSON.parse(atob(session.access_token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));}catch{throw new SellerAuthError('Invalid session.');}
    if(claims.sub!==user.id||claims.role!=='authenticated'||!Number.isFinite(claims.exp)||claims.exp*1000<=Date.now()||
       typeof claims.session_id!=='string'||!/^[a-f0-9-]{36}$/i.test(claims.session_id))throw new SellerAuthError('Invalid session.');
    return {tokens:{accessToken:session.access_token,refreshToken:session.refresh_token,...(factorId?{factorId}:{})},
      identity:{id:user.id,email:user.email||'',confirmed:Boolean(user.email_confirmed_at),aal:claims.aal,authSessionId:claims.session_id},
      factors:(user.factors||[]).filter(f=>f.factor_type==='totp').map(f=>({id:f.id,verified:f.status==='verified'}))};
  }
  return {
    async login(password){const api=client();const {data,error}=await api.auth.signInWithPassword({email:sellerEmail,password});if(error||!data.session)throw new SellerAuthError('Sign-in failed. Check your password.');return state(api,data.session);},
    async inspect(tokens){const {api,session}=await restored(tokens);return state(api,session,tokens.factorId);},
    async enroll(tokens){
      const {api,session}=await restored(tokens);const current=await state(api,session,tokens.factorId);
      if(current.factors.some(f=>f.verified))throw new SellerAuthError('Use your existing authenticator.');
      for(const factor of current.factors){const {error}=await api.auth.mfa.unenroll({factorId:factor.id});if(error)throw new SellerAuthError('Authenticator setup failed.');}
      const {data,error}=await api.auth.mfa.enroll({factorType:'totp',friendlyName:'Joel Tracks seller',issuer:'Joel Tracks'});
      if(error||data.type!=='totp')throw new SellerAuthError('Authenticator setup failed.');
      return {state:current,factorId:data.id,secret:data.totp.secret,uri:data.totp.uri};
    },
    async verify(tokens,factorId,code){
      const {api}=await restored(tokens);
      const {data,error}=await api.auth.mfa.challengeAndVerify({factorId,code});
      if(error||!data)throw new SellerAuthError('The code was not accepted. Try the current code.');
      return state(api,data);
    },
    async logout(tokens){const {api}=await restored(tokens);const {error}=await api.auth.signOut({scope:'local'});if(error)throw new SellerAuthError('Upstream sign-out failed.');}
  };
}
export interface SellerSession { payload:string; userId:string; authSessionId:string; mfa:boolean; }
export interface SellerOverview {paidOrders:number;revenueCents:number;pendingOrders:number;recentOrders:{reference:string;status:string;currency:string;totalCents:number;createdAt:string}[];}
export interface SellerRepository {
  rate(key:string,limit:number,seconds:number):Promise<boolean>;
  create(userId:string,sessionId:string,tokenHash:string,payload:string,mfa:boolean,previous?:string):Promise<boolean>;
  acquire(tokenHash:string,lease:string):Promise<SellerSession|{busy:true}|null>;
  save(tokenHash:string,lease:string,payload:string):Promise<boolean>;
  revoke(tokenHash:string):Promise<void>;
  overview():Promise<SellerOverview>;
}
export function createSellerRepository(url:string,key:string):SellerRepository {
  const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(10000)})}});
  async function rpc<T>(name:string,params:Record<string,unknown>={}):Promise<T>{const {data,error}=await client.rpc(name,params);if(error)throw new Error('SELLER_DATABASE_UNAVAILABLE');return data as T;}
  return {
    rate:(key,limit,seconds)=>rpc('jt_seller_rate_limit',{p_key:key,p_limit:limit,p_seconds:seconds}),
    create:(userId,sessionId,tokenHash,payload,mfa,previous)=>rpc('jt_create_seller_session',{p_user_id:userId,p_auth_session_id:sessionId,p_hash:tokenHash,p_payload:payload,p_mfa:mfa,p_previous:previous||null}),
    acquire:(tokenHash,lease)=>rpc('jt_acquire_seller_session',{p_hash:tokenHash,p_lease:lease}),
    save:(tokenHash,lease,payload)=>rpc('jt_save_seller_session',{p_hash:tokenHash,p_lease:lease,p_payload:payload}),
    revoke:tokenHash=>rpc('jt_revoke_seller_session',{p_hash:tokenHash}),
    overview:()=>rpc('jt_seller_overview')
  };
}
