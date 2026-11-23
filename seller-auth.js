// Seller credentials stay in server-side sessions; this script receives only UI state.
let sellerView={stage:'loading'};
let sellerLoading=false;
let sellerOverview=null;
let sellerError='';
let sellerSetupKey='';
let sellerChecked=false;
let sellerLoadEpoch=0;
let sellerLastCheck=0;
function sellerMessage(text){const status=document.getElementById('seller-status');if(status)status.textContent=text;}
async function sellerAPI(path,data,retry=0){
  const response=await fetch('/api/seller/'+path,{method:data===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',headers:data===undefined?{}:{'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});
  if(response.status===409&&response.headers.get('Retry-After')==='1'&&retry<2){await new Promise(resolve=>setTimeout(resolve,1000));return sellerAPI(path,data,retry+1);}
  let result;try{result=await response.json();}catch{throw new Error('Seller sign-in is temporarily unavailable.');}
  if(!response.ok){const error=new Error(result.error||'Please try again.');error.status=response.status;throw error;}
  return result;
}
function sellerAuthPanel(){
  const stage=sellerView.stage;
  if(stage==='loading')return '<section class="access-panel"><p role="status">Checking seller access…</p></section>';
  if(stage==='unavailable')return '<section class="access-panel"><h2>Sign-in setup is being completed</h2><p>'+escapeHTML(sellerError||'Secure server configuration is required before seller sign-in opens.')+'</p><button class="btn secondary" data-seller-action="retry">Check again</button></section>';
  const password=stage==='password';
  const enroll=stage==='enroll';
  const verify=stage==='verify-enrollment'||stage==='mfa';
  return '<section class="access-panel seller-signin"><div class="access-symbol">'+icon('lock',26)+'</div><h2>'+(password?'Sign in to your workspace':enroll?'Secure your workspace':'Verify your authenticator')+'</h2><p>'+(password?'Private access for Joel Tracks. Use your seller password, then your authenticator code.':enroll?'Add Joel Tracks to your authenticator app. You’ll need its six-digit code each time you sign in.':'Enter the current six-digit code from your authenticator app.')+'</p>'+(password?'<form id="seller-login-form"><label class="field">Seller email<input type="email" name="email" value="joeltracks2000@gmail.com" autocomplete="username" readonly></label><label class="field">Password<input type="password" name="password" required maxlength="256" autocomplete="current-password"></label><button class="btn" type="submit">Continue '+icon('arrow',18)+'</button></form><p class="access-help">This workspace has one owner account. There is no public seller registration. For password recovery, use your Supabase project’s user-management tools.</p>':enroll?'<button class="btn" data-seller-action="enroll">Set up authenticator '+icon('arrow',18)+'</button>':'')+(stage==='verify-enrollment'?'<div class="seller-setup"><p>In your authenticator, choose <strong>Enter a setup key</strong>. Use account name <strong>Joel Tracks</strong>, choose <strong>Time based</strong>, then enter:</p><code class="seller-setup-key">'+escapeHTML(sellerSetupKey)+'</code><p class="access-help">Keep this key private. Save it securely before continuing.</p></div>':'')+(verify?'<form id="seller-mfa-form"><label class="field">Authenticator code<input name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" minlength="6" maxlength="6" required aria-describedby="seller-code-help"></label><p class="access-help" id="seller-code-help">Use the current code, including any leading zeros.</p><button class="btn" type="submit">Open workspace '+icon('arrow',18)+'</button></form>':'')+'<p id="seller-status" class="form-status" role="status" aria-live="polite">'+escapeHTML(sellerError)+'</p>'+(!password?'<button class="text-link" data-seller-action="logout">Cancel and sign out</button>':'')+'</section>';
}
function sellerDashboard(){
  const library=route()==='studio-catalog';
  const data=sellerOverview;
  if(!data)return '<section class="access-panel"><p role="status">Loading your dashboard…</p><p id="seller-status" role="status">'+escapeHTML(sellerError)+'</p><button class="btn secondary" data-seller-action="retry">Retry</button></section>';
  const orders=data.recentOrders;
  const uploadLink='<a class="btn" href="#studio-catalog" data-upload-action="open-new">'+icon('upload',18)+' Upload a beat</a>';
  const body=orders.length?'<div class="table-wrap"><table><thead><tr><th>Order</th><th>Amount</th><th>Status</th></tr></thead><tbody>'+orders.map(order=>'<tr><td>'+escapeHTML(order.reference)+'</td><td>'+escapeHTML(new Intl.NumberFormat('en-US',{style:'currency',currency:order.currency}).format(order.totalCents/100))+'</td><td>'+escapeHTML(order.status)+'</td></tr>').join('')+'</tbody></table></div>':empty('No orders yet','Recorded orders will appear here after checkout and payments are connected.');
  return '<div class="studio-layout"><aside class="studio-sidebar"><div><span class="subtle-label">Workspace</span><nav aria-label="Seller workspace"><a href="#studio" '+(!library?'aria-current="page"':'')+'>'+icon('overview',18)+' Overview</a><a href="#studio-catalog" '+(library?'aria-current="page"':'')+'>'+icon('disc',18)+' Beat library & files</a><a href="#store">'+icon('external',18)+' View storefront</a></nav></div><div class="seller-session-info"><strong>Joel Tracks</strong><small>joeltracks2000@gmail.com</small><span class="status-pill">Authenticator verified</span><button class="text-link" data-seller-action="logout">Sign out '+icon('arrow',18)+'</button></div></aside><section class="workspace">'+(library?sellerLibraryContent():'<div class="seller-page-heading"><div class="page-title"><p class="section-label">Your workspace</p><h1>Overview</h1><p>Manage your beats, files and orders.</p></div>'+uploadLink+'</div><section class="panel seller-library-shortcut"><div><h2>Beats & files</h2><p>Add MP3s, WAVs, stems and artwork, or replace files on an existing beat.</p></div><a class="btn secondary" href="#studio-catalog">Manage beats & files '+icon('arrow',18)+'</a></section><div class="dashboard-stats"><article><span>Paid orders</span><strong>'+formatCount(data.paidOrders)+'</strong><small>Verified paid status</small></article><article><span>USD license revenue</span><strong>'+cash(data.revenueCents/100)+'</strong><small>Paid USD orders</small></article><article><span>Pending orders</span><strong>'+formatCount(data.pendingOrders)+'</strong><small>Awaiting payment</small></article></div><section class="panel"><h2>Recent orders</h2>'+body+'</section><p id="seller-status" class="form-status" role="status" aria-live="polite">'+escapeHTML(sellerError)+'</p>')+'</section></div>';
}
function renderSellerWorkspace(){
  if(sellerView.stage==='ready'){nav(sellerDashboard());if(route()==='studio-catalog')uploadFeedback();}
  else nav(page('Seller workspace','Private access for Joel Tracks.',sellerAuthPanel()));
  if(!sellerChecked&&!sellerLoading)loadSeller();
}
async function loadSeller({background=false}={}){
  if(sellerLoading)return;
  sellerLoading=true;const epoch=++sellerLoadEpoch;
  const previousStage=sellerView.stage;
  let redraw=!background;
  try{
    const state=await sellerAPI('session');
    if(epoch!==sellerLoadEpoch)return;
    sellerView=state;sellerChecked=true;sellerError='';sellerLastCheck=Date.now();
    redraw=redraw||state.stage!==previousStage;
    if(state.stage==='ready'&&(!background||!sellerOverview))sellerOverview=await sellerAPI('overview');
    if(state.stage!=='ready'){
      sellerOverview=null;sellerBeatData=null;sellerBeatsAttempted=false;sellerEditingId='';resetSellerFileSelection();
      if(uploadRun.active){uploadRun.stopped=true;uploadRun.xhr?.abort();uploadRun.cancelConversion?.();}
    }
  }catch(error){
    if(epoch!==sellerLoadEpoch)return;
    sellerError=error.message;sellerChecked=true;
    if(error.status===401||error.status===403){
      sellerView={stage:'password'};sellerOverview=null;sellerSetupKey='';sellerBeatData=null;sellerBeatsAttempted=false;sellerEditingId='';resetSellerFileSelection();redraw=true;
      if(uploadRun.active){uploadRun.stopped=true;uploadRun.xhr?.abort();uploadRun.cancelConversion?.();}
    }else if(background&&previousStage==='ready')sellerMessage('Connection check failed. Your work is still here; saving requires a verified session.');
    else{sellerView={stage:'unavailable'};redraw=true;}
  }finally{sellerLoading=false;if(epoch===sellerLoadEpoch&&redraw&&route().startsWith('studio')){renderSellerWorkspace();afterRender();}}
}
document.addEventListener('submit',async event=>{
  if(!['seller-login-form','seller-mfa-form'].includes(event.target.id))return;
  event.preventDefault();const form=event.target,button=form.querySelector('button');
  button.disabled=true;sellerMessage('Verifying…');
  try{
    const data=new FormData(form);
    sellerView=await sellerAPI(form.id==='seller-login-form'?'login':'verify',form.id==='seller-login-form'?{password:data.get('password')}:{code:data.get('code')});
    form.reset();sellerSetupKey='';sellerError='';sellerChecked=true;
    if(sellerView.stage==='ready')sellerOverview=await sellerAPI('overview');
    if(route().startsWith('studio')){renderSellerWorkspace();afterRender();main.focus({preventScroll:true});}
  }catch(error){sellerMessage(error.message);button.disabled=false;if(error.status===401){form.reset();}}
});
document.addEventListener('click',async event=>{
  const button=event.target.closest('[data-seller-action]');if(!button)return;
  button.disabled=true;const action=button.dataset.sellerAction;
  try{
    if(action==='retry'){sellerChecked=false;sellerView={stage:'loading'};sellerError='';renderSellerWorkspace();return;}
    if(action==='logout'){
      await sellerAPI('logout',{});sellerLoadEpoch++;sellerView={stage:'password'};sellerOverview=null;sellerBeatData=null;sellerBeatsAttempted=false;sellerBeatError='';sellerEditingId='';resetSellerFileSelection();sellerSetupKey='';sellerError='';sellerChecked=true;renderSellerWorkspace();return;
    }
    if(action==='enroll'){
      const data=await sellerAPI('enroll',{});sellerView={stage:data.stage};sellerSetupKey=data.secret;sellerError='';renderSellerWorkspace();document.querySelector('[name="code"]')?.focus();
    }
  }catch(error){sellerMessage(error.message);button.disabled=false;}
});
// Session checks never replace an unchanged editor or discard a selected File.
// Every private API operation still checks the live owner/MFA session on the server.
function recheckSeller(force=false){
  if(!route().startsWith('studio')||sellerLoading)return;
  if(!sellerChecked){renderSellerWorkspace();return;}
  if(sellerView.stage!=='ready')return; // Keep authenticator setup/code entry intact on mobile app switches.
  if(force||Date.now()-sellerLastCheck>30000)return loadSeller({background:sellerView.stage==='ready'});
}
window.addEventListener('hashchange',()=>{
  if(route().startsWith('studio'))recheckSeller();
  else{sellerView={stage:'loading'};sellerOverview=null;sellerSetupKey='';sellerChecked=false;}
});
window.addEventListener('pageshow',event=>{if(event.persisted)recheckSeller(true);});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)return recheckSeller();});
