// Public launch preparation: no demo seed data, simulated sales or local seller access.
let catalogStatus = 'loading';
let purchaseServiceAvailable = false;
let purchaseOrder = null;
let purchaseLoad = false;
let accessToken = '';
const contactEmail = 'joeltracks2000@gmail.com';
const instagramURL = 'https://www.instagram.com/prodbyjo_el/';
const emailLink = (subject='') => 'mailto:' + contactEmail + (subject ? '?subject=' + encodeURIComponent(subject) : '');

async function accessAPI(path, data) {
  const response = await fetch('/api/' + path, {
    method: data === undefined ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store',
    headers: data === undefined ? {} : { 'Content-Type': 'application/json' },
    body: data === undefined ? undefined : JSON.stringify(data)
  });
  let result;
  try { result = await response.json(); } catch { throw new Error('This service is temporarily unavailable. Please contact JT.'); }
  if (!response.ok) throw new Error(result.error || 'Please try again or contact JT.');
  return result;
}
function catalogEmptyState() {
  if (catalogStatus === 'loading') return empty('Loading the beat library', 'Your next session starts here.');
  if (catalogStatus === 'error') return empty('The beat library is unavailable', 'Please try again shortly, or contact JT about a beat.', '<a class="btn secondary" href="#contacts">Contact JT</a>');
  if (tracks.length) return empty('No matching beats', 'Try another title, tag or category.', '<button class="btn secondary" data-action="clear">Clear filters</button>');
  return empty('The next release is on its way', 'Contact JT for beat enquiries and custom licensing.', '<a class="btn secondary" href="#contacts">Talk to JT '+icon('arrow',18)+'</a>');
}
function showPurchases() {
  if (route() === 'purchases-confirm') {
    nav(page('Your purchase is one step away', 'Confirm access to view your files and license agreement.',
      '<section class="access-panel"><div class="access-symbol">'+icon('lock',26)+'</div><h2>Open your secure order</h2><p>This link can be used once. Opening it does not make a purchase or accept new license terms.</p><button class="btn" id="confirm-access" type="button" '+(!accessToken?'disabled':'')+'>Continue to my purchase '+icon('arrow',18)+'</button><p id="access-status" class="form-status" role="status" aria-live="polite">'+(!accessToken?'This link is no longer available. Request a new one below.':'')+'</p><a class="text-link" href="#purchases">Request another link</a></section>'));
    return;
  }
  if (purchaseOrder) {
    const amount = new Intl.NumberFormat('en-US',{style:'currency',currency:purchaseOrder.currency}).format(purchaseOrder.totalCents/100);
    nav(page('Your purchase', 'Files and agreements for your paid order.',
      '<section class="access-panel purchase-panel"><div class="panel-heading"><div><span class="section-label">'+escapeHTML(purchaseOrder.reference)+'</span><h2>Ready for your session</h2></div><strong>'+escapeHTML(amount)+'</strong></div><ul class="purchase-items">'+purchaseOrder.items.map(item=>'<li><h3>'+escapeHTML(item.title)+'</h3><p>'+escapeHTML(item.license)+'</p></li>').join('')+'</ul><h2>Your files</h2>'+(purchaseOrder.files.length?'<ul class="purchase-files">'+purchaseOrder.files.map(file=>'<li>'+icon('file',20)+'<span>'+escapeHTML(file.name)+'</span><a class="btn secondary" href="'+escapeHTML(file.url)+'">Download<span class="sr-only"> '+escapeHTML(file.name)+'</span></a></li>').join('')+'</ul>':'<p>Your files are being prepared. Contact JT if you need help.</p>')+'<p class="access-help">Your access session expires automatically. You can request another link using the same order details.</p><button class="text-link" type="button" id="access-logout">Close purchase access</button><p id="access-status" class="form-status" role="status"></p></section>'));
    return;
  }
  nav(page('Access your purchase', 'Your beats and agreements, without another password.',
    '<div class="access-layout"><section class="access-panel"><h2>Send me a secure link</h2><p>Use the email and order reference from your purchase confirmation. Each link opens one order.</p><form id="purchase-access-form"><label class="field" for="purchase-email">Purchase email<input id="purchase-email" name="email" type="email" autocomplete="email" required maxlength="254" '+(!purchaseServiceAvailable?'disabled':'')+'></label><label class="field" for="purchase-reference">Order reference<input id="purchase-reference" name="reference" type="text" autocomplete="off" required minlength="3" maxlength="80" pattern="[A-Za-z0-9-]+" aria-describedby="reference-help" '+(!purchaseServiceAvailable?'disabled':'')+'></label><p id="reference-help" class="access-help">Find this in your order confirmation email.</p><button class="btn" type="submit" '+(!purchaseServiceAvailable?'disabled':'')+'>Email my access link '+icon('mail',18)+'</button><p id="access-status" class="form-status" role="status" aria-live="polite">'+(!purchaseServiceAvailable?'Purchase-access emails are not available yet. Email JT for help with your files.':'')+'</p></form></section><aside class="access-support"><span class="section-label">Need a hand?</span><h2>Talk directly to JT</h2><p>Lost your order reference, or used a different email? Get in touch so JT can help verify your purchase.</p><a class="text-link" href="'+emailLink('Help accessing my purchase')+'">'+icon('mail',18)+' Email JT</a><p class="access-help">Never share your access link. JT will not ask for your email password.</p></aside></div>'));
  if (!purchaseLoad && purchaseServiceAvailable) {
    purchaseLoad = true;
    accessAPI('access/order').then(order=>{purchaseOrder=order;if(route()==='purchases')showPurchases();}).catch(()=>{}).finally(()=>{purchaseLoad=false;});
  }
}
function showStudio() {
  nav(page('Seller workspace', '', empty('Seller access is not open yet', 'The workspace will open once private seller authentication is configured.', '<a class="btn secondary" href="#store">Back to the store</a>')));
}
function editBeat(){ showStudio(); }
function negotiate(){ showStudio(); }
function addCustom(){ showOffer(); }
function showOffer(id='') {
  const track=beat(id);
  const subject=track?'Custom license enquiry: '+track.title:'Custom license enquiry';
  showDialog('Let’s discuss your release', 'Negotiate price, files and royalty splits directly with JT.',
    (track?'<p><strong>'+escapeHTML(track.title)+'</strong></p>':'')+'<p>Share your artist name, release plans and the terms you have in mind.</p><a class="btn" href="'+emailLink(subject)+'">'+icon('mail',18)+' Email JT</a>');
}
function showBuyerOffers(){
  nav(page('Custom licensing','Discuss your release directly with JT.',empty('Let’s find the right terms','Email JT with the beat, price, files and royalty splits you want to discuss.','<a class="btn" href="'+emailLink('Custom license enquiry')+'">Email JT '+icon('mail',18)+'</a>')));
}
function showContacts(){
  nav(page('Let’s talk records','Questions about a beat, your session or a custom agreement?',
    '<nav class="contact-channels" aria-label="Contact Joel Tracks"><a class="contact-channel" href="'+instagramURL+'" target="_blank" rel="noopener noreferrer"><span class="contact-channel-icon">'+icon('instagram',24)+'</span><span><strong>Instagram</strong><span>@prodbyjo_el</span></span>'+icon('external',18)+'<span class="sr-only">Opens in a new tab</span></a><a class="contact-channel" href="'+emailLink()+'"><span class="contact-channel-icon">'+icon('mail',24)+'</span><span><strong>Email</strong><span>'+contactEmail+'</span></span>'+icon('arrow',18)+'</a></nav><div class="contact-layout"><section class="contact-topics"><h2>Looking for your files?</h2><p>Use your purchase email and order reference to request secure access.</p><a class="text-link" href="#purchases">Access your purchase '+icon('arrow',18)+'</a></section><section class="contact-topics"><h2>Make it fit your release</h2><p>For custom licensing, include the beat, the files you need and your proposed price and splits.</p><a class="text-link" href="'+emailLink('Custom license enquiry')+'">Discuss a license '+icon('mail',18)+'</a></section></div>'));
}
function showBlog(){nav(page('The writing room','Notes from Joel Tracks.',empty('No articles published yet','Follow JT on Instagram for the latest updates.','<a class="btn secondary" href="'+instagramURL+'" target="_blank" rel="noopener noreferrer">Instagram '+icon('external',18)+'</a>')));}
function showArticle(){nav(page('Article unavailable','',empty('This article is not published','Visit the blog for published articles.','<a class="btn secondary" href="#blog">Back to the blog</a>')));}
function referenceLicenseCards(id=''){
  const track=id?beat(id):null;
  return '<div class="reference-license-grid">'+tiers.map(item=>{
    const custom=item.id==='custom';
    const enabled=!id||custom||available(track,item.id);
    const selected=id&&cartRows().some(row=>row.beatId===id&&row.tierId===item.id);
    const missing=id&&!custom&&!enabled?missingLicenseFiles(track,item):'';
    const reason=missing?'Unavailable: missing '+missing+'.':'';
    const action=id?'<button type="button" class="btn secondary" data-action="'+(custom?'offer':selected?'remove':'add')+'" data-id="'+escapeHTML(id)+'" data-tier="'+item.id+'"'+(!enabled?' disabled aria-describedby="license-files-'+item.id+'"':'')+'>'+(custom?'Discuss custom license':!enabled?'Unavailable':selected?'Remove from cart':'Add '+escapeHTML(item.name.replace(' License',''))+' to cart')+'</button>':'<a class="text-link" href="#contacts">License enquiries '+icon('arrow',16)+'</a>';
    return '<article class="reference-license-card"><header><h3>'+escapeHTML(item.name)+'</h3><p>'+escapeHTML(item.files)+'</p></header><div class="license-card-body"><div class="license-fee">'+(item.price?'<span>USD</span><strong>'+cash(item.price)+'</strong>':'<strong>Let’s talk</strong>')+'</div><ul class="license-file-list">'+['mp3','wav','stems'].map(file=>'<li class="'+(item.delivery.includes(file)?'included':'not-included')+'">'+icon(custom?'right':item.delivery.includes(file)?'check':'x',16)+'<span>'+(file==='stems'?'Stems':file.toUpperCase())+(custom?' · negotiated':'')+'</span></li>').join('')+'</ul><p>'+(custom?'Price, files and splits negotiated for your release.':'Publishing: '+item.publishing+'% artist / '+remainingShare(item.publishing)+'% JT. Master royalties: '+item.major+'% artist / '+remainingShare(item.major)+'% JT for major-label artists; '+item.indie+'% artist / '+remainingShare(item.indie)+'% JT for smaller indie artists.')+'</p>'+(reason?'<p class="license-availability-note" id="license-files-'+item.id+'">'+escapeHTML(reason)+'</p>':'')+action+'</div></article>';
  }).join('')+'</div>';
}
function renderReferenceLicenses(){nav(page('Compare licenses','Choose the files your release needs.',referenceLicenseCards()+'<div class="license-notes"><section><h2>Review before purchase</h2><p>The complete license agreement will be available for review before checkout opens. File packages do not by themselves define usage permissions.</p></section><section><h2>Need different terms?</h2><p>Discuss price, deliverables and royalty splits directly with JT.</p><a class="text-link" href="#contacts">Discuss custom licensing '+icon('arrow',18)+'</a></section></div>'));}
function showCheckout(){
  const rows=cartRows();
  if(!rows.length){nav(page('Checkout','',empty('Your cart is empty','Choose a beat and a license before checkout.','<a class="btn" href="#store">Browse beats</a>')));return;}
  nav(page('Guest checkout','No account registration required.', '<div class="checkout-grid"><section class="access-panel"><h2>Your purchase details</h2><form id="guest-checkout-form"><label class="field">Buyer name<input name="name" autocomplete="name" required maxlength="100"></label><label class="field">Email for files and agreement<input name="email" type="email" autocomplete="email" required maxlength="254"></label><p>Your email is used for order confirmation and secure purchase access.</p><button class="btn" disabled type="submit">Continue to agreement review</button><p class="form-status" role="status">Checkout is not open yet. Contact JT about licensing.</p><a class="text-link" href="#contacts">Contact JT</a></form></section>'+summary(rows,'','Full agreements and payment must be available before an order can be placed.')+'</div>'));
}
async function playBeat(id,force=false){
  const track=beat(id);
  if(!track)return;
  if(!force&&activeTrack===id&&sourceURL){
    if(audio.paused){try{await audio.play();}catch{announce('Audio could not be played. Please try again.');}}else audio.pause();
    return;
  }
  const url=track.previewUrl;
  if(typeof url!=='string'||!(/^(?:https:\/\/|\/(?!\/))/.test(url))){announce('This beat’s preview is unavailable.');return;}
  audio.pause();sourceURL=url;activeTrack=id;audio.src=url;renderPlayer();
  try{await audio.play();syncPlayButtons();}catch{announce('Audio could not be played. Please try again.');}
}
function releasePlatformLogos(){
  const platforms=[
    ['Spotify','spotify.png','https://open.spotify.com/'],
    ['Apple Music','apple-music.svg','https://music.apple.com/'],
    ['Amazon Music','amazon-music.svg','https://music.amazon.com/'],
    ['YouTube','youtube.svg','https://www.youtube.com/'],
    ['Deezer','deezer.svg','https://www.deezer.com/'],
    ['TIDAL','tidal.png','https://tidal.com/']
  ];
  return platforms.map(([name,file,url])=>'<li><a class="release-platform-link" href="'+url+'" target="_blank" rel="noopener noreferrer" aria-label="Visit '+name+' (opens in a new tab)"><img class="platform-logo'+(name==='Amazon Music'?' platform-logo-wordmark':'')+'" src="assets/graphics/footer/platforms/'+file+'" alt="" aria-hidden="true" width="'+(name==='Amazon Music'?132:28)+'" height="28" loading="lazy" decoding="async"><span'+(name==='Amazon Music'?' class="sr-only"':'')+'>'+name+'</span></a></li>').join('');
}
function customerFooter(){
  return '<section class="release-band" aria-labelledby="release-title"><div class="shell"><div class="release-heading"><div><p class="section-label">Beyond the studio</p><h2 id="release-title">Your song. Your next release</h2><p>Your selected license defines the permitted uses and limits.</p></div><a class="text-link" href="#licenses">Explore licenses '+icon('arrow',18)+'</a></div><ul class="release-platforms" aria-label="Examples of release platforms">'+releasePlatformLogos()+'</ul><div class="release-uses">'+[['footerAudio','Audio releases','Streaming services and digital downloads, within your license terms.'],['footerVideo','Music videos','Share your finished video as permitted by your agreement.'],['footerLive','Live performances','Take your song to the stage within your license permissions.']].map(([graphic,title,text])=>'<article class="release-use">'+jtGraphics[graphic]+'<h3>'+title+'</h3><p>'+text+'</p></article>').join('')+'</div><p class="release-footnote">Distribution and platform requirements also apply. For radio, TV, film, advertising or games, <a href="#contacts">discuss your release with JT</a>.</p></div></section><div class="site-footer-main"><div class="shell site-footer-grid"><section class="site-footer-column footer-about">'+brandLink()+'<p>R&B, Afro and Trap beats by Joel Tracks.</p><a class="text-link" href="'+instagramURL+'" target="_blank" rel="noopener noreferrer">'+icon('instagram',18)+' Instagram</a></section><nav class="site-footer-column" aria-label="Browse"><h2>Find your sound</h2>'+['All beats',...categories].map(category=>'<a href="#store" data-footer-category="'+escapeHTML(category)+'">'+escapeHTML(category)+'</a>').join('')+'<a href="#favorites">Favorites</a></nav><nav class="site-footer-column" aria-label="Help"><h2>Here to help</h2><a href="#licenses">Licenses</a><a href="#contacts">Custom licensing</a><a href="#contacts">Contact JT</a><a href="#blog">The blog</a></nav><section class="site-footer-column"><h2>Your purchases</h2><p>Request secure access to your order’s files and agreement.</p><a class="text-link" href="#purchases">Access your purchase '+icon('arrow',18)+'</a><a class="text-link" href="'+emailLink('Help with my purchase')+'">'+icon('mail',18)+' Email JT</a></section></div><div class="shell site-footer-bottom"><p>© '+new Date().getFullYear()+' Joel Tracks</p><a href="'+emailLink()+'">'+contactEmail+'</a></div></div>';
}
document.addEventListener('submit',async event=>{
  if(event.target.id==='guest-checkout-form'){event.preventDefault();return;}
  if(event.target.id!=='purchase-access-form')return;
  event.preventDefault();
  const form=event.target;
  const button=form.querySelector('button');
  const status=document.getElementById('access-status');
  button.disabled=true;status.textContent='Requesting your access link…';
  try{const data=Object.fromEntries(new FormData(form));const result=await accessAPI('access/request',data);status.textContent=result.message;}
  catch(error){status.textContent=error.message;}
  finally{button.disabled=!purchaseServiceAvailable;}
});
document.addEventListener('click',async event=>{
  const button=event.target.closest('#confirm-access,#access-logout');
  if(!button)return;
  button.disabled=true;
  const status=document.getElementById('access-status');
  try{
    if(button.id==='access-logout'){
      await accessAPI('access/logout',{});purchaseOrder=null;location.hash='purchases';showPurchases();
    }else{
      await accessAPI('access/exchange',{token:accessToken});accessToken='';purchaseOrder=await accessAPI('access/order');location.hash='purchases';showPurchases();
    }
  }catch(error){if(status)status.textContent=error.message;button.disabled=false;}
});
// Remove token fragments before rendering or third-party processing; an explicit button consumes the token.
if(location.pathname==='/access'){
  accessToken=new URLSearchParams(location.hash.slice(1)).get('token')||'';
  history.replaceState(null,'','/access#'+(accessToken?'purchases-confirm':'purchases'));
  oldRoute=location.hash;
}
renderRoute();
Promise.allSettled([accessAPI('catalog'),accessAPI('access/status')]).then(([catalog,status])=>{
  if(catalog.status==='fulfilled'){
    // No local/demo records are imported into the live catalog. Publication is a future seller API operation.
    tracks=Array.isArray(catalog.value.beats)?catalog.value.beats.filter(track=>track.status==='Published'&&!track.demo):[];
    catalogStatus=tracks.length?'ready':'empty';
    removeUnavailableCartItems();
  }else catalogStatus='error';
  purchaseServiceAvailable=status.status==='fulfilled'&&status.value.available===true;
  renderRoute();
});
// Show the offer strip only when there is a published beat/player to dock above.
document.addEventListener('jt:catalog',()=>{const banner=document.getElementById('bulk-banner');if(banner)banner.hidden=!tracks.some(track=>track.status==='Published');});
