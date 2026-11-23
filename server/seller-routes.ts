import type { Hono, Context } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import type { Bindings } from './app.ts';
import { createSellerAuth, createSellerRepository, SellerAuthError, sellerEmail, type SellerAuth, type SellerAuthState, type SellerRepository, type SellerTokens } from './seller-auth.ts';
import { registerUploadRoutes, type UploadDependencies } from './upload-routes.ts';
import { hash, randomToken, seal, unseal, validToken } from './security.ts';
export interface SellerDependencies extends UploadDependencies { sellerAuth?:SellerAuth; sellerRepository?:SellerRepository; }
type C=Context<{Bindings:Bindings}>;
function isReady(env:Bindings,d:SellerDependencies){return Boolean(env.SELLER_SESSION_SECRET&&env.SELLER_SESSION_SECRET.length>=32&&(d.sellerAuth||env.SUPABASE_URL&&env.SUPABASE_PUBLISHABLE_KEY)&&(d.sellerRepository||env.SUPABASE_URL&&env.SUPABASE_SECRET_KEY));}
function services(env:Bindings,d:SellerDependencies){return {auth:d.sellerAuth||createSellerAuth(env.SUPABASE_URL!,env.SUPABASE_PUBLISHABLE_KEY!),repo:d.sellerRepository||createSellerRepository(env.SUPABASE_URL!,env.SUPABASE_SECRET_KEY!)};}
function cookie(env:Bindings){return env.APP_ORIGIN.startsWith('https:')?'__Host-jt-seller':'jt-seller-local';}
function clear(c:C){deleteCookie(c,cookie(c.env),{path:'/',secure:c.env.APP_ORIGIN.startsWith('https:')});}
function putCookie(c:C,token:string,mfa:boolean){setCookie(c,cookie(c.env),token,{path:'/',httpOnly:true,secure:c.env.APP_ORIGIN.startsWith('https:'),sameSite:'Lax',maxAge:mfa?28800:600});}
function owner(s:SellerAuthState){return s.identity.email.toLowerCase()===sellerEmail&&s.identity.confirmed;}
function stage(s:SellerAuthState,mfa:boolean){return mfa&&s.identity.aal==='aal2'?'ready':s.factors.some(f=>f.verified)?'mfa':'enroll';}
export function registerSellerRoutes(app:Hono<{Bindings:Bindings}>,d:SellerDependencies){
  async function useSession(c:C,requireMfa:boolean,action:(s:SellerAuthState,tools:ReturnType<typeof services>,tokenHash:string,finish:()=>void,ready:boolean,release:()=>Promise<void>)=>Promise<Response>){
    const {repo,auth}=services(c.env,d);
    const token=getCookie(c,cookie(c.env));
    if(!validToken(token))return c.json({error:'Sign in to your seller workspace.'},401);
    const tokenHash=await hash(token),lease=randomToken();
    const row=await repo.acquire(tokenHash,lease);
    if(!row)return c.json({error:'Your session expired. Sign in again.'},401);
    if('busy' in row){c.header('Retry-After','1');return c.json({error:'Another seller request is finishing. Please retry.'},409);}
    let s:SellerAuthState;
    try{
      const tokens=await unseal(c.env.SELLER_SESSION_SECRET!,row.payload) as SellerTokens;
      s=await auth.inspect(tokens);
      if(!owner(s)||s.identity.id!==row.userId||s.identity.authSessionId!==row.authSessionId)throw new SellerAuthError('Session no longer authorized.');
    }catch{
      await repo.revoke(tokenHash);clear(c);return c.json({error:'Sign in again to continue.'},401);
    }
    let finished=false;
    async function release(){if(!finished){if(!await repo.save(tokenHash,lease,await seal(c.env.SELLER_SESSION_SECRET!,s.tokens))){await repo.revoke(tokenHash);throw new Error('SELLER_SESSION_SAVE_FAILED');}finished=true;}}
    try{
      if(requireMfa&&(!row.mfa||s.identity.aal!=='aal2'||!s.factors.some(f=>f.verified)))return c.json({error:'Complete authenticator verification first.'},403);
      return await action(s,{repo,auth},tokenHash,()=>{finished=true;},row.mfa&&s.identity.aal==='aal2'&&s.factors.some(f=>f.verified),release);
    }catch(error){
      if(error instanceof SellerAuthError)return c.json({error:error.message},400);
      throw error;
    }finally{
      await release();
    }
  }
  app.use('/api/seller/*',async(c,next)=>{
    c.header('Cache-Control','private, no-store');c.header('Vary','Cookie');
    if(!isReady(c.env,d))return c.json({error:'Seller sign-in is awaiting secure server configuration.',available:false},503);
    await next();
  });
  app.get('/api/seller/session',async c=>{
    if(!getCookie(c,cookie(c.env)))return c.json({available:true,authenticated:false,stage:'password'});
    return useSession(c,false,async(s,_tools,_hash,_finish,ready)=>c.json({available:true,authenticated:ready,stage:stage(s,ready),email:sellerEmail}));
  });
  app.post('/api/seller/login',async c=>{
    const password=(await c.req.json())?.password;
    if(typeof password!=='string'||password.length<1||password.length>256)return c.json({error:'Enter your seller password.'},400);
    const {auth,repo}=services(c.env,d);
    if(!await repo.rate('seller-login',20,900))return c.json({error:'Too many sign-in attempts. Try again in 15 minutes.'},429);
    let s:SellerAuthState;
    try{s=await auth.login(password);}catch{return c.json({error:'Sign-in failed. Check your password.'},401);}
    if(!owner(s)){await auth.logout(s.tokens).catch(()=>{});return c.json({error:'Sign-in failed.'},401);}
    const token=randomToken();
    // Password login never opens the dashboard, even if a provider returns an elevated claim.
    if(!await repo.create(s.identity.id,s.identity.authSessionId,await hash(token),await seal(c.env.SELLER_SESSION_SECRET!,s.tokens),false)){
      await auth.logout(s.tokens).catch(()=>{});return c.json({error:'Seller account is not authorized.'},403);
    }
    putCookie(c,token,false);
    return c.json({stage:stage(s,false),email:sellerEmail});
  });
  app.post('/api/seller/enroll',c=>useSession(c,false,async(s,{auth,repo},tokenHash)=>{
    if(s.factors.some(f=>f.verified))return c.json({error:'Use your existing authenticator code.'},409);
    if(!await repo.rate('enroll:'+tokenHash,3,600))return c.json({error:'Too many setup attempts. Sign in again later.'},429);
    const result=await auth.enroll(s.tokens);s.tokens={...result.state.tokens,factorId:result.factorId};
    return c.json({stage:'verify-enrollment',secret:result.secret,uri:result.uri});
  }));
  app.post('/api/seller/verify',c=>useSession(c,false,async(s,{auth,repo},tokenHash,finish)=>{
    const code=(await c.req.json())?.code;
    if(typeof code!=='string'||!/^\d{6}$/.test(code))return c.json({error:'Enter the six-digit authenticator code.'},400);
    if(!await repo.rate('mfa:'+tokenHash,10,300))return c.json({error:'Too many code attempts. Wait five minutes.'},429);
    const factor=s.factors.find(f=>f.verified)?.id||s.tokens.factorId;
    if(!factor)return c.json({error:'Set up your authenticator first.'},409);
    const verified=await auth.verify(s.tokens,factor,code);
    if(!owner(verified)||verified.identity.id!==s.identity.id||verified.identity.aal!=='aal2'||!verified.factors.some(f=>f.verified))throw new SellerAuthError('Authenticator verification failed.');
    const token=randomToken();
    if(!await repo.create(verified.identity.id,verified.identity.authSessionId,await hash(token),await seal(c.env.SELLER_SESSION_SECRET!,verified.tokens),true,tokenHash))throw new Error('SELLER_SESSION_ROTATION_FAILED');
    finish();putCookie(c,token,true);return c.json({stage:'ready',email:sellerEmail});
  }));
  registerUploadRoutes(app,(c,action)=>useSession(c,true,async(_s,_tools,hash,_finish,_ready,release)=>{await release();return action(hash);}),d);
  app.get('/api/seller/overview',c=>useSession(c,true,async(_s,{repo})=>c.json(await repo.overview())));
  app.post('/api/seller/logout',async c=>{
    const token=getCookie(c,cookie(c.env));
    clear(c);
    if(!validToken(token))return c.json({authenticated:false});
    const response=await useSession(c,false,async(s,{auth,repo},tokenHash,finish)=>{
      await repo.revoke(tokenHash);finish();
      await auth.logout(s.tokens).catch(()=>console.error(JSON.stringify({event:'seller_upstream_signout_failed'})));
      return c.json({authenticated:false});
    });
    return response;
  });
}
