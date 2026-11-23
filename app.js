
const $ = (selector, parent=document) => parent.querySelector(selector);
const $$ = (selector, parent=document) => [...parent.querySelectorAll(selector)];
const main = $('#main');
const modal = $('#modal');
const audio = $('#audio');
const dollars = new Intl.NumberFormat('en-US', {style:'currency',currency:'USD',minimumFractionDigits:0,maximumFractionDigits:2});
const dollarsWithCents = new Intl.NumberFormat('en-US', {style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:2});
const cash = amount => (Number.isInteger(Number(amount))?dollars:dollarsWithCents).format(amount);
const remainingShare = percent => Math.round((100-percent)*100)/100;
const clock = seconds => {
  const value = Math.max(0,Math.floor(Number(seconds)||0));
  return Math.floor(value/60)+':'+String(value%60).padStart(2,'0');
};
const escapeHTML = value => String(value??'').replace(/[&<>"']/g, ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
function read(key, fallback) {
  try {return JSON.parse(localStorage.getItem('jt:store:'+key)) ?? fallback;} catch {return fallback;}
}
function save(key, value) {
  try {localStorage.setItem('jt:store:'+key,JSON.stringify(value));}
  catch {announce('Browser storage is unavailable. Changes apply to this session.');}
}
let favorites = new Set(read('favorites',[]));
let cart = read('cart',[]);
let offers = [];
let metrics = {};
let featureSettings = read('feature',{beatId:'',label:'Featured beat'});
let recordedSales = [];
let seenEvents = read('seen-events',{offers:[],payments:[]});
let pendingSellerRefresh = false;
hydrateLicenses(read('license-settings',{}));
let tracks = [];
let sourceURL = '';
let activeTrack = '';
let playSequence = 0;
let focusedBeforeDialog;
let noticeTimer;
let query = '';
let genre = 'All beats';
let tag = '';
let sorting = 'newest';
let shown = 12;
const compactCatalog=matchMedia('(max-width:900px)');
let catalogFiltersOpen=false;
let agreementsReviewed = false;
const offerStatuses = ['Offer received','Counter offered','Terms agreed','Declined'];
const route = () => location.hash.slice(1) || 'store';
const beat = id => tracks.find(item=>item.id===id);
const tier = id => tiers.find(item=>item.id===id);
function cartLicense(item) {
  const license=tier(item.tierId);
  if(item.tierId!=='custom')return license;
  const offer=offers.find(offer=>offer.id===item.offerId&&offer.revision===item.revision&&offer.status==='Terms agreed');
  return offer?{...license,price:offer.price,offer}:null;
}
function available(track, tierId) {
  return licenseAvailability(track,tier(tierId)).enabled;
}
const cartRows = () => cart.filter(item=>{
  const track=beat(item.beatId);
  return track?.status==='Published' && available(track,item.tierId) && cartLicense(item)?.price;
});
const cartPricing = (rows=cartRows()) => calculateBulkDeal(rows.map(item=>cartLicense(item).price));
const total = () => cartPricing().totalCents/100;
function removeUnavailableCartItems() {
  const valid=cartRows();
  if(valid.length===cart.length)return;
  cart=valid;
  save('cart',cart);
  agreementsReviewed=false;
  announce('Unavailable licenses were removed from your cart. Choose another available license.');
}
audio.volume = read('volume',.75);
let dbPromise;
function database() {
  if (!dbPromise) dbPromise = new Promise((resolve,reject)=>{
    const request = indexedDB.open('jt-prototype',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('beats',{keyPath:'id'});
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
  return dbPromise;
}
async function localBeats() {
  const db = await database();
  return new Promise((resolve,reject)=>{
    const request = db.transaction('beats').objectStore('beats').getAll();
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
}
async function storeBeat(track) {
  const db = await database();
  return new Promise((resolve,reject)=>{
    const transaction = db.transaction('beats','readwrite');
    transaction.objectStore('beats').put(track);
    transaction.oncomplete=resolve;
    transaction.onerror=()=>reject(transaction.error);
    transaction.onabort=()=>reject(transaction.error);
  });
}
const thumbnails = new Map();
function artURL(track) {
  const artwork=track.files?.cover;
  if (artwork instanceof Blob && artwork.size>0 && !thumbnails.has(artwork)) thumbnails.set(artwork,URL.createObjectURL(artwork));
  return escapeHTML(thumbnails.get(artwork) || track.artworkUrl || 'assets/branding/soft-seal/capsule.svg');
}
function cover(track, large=false) {
  return '<img class="cover'+(large?' large':'')+'" src="'+artURL(track)+'" alt="" width="'+(large?53:40)+'" height="'+(large?53:40)+'">';
}
function buttonIcon(name,label,action,id='',pressed) {
  return '<button class="icon-btn" type="button" data-action="'+action+'" data-id="'+escapeHTML(id)+'" aria-label="'+escapeHTML(label)+'" title="'+escapeHTML(label)+'"'+(pressed===undefined?'':' aria-pressed="'+pressed+'"')+'>'+icon(name)+'</button>';
}
function announce(text) {
  clearTimeout(noticeTimer);
  $('#notice').textContent = text;
  noticeTimer=setTimeout(()=>$('#notice').textContent='',3500);
}
function metric(id, type, delta=1) {
  metrics[id] ||= {};
  metrics[id][type] = Math.max(0,(metrics[id][type]||0)+delta);
  save('metrics',metrics);
}
function nav(html) {main.innerHTML=html;}
function editBeat(id) {openBeatEditor(id);}
function renderRoute(change=false) {
  const beatTransition=prepareBeatTransition(route());
  pendingSellerRefresh=false;
  const current=route();
  renderHeader();
  if (current==='favorites') showFavorites();
  else if (current==='cart') showCart();
  else if (current==='checkout') showCheckout();
  else if (current==='licenses') showLicenses();
  else if (current==='purchases'||current==='purchases-confirm') showPurchases();
  else if (current==='offers') showBuyerOffers();
  else if (current==='contacts') showContacts();
  else if (current==='blog') showBlog();
  else if (current.startsWith('article-')) showArticle(current.slice(8));
  else if (current.startsWith('beat-')) showBeatPage(current.slice(5));
  else if (current.startsWith('studio')) showStudio(current);
  else showStore();
  if (current.startsWith('studio')) audio.pause();
  renderPlayer();
  syncPlayButtons();
  afterRender();
  if(change) {
    window.scrollTo({top:0,behavior:'instant'});
    main.focus({preventScroll:true});
  }
  finishBeatTransition(beatTransition);
}
function page(title, subtitle, body) {
  return '<section class="shell page"><div class="page-title"><h1>'+title+'</h1>'+(subtitle?'<p>'+subtitle+'</p>':'')+'</div>'+body+'</section>';
}
function empty(title, detail, action='') {
  return '<div class="empty"><h3>'+title+'</h3><p>'+detail+'</p>'+action+'</div>';
}
function matchingTracks() {
  let list=tracks.filter(item=>item.status==='Published');
  return list.filter(track=>{
    const terms=query.toLowerCase().trim().split(/\s+/).filter(Boolean);
    const haystack=[track.title,track.genre,...track.tags].join(' ').toLowerCase();
    return (genre==='All beats'||track.genre===genre) && (!tag||track.tags.includes(tag)) && terms.every(term=>haystack.includes(term));
  }).sort((a,b)=> sorting==='title'?a.title.localeCompare(b.title):sorting==='bpm'?a.bpm-b.bpm:b.created-a.created);
}
function tagButton(label) {
  return '<button type="button" class="tag" data-action="tag" data-id="'+escapeHTML(label)+'" aria-pressed="'+(tag===label)+'">#'+escapeHTML(label)+'</button>';
}
function showFavorites() {
  const list=tracks.filter(item=>favorites.has(item.id)&&item.status==='Published');
  nav(page('Favorites','Beats saved in this browser.',list.length?trackList(list):empty('No favorites yet','Tap the heart beside a beat to save it here.','<a class="btn" href="#store">Browse beats</a>')));
}
function showOffer(id) {
  const track=beat(id);
  if(!track)return;
  showDialog('Make a custom offer',escapeHTML(track.title)+' · Propose a price and artist shares. JT would receive the remainder of each split.',
    '<form id="offer-form" data-id="'+escapeHTML(id)+'" class="field-grid"><label class="field">Artist / label name<input name="party" required maxlength="100" placeholder="Demo Artist"></label><label class="field">Offer price (USD)<input type="number" name="price" min="0.01" step=".01" required></label><label class="field">Artist publishing share (%)<input type="number" name="publishing" min="0" max="100" step=".01" required value="50"></label><label class="field">Artist master share (%)<input type="number" name="master" min="0" max="100" step=".01" required></label><label class="field wide">Notes about your release<textarea name="notes" rows="3" maxlength="500"></textarea></label><div class="field wide modal-actions"><button class="btn" type="submit">Save demo offer '+icon('arrow',18)+'</button></div></form><p class="demo-note">Offers are saved to the local Seller demo. No message is sent.</p>');
}
function changeCart(id,tierId) {
  const track=beat(id);
  if(!track||!tier(tierId)?.price||!available(track,tierId))return;
  const previous=cart.find(item=>item.beatId===id);
  const cartOrigin=captureCartOrigin(id);
  cart=cart.filter(item=>item.beatId!==id);
  cart.push({beatId:id,tierId});
  save('cart',cart);
  if(!previous)metric(id,'cart');
  agreementsReviewed=false;
  modal.close();
  renderRoute();
  const selector=focusedBeforeDialog?.classList.contains('spotlight-buy')?'.spotlight-buy':focusedBeforeDialog?.closest('.track')?'.add-beat':focusedBeforeDialog?.closest('.cart-row')?'[data-action="change"]':'[data-action="choose"]';
  const focusTarget=$(selector+'[data-id="'+CSS.escape(id)+'"]') || $('[data-beat-cart]') || $('.cart-link');
  focusTarget?.focus({preventScroll:true});
  announce((previous?'License updated in your cart.':'Added to your cart.')+(cartPricing().rate?' '+cartPricing().rate+'% bulk discount applied.':''));
  if(!previous)document.dispatchEvent(new CustomEvent('jt:cart-add',{detail:cartOrigin}));
}
const buyer={name:''};
function agreementList() {
  const pricing=cartPricing();
  return cartRows().map((item,index)=>{
    const track=beat(item.beatId);
    const license=cartLicense(item);
    const offer=license.offer;
    const major='Major-label: '+license.major+'% artist / '+remainingShare(license.major)+'% JT.';
    const indie='Smaller indie: '+license.indie+'% artist / '+remainingShare(license.indie)+'% JT.';
    const allocation=major+' '+indie;
    const details=[
      ['Seller','JT / Joel Tracks (legal contracting name pending)'],
      ['Buyer',offer?.party||buyer.name.trim()||'Pending'],
      ['Beat',track.title+' · '+track.id],
      ...(pricing.rate?[['Listed license fee',cash(pricing.items[index].priceCents/100)+' USD'],['Bulk discount',pricing.rate+'% · −'+cash(pricing.items[index].discountCents/100)+' USD']]:[]),
      ['License fee',cash(pricing.items[index].totalCents/100)+' USD'],
      ['Files',offer?'Delivery list pending confirmation':license.files],
      ['Publishing split',(offer?offer.publishing+'% artist / '+remainingShare(offer.publishing)+'% JT':license.publishing+'% artist / '+remainingShare(license.publishing)+'% JT')+' on the new composition. Registration and administration pending.'],
      ['Master royalty split',offer?offer.master+'% artist / '+remainingShare(offer.master)+'% JT. Revenue basis pending.':allocation+' Eligibility and revenue basis pending.'],
      ...(offer?[['Offer reference',offer.id+' · Revision '+offer.revision],['Negotiation notes',offer.terms||'None recorded']]:[]),
      ['Grant and uses',license.grant||'Pending scope, exclusivity, release, performance, video, sync, monetization and transfer rights.'],
      ['Duration and limits',license.limits||'Pending term, territory, stream and download caps, and any upgrade rules.'],
      ['Additional terms',license.terms||'Pending credits, sample clearance, Content ID, royalty reporting, termination, governing law and dispute terms.'],
      ['Record','Prototype draft v'+license.version+' · effective date, order reference and assent pending.']
    ];
    return '<details class="agreement" '+(index===0?'open':'')+'><summary>'+escapeHTML(track.title)+' · '+license.name+'</summary><div class="agreement-body"><p>Draft for review. This agreement would cover the license of the beat listed below for the stated fee. The parties must confirm the grant, remaining terms and delivery conditions before any license takes effect.</p><dl>'+details.map(([label,value])=>'<dt>'+label+'</dt><dd>'+escapeHTML(value)+'</dd>').join('')+'</dl></div></details>';
  }).join('');
}
function syncPlayButtons() {
  const playing=!audio.paused && !!sourceURL;
  const toggle=$('.main-play');
  if(toggle){
    toggle.innerHTML=icon(playing?'pause':'play',21);
    toggle.setAttribute('aria-label',playing?'Pause current beat':'Play current beat');
  }
  $$('.track').forEach(row=>{
    const current=row.dataset.track===activeTrack && Boolean(sourceURL);
    row.classList.toggle('active',current);
    const control=$('.play-row',row);
    const title=beat(row.dataset.track)?.title||'beat';
    $('.cover-play-overlay',control).innerHTML=icon(current&&playing?'pause':'play',18);
    control.setAttribute('aria-label',(current&&playing?'Pause ':'Play ')+title);
  });
  const feature=$('.feature-play');
  if(feature){
    const isPlaying=feature.dataset.id===activeTrack&&playing;
    feature.innerHTML=icon(isPlaying?'pause':'play',27);
    feature.setAttribute('aria-label',(isPlaying?'Pause featured beat ':'Play featured beat ')+beat(feature.dataset.id).title);
  }
  const detailPlay=$('[data-beat-preview]');
  if(detailPlay){
    const isPlaying=detailPlay.dataset.id===activeTrack&&playing;
    detailPlay.innerHTML=icon(isPlaying?'pause':'play',18)+'<span>'+(isPlaying?'Pause beat':'Play beat')+'</span>';
    detailPlay.setAttribute('aria-label',(isPlaying?'Pause ':'Play ')+beat(detailPlay.dataset.id).title);
  }
}
async function playBeat(id, force=false) {
  const track=beat(id);
  if(!track)return;
  if(!force && activeTrack===id && sourceURL) {
    if(audio.paused) {
      try {await audio.play();}
      catch {announce('Could not play this audio.');}
    } else audio.pause();
    return;
  }
  const upload=track.files.preview||track.files.mp3||track.files.wav;
  if(!upload&&!track.demo){announce('This beat has no preview file.');return;}
  const sequence=++playSequence;
  try {
    const nextURL=upload?URL.createObjectURL(upload):renderDemoAudio(track);
    audio.pause();
    if(sourceURL)URL.revokeObjectURL(sourceURL);
    sourceURL=nextURL;
    activeTrack=id;
    audio.src=sourceURL;
    renderPlayer();
    await audio.play();
    if(sequence===playSequence)metric(id,'plays');
  } catch {
    if(sequence===playSequence)announce('Could not play this audio. Try an MP3 or PCM WAV file.');
  }
}
function playAdjacent(direction) {
  let list=route()==='store'?matchingTracks():route()==='favorites'?tracks.filter(item=>favorites.has(item.id)&&item.status==='Published'):tracks.filter(item=>item.status==='Published');
  if(!list.length)list=tracks.filter(item=>item.status==='Published');
  const index=list.findIndex(item=>item.id===activeTrack);
  const target=list[index<0 ? (direction<0?list.length-1:0) : (index+direction+list.length)%list.length];
  if(target)playBeat(target.id,true);
}
audio.addEventListener('play',syncPlayButtons);
audio.addEventListener('pause',syncPlayButtons);
audio.addEventListener('ended',syncPlayButtons);
audio.addEventListener('timeupdate',updateProgress);
audio.addEventListener('loadedmetadata',updateProgress);
function table(headers,rows){
  return '<div class="table-scroll" tabindex="0" role="region" aria-label="Seller data"><table class="data-table"><thead><tr>'+headers.map(item=>'<th scope="col">'+item+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map(cell=>'<td>'+cell+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
}
function sellerOffers() {
  if(!offers.length)return empty('No custom offers','Save a Custom license offer on any beat to try negotiating here.');
  return offers.slice().reverse().map(item=>{
    const amounts='Artist publishing '+item.publishing+'% · Artist master '+item.master+'%';
    return '<article class="panel negotiation"><h2>'+escapeHTML(item.trackTitle)+' · '+cash(item.price)+'</h2><p>'+escapeHTML(item.party)+' · '+amounts+' · <span class="status-pill">'+escapeHTML(item.status)+'</span></p>'+
      (item.notes?'<p>'+escapeHTML(item.notes)+'</p>':'')+'<button class="btn secondary small" data-action="negotiate" data-id="'+escapeHTML(item.id)+'">Edit offer terms</button></article>';
  }).join('');
}
function negotiate(id) {
  const item=offers.find(offer=>offer.id===id);
  if(!item)return;
  const num=(key,label,max,min=0)=>'<label class="field">'+label+'<input type="number" name="'+key+'" min="'+min+'" '+(max?'max="'+max+'" ':'')+'step=".01" required value="'+item[key]+'"></label>';
  showDialog('Update custom offer',escapeHTML(item.trackTitle)+' · '+escapeHTML(item.party),
    '<form id="negotiate-form" data-id="'+escapeHTML(id)+'" class="field-grid">'+num('price','Offer price (USD)',null,.01)+
    '<label class="field">Offer status<select name="status">'+offerStatuses.map(status=>'<option '+(item.status===status?'selected':'')+'>'+status+'</option>').join('')+'</select></label>'+
    num('publishing','Artist publishing share (%)',100)+num('master','Artist master share (%)',100)+
    '<label class="field wide">Terms or counteroffer notes<textarea name="terms" rows="3" maxlength="800">'+escapeHTML(item.terms||'')+'</textarea></label><div class="field wide modal-actions"><button class="btn" type="submit">Save offer update</button></div></form><p class="demo-note">Terms agreed is a simulated status for reviewing the checkout flow.</p>');
}
function showBuyerOffers(){
  const content=offers.length?offers.slice().reverse().map(item=>'<article class="panel negotiation"><h2>'+escapeHTML(item.trackTitle)+' · '+cash(item.price)+'</h2><p><span class="status-pill">'+escapeHTML(item.status)+'</span></p><p>Artist publishing '+item.publishing+'% · Artist master '+item.master+'%'+(item.terms?' · '+escapeHTML(item.terms):'')+'</p>'+
    (item.status==='Terms agreed'&&beat(item.beatId)?.status==='Published'?'<button class="btn small" data-action="add-custom" data-id="'+escapeHTML(item.id)+'">Add agreed offer to cart</button>':'')+'</article>').join(''):
  empty('No offers yet','Choose Custom License on a beat to make an offer.','<a class="btn" href="#store">Browse beats</a>');
  nav(page('Custom offers','Demo offer status and your latest price and splits.',content));
}
const audioProbe=document.createElement('audio');
function durationFor(file) {
  return new Promise(resolve=>{
    const probe=audioProbe.cloneNode();
    const url=URL.createObjectURL(file);
    const timer=setTimeout(()=>finish(0),3500);
    function finish(value) {
      clearTimeout(timer);
      probe.onloadedmetadata=null;
      probe.onerror=null;
      probe.removeAttribute('src');
      URL.revokeObjectURL(url);
      resolve(value);
    }
    probe.onloadedmetadata=()=>finish(Number.isFinite(probe.duration)?Math.round(probe.duration):0);
    probe.onerror=()=>finish(0);
    probe.src=url;
  });
}
async function submitBeat(form, data) {
  const original=beat(form.dataset.id);
  const files={...original?.files};
  for(const field of ['preview','mp3','wav','stems','cover']){
    const file=data.get(field);
    if(file?.size)files[field]=file;
  }
  const status=data.get('status');
  const preview=files.preview||files.mp3||files.wav;
  const error=$('#beat-error',form);
  const submit=$('[type="submit"]',form);
  const title=data.get('title').trim();
  if(!title){error.textContent='Enter a beat title.';return;}
  if(status==='Published'&&!preview&&!original?.demo){
    error.textContent='Add a preview, MP3 or WAV file before showing a local beat in the store.';return;
  }
  submit.disabled=true;
  submit.textContent='Saving…';
  try {
    const duration=preview?await durationFor(preview):original?.duration||0;
    if(preview&&!duration){
      error.textContent='The preview could not be read. Choose a valid MP3 or PCM WAV file.';
      return;
    }
    const track={
      id:original?.id||'local-'+(crypto.randomUUID?.()||Date.now()),title,genre:data.get('genre'),bpm:Number(data.get('bpm')),
      key:data.get('key').trim(),tags:[...new Set(data.get('tags').split(',').map(tag=>tag.trim().replace(/^#+/,'').toLowerCase()).filter(Boolean))],
      cover:original?.cover||3,seed:original?.seed||1,created:original?.created||Date.now(),files,status,duration,demo:original?.demo&&!preview
    };
    await storeBeat(track);
    tracks=tracks.filter(item=>item.id!==track.id).concat(track);
    removeUnavailableCartItems();
    if(track.id===activeTrack&&sourceURL){
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      URL.revokeObjectURL(sourceURL);
      sourceURL='';
    }
    modal.close();
    renderRoute();
    ($('[data-action="edit"][data-id="'+CSS.escape(track.id)+'"]')||$('[data-action="edit"]'))?.focus({preventScroll:true});
    announce('Beat saved in this browser.');
  } catch {
    error.textContent='Browser storage could not save these files. Try a smaller file or free up browser storage.';
  } finally {
    submit.disabled=false;
    submit.textContent='Save beat';
  }
}
let coverPreviewURL='';
modal.addEventListener('close',()=>{
  modal.classList.remove('beat-editor-dialog');
  if(focusedBeforeDialog?.isConnected)focusedBeforeDialog.focus();
  if(coverPreviewURL)URL.revokeObjectURL(coverPreviewURL);
  coverPreviewURL='';
  if(pendingSellerRefresh)renderRoute();
});
function clearFilters() {
  query='';tag='';genre='All beats';shown=12;
  if($('#search'))$('#search').value='';
  renderCatalog();
  $('#search')?.focus();
}
function saveOffer(form,data,isCounter) {
  const values={price:Number(data.get('price')),publishing:Number(data.get('publishing')),master:Number(data.get('master'))};
  if(isCounter){
    const current=offers.find(item=>item.id===form.dataset.id);
    cart=cart.filter(item=>item.offerId!==current.id);
    save('cart',cart);
    Object.assign(current,values,{status:data.get('status'),terms:data.get('terms').trim(),revision:current.revision+1});
    agreementsReviewed=false;
    save('offers',offers);
    modal.close();
    renderRoute();
    $('[data-action="negotiate"][data-id="'+CSS.escape(current.id)+'"]')?.focus({preventScroll:true});
    announce('Offer updated in this browser.');
    return;
  }
  const track=beat(form.dataset.id);
  if(!data.get('party').trim()){
    const name=form.elements.party;
    name.setCustomValidity('Enter an artist or label name.');
    name.reportValidity();
    name.addEventListener('input',()=>name.setCustomValidity(''),{once:true});
    return;
  }
  offers.push({id:'offer-'+(crypto.randomUUID?.()||Date.now()),beatId:track.id,trackTitle:track.title,
    ...values,party:data.get('party').trim(),notes:data.get('notes').trim(),status:offerStatuses[0],revision:1});
  save('offers',offers);
  modal.close();
  location.hash='offers';
  announce('Custom offer saved in this browser.');
}
function refreshAgreements() {
  const agreements=$('#agreements');
  if(!agreements)return;
  const open=$$('details',agreements).map(el=>el.open);
  agreements.innerHTML=agreementList();
  $$('details',agreements).forEach((el,index)=>el.open=open[index]??index===0);
  agreementsReviewed=false;
  $('#reviewed').checked=false;
  $('#finish-review').disabled=true;
}
document.addEventListener('submit',event=>{
  const form=event.target;
  if(form.id==='contact-form'){
    event.preventDefault();
    const draft=Object.fromEntries(new FormData(form));
    save('contact-draft',draft);
    $('#contact-status').textContent='Enquiry draft saved in this browser.';
    return;
  }
  if(!['offer-form','negotiate-form','beat-form'].includes(form.id))return;
  event.preventDefault();
  const data=new FormData(form);
  if(form.id==='beat-form')submitBeat(form,data);
  else saveOffer(form,data,form.id==='negotiate-form');
});
document.addEventListener('input',event=>{
  const el=event.target;
  if(el.id==='studio-search'){studioQuery=el.value;$('#studio-library-results').innerHTML=libraryTable();}
  if(el.id==='search'){query=el.value;shown=12;renderCatalog();}
  if(el.id==='seek'){audio.currentTime=Number(el.value);updateProgress();}
  if(el.id==='volume'){
    audio.volume=Number(el.value);
    audio.muted=false;
    save('volume',audio.volume);
    updateMute();
  }
  if(el.id==='buyer-name'){buyer.name=el.value;refreshAgreements();}
});
document.addEventListener('change',event=>{
  const el=event.target;
  if(el.type==='file'&&el.files?.[0]&&el.closest('.upload-field')){
    const caption=$('small',el.closest('.upload-field'));
    if(caption)caption.textContent=el.files[0].name;
  }
  if(el.id==='studio-status'){studioStatus=el.value;$('#studio-library-results').innerHTML=libraryTable();}
  if(el.id==='dashboard-range'){dashboardRange=el.value;showStudio(route());afterRender();}
  if(el.name==='selected-license'){
    $('#license-price').textContent=cash(tier(el.value).price);
    $('#license-add').dataset.tier=el.value;
  }
  if(el.id==='sort'){sorting=el.value;shown=12;renderCatalog();}
  if(el.id==='reviewed'){agreementsReviewed=el.checked;$('#finish-review').disabled=!el.checked;}
  if(el.name==='cover' && el.files?.[0]){
    if(coverPreviewURL)URL.revokeObjectURL(coverPreviewURL);
    coverPreviewURL=URL.createObjectURL(el.files[0]);
    $('#cover-preview').innerHTML='<div class="file-preview"><img class="cover large" alt="" src="'+escapeHTML(coverPreviewURL)+'"><span>'+escapeHTML(el.files[0].name)+'</span></div>';
  }
});
function updateMute(){
  const control=$('[data-action="mute"]');
  if(!control)return;
  control.innerHTML=icon(audio.muted?'mute':'volume');
  control.setAttribute('aria-label',audio.muted?'Unmute':'Mute');
  control.title=audio.muted?'Unmute':'Mute';
}
function toggleFavorite(id, button) {
  const exists=favorites.has(id);
  if(exists)favorites.delete(id);
  else favorites.add(id);
  metric(id,'favorites',exists?-1:1);
  save('favorites',[...favorites]);
  if(route()==='favorites') {
    showFavorites();
    ($('[data-action="favorite"]')||main)?.focus({preventScroll:true});
  }
  $$('[data-action="favorite"]').filter(control=>control.dataset.id===id).forEach(control=>{
    control.setAttribute('aria-pressed',String(!exists));
    const label=(exists?'Favorite ':'Remove from favorites: ')+beat(id).title;
    control.setAttribute('aria-label',label);
    control.title=label;
  });
  renderHeader();
}
function addCustom(id){
  const offer=offers.find(item=>item.id===id);
  if(!offer||offer.status!=='Terms agreed')return;
  const exists=cart.some(item=>item.beatId===offer.beatId);
  const cartOrigin=captureCartOrigin(offer.beatId);
  cart=cart.filter(item=>item.beatId!==offer.beatId);
  cart.push({beatId:offer.beatId,tierId:'custom',offerId:id,revision:offer.revision});
  if(!exists)metric(offer.beatId,'cart');
  save('cart',cart);
  agreementsReviewed=false;
  location.hash='cart';
  announce('Agreed demo offer added to cart.');
  if(!exists)requestAnimationFrame(()=>document.dispatchEvent(new CustomEvent('jt:cart-add',{detail:cartOrigin})));
}
document.addEventListener('click',event=>{
  const button=event.target.closest('[data-action]');
  if(!button)return;
  const {action,id='',tier:tierId}=button.dataset;
  switch(action){
    case 'menu': {
      const menu=$('#mobile-navigation');
      const open=menu.hidden;
      menu.hidden=!open;
      button.setAttribute('aria-expanded',String(open));
      button.setAttribute('aria-label',open?'Close navigation':'Open navigation');
      if(open&&!matchMedia('(prefers-reduced-motion: reduce)').matches)menu.animate([{opacity:0,transform:'translateY(-8px)'},{opacity:1,transform:'none'}],{duration:200,easing:'ease-out'});
      break;
    }
    case 'chart-metric':
      if(chartMetric===id)break;
      chartMetric=id;
      $('.main-chart').outerHTML=sampleChartPanel();
      afterRender();
      $('.metric-switch [aria-pressed="true"]').focus({preventScroll:true});
      break;
    case 'clear-library':studioQuery='';studioStatus='All';showStudio(route());break;
    case 'browse': {
      const catalog=$('#beat-catalog');
      catalog.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
      $('#search').focus({preventScroll:true});
      break;
    }
    case 'play':playBeat(id);break;
    case 'previous':playAdjacent(-1);break;
    case 'next':playAdjacent(1);break;
    case 'mute':audio.muted=!audio.muted;updateMute();break;
    case 'favorite':toggleFavorite(id,button);break;
    case 'genre':
      genre=id;shown=12;renderCatalog();
      $('#categories [aria-pressed="true"]').focus({preventScroll:true});break;
    case 'tag':
      tag=tag===id?'':id;shown=12;
      if(route()!=='store')location.hash='store';
      else {
        renderCatalog();
        const focus=$('#catalog-tags [data-id="'+CSS.escape(id)+'"]')||$('#search');
        focus?.focus({preventScroll:true});
      }
      break;
    case 'more': {
      const start=shown;shown+=12;renderCatalog();
      $$('.track')[start]?.querySelector('.play-row')?.focus();
      break;
    }
    case 'clear':clearFilters();break;
    case 'choose':case 'change':showOptions(id,action==='change');break;
    case 'close':modal.close();break;
    case 'close-beat':closeBeatPage();break;
    case 'add':changeCart(id,tierId);break;
    case 'add-custom':addCustom(id);break;
    case 'offer':showOffer(id);break;
    case 'remove':
      cart=cart.filter(item=>item.beatId!==id);save('cart',cart);
      agreementsReviewed=false;renderRoute();
      ($((button.classList.contains('spotlight-buy')?'.spotlight-buy':'.add-beat')+'[data-id="'+CSS.escape(id)+'"]')||$('[data-beat-cart]')||$('[data-action="remove"]')||$('.page .btn'))?.focus({preventScroll:true});announce('Removed from your cart.');break;
    case 'edit':editBeat(id);break;
    case 'negotiate':negotiate(id);break;
    case 'finish':
      if(!agreementsReviewed)return;
      showDialog('Demo review complete','You can return to the store or keep exploring the cart.','<p class="demo-note">This review is a prototype interaction. It creates no order, signature, charge or license activation.</p><div class="modal-actions"><button class="btn secondary" data-action="close">Back to review</button><a class="btn" href="#store">Back to beats '+icon('arrow',17)+'</a></div>');
      break;
  }
});
document.addEventListener('keydown',event=>{
  if(event.key!=='Escape')return;
  const menu=$('#mobile-navigation');
  if(menu&&!menu.hidden){
    menu.hidden=true;
    const trigger=$('[data-action="menu"]');
    trigger.setAttribute('aria-expanded','false');
    trigger.setAttribute('aria-label','Open navigation');
    trigger.focus();
  }
});
window.addEventListener('hashchange',()=>{
  if(route()==='main'){
    history.replaceState(null,'',oldRoute);
    main.focus();
    return;
  }
  oldRoute=location.hash||'#store';
  if(modal.open)modal.close();
  if(route()!=='checkout')agreementsReviewed=false;
  renderRoute(true);
});
compactCatalog.addEventListener('change',()=>{
  const panel=$('#catalog-refinements');
  if(panel)panel.open=!compactCatalog.matches||catalogFiltersOpen;
});
let oldRoute=location.hash||'#store';
// launch.js initializes the public catalog and order-access flow.
