// Presentation helpers for the JT storefront and local seller workspace.
const logo = '<img class="jt-logo-lockup" src="assets/branding/soft-seal/joel-tracks.svg" width="936" height="216" alt="">';
const sellerMark = '<img src="assets/branding/soft-seal/capsule.svg" width="28" height="28" alt="">';
const navigation = [['store','Beats'],['licenses','Licenses'],['favorites','Favorites'],['contacts','Contacts'],['blog','Blog'],['purchases','Purchases']];
let studioQuery = '';
let studioStatus = 'All';
let dashboardRange = '7';
let chartMetric = 'plays';
const formatCount = value => new Intl.NumberFormat('en-US').format(value);
const studioLinks = [
  ['studio','Overview','overview'],['studio-catalog','Beat library','disc'],
  ['studio-stats','Analytics','chart'],['studio-payments','Payments','wallet'],
  ['studio-offers','Custom offers','inbox'],['studio-feature','Featured beat','disc'],
  ['studio-licenses','Licenses','file']
];
function brandLink(href='#store') {
  return '<a class="brand" href="'+href+'" aria-label="Joel Tracks home">'+logo+'</a>';
}
function renderHeader() {
  renderBulkBanner();
  const current = route();
  const studio = current.startsWith('studio');
  document.body.dataset.view = studio?'studio':'store';
  const count = cartRows().length;
  const links = navigation.map(([id,label])=>'<a href="#'+id+'"'+(current===id?' aria-current="page"':'')+'>'+label+(id==='favorites'&&favorites.size?'<span class="nav-count" aria-hidden="true">'+favorites.size+'</span>':'')+'</a>').join('');
  $('#header').innerHTML = '<div class="shell topbar">'+brandLink()+
    (studio?'<span class="studio-header-label">Seller workspace</span><div class="account-actions"><a class="text-link" href="#store">View storefront '+icon('external',16)+'</a><span class="avatar" aria-label="Joel Tracks seller">'+sellerMark+'</span></div>':
    '<nav class="nav" aria-label="Store navigation">'+links+'</nav><div class="account-actions"><a href="#cart" class="cart-link" aria-label="Cart, '+count+(count===1?' beat':' beats')+'">'+icon('cart',19)+'<span class="cart-label">Cart</span><span class="cart-total">'+cash(total())+'</span><span class="cart-count">'+count+'</span></a><button class="icon-btn menu-toggle" aria-label="Open navigation" aria-expanded="false" aria-controls="mobile-navigation" data-action="menu">'+icon('menu')+'</button></div>')+
    '</div>'+(studio?'':'<nav id="mobile-navigation" class="mobile-navigation" aria-label="Mobile navigation" hidden>'+links+'<a href="#contacts">Custom licensing</a></nav>');
  $('#footer').innerHTML = studio?'<div class="shell footer-inner">'+brandLink()+'<span>Joel Tracks</span><nav aria-label="Footer"><a href="#store">Storefront</a></nav></div>':customerFooter();
}
function showStore() { renderReferenceStore(); }
function renderCatalog() {
  const results = $('#results');
  if(!results)return;
  const list = matchingTracks();
  const filterSummary=$('#filter-summary');
  if(filterSummary)filterSummary.textContent=tag?'#'+tag:sorting==='title'?'Title A–Z':sorting==='bpm'?'BPM ↑':'';
  $('#catalog-count').textContent = list.length+' '+(list.length===1?'beat':'beats')+(query||tag||genre!=='All beats'?' matching your filters':' to make your own');
  $('#categories').innerHTML = ['All beats',...categories].map(name=>'<button class="tab" type="button" data-action="genre" data-id="'+escapeHTML(name)+'" aria-pressed="'+(genre===name)+'">'+escapeHTML(name)+'</button>').join('');
  const common = tracks.filter(track=>track.status==='Published').flatMap(track=>track.tags).slice(0,12);
  $('#catalog-tags').innerHTML = [...new Set([...common,...(tag?[tag]:[])])].map(tagButton).join('')+(tag?'<button class="clear-tag text-link" data-action="clear">Clear filters '+icon('x',14)+'</button>':'');
  results.innerHTML = list.length?trackList(list.slice(0,shown))+(list.length>shown?'<div class="load-more"><button class="btn secondary" data-action="more">Show more beats '+icon('down',16)+'</button></div>':''):
    catalogEmptyState();
  document.dispatchEvent(new CustomEvent('jt:catalog'));
}
function trackList(list) {
  return '<div class="tracks"><div class="list-head" aria-hidden="true"><span>Beat</span><span>Tags</span><span>BPM</span><span>Key</span><span>Time</span><span></span><span>Price / Add</span></div>'+list.map(trackRow).join('')+'</div>';
}
function trackRow(track) {
  const id = escapeHTML(track.id);
  const current = activeTrack===track.id && Boolean(sourceURL);
  const playing = current&&!audio.paused;
  const selected = cartRows().find(item=>item.beatId===track.id);
  const cartLabel=escapeHTML((selected?'Remove ':'Add ')+track.title+(selected?' from cart':' to cart'));
  const purchasable=tiers.filter(item=>item.price&&available(track,item.id));
  const price = selected?cash(cartLicense(selected).price):purchasable.length?cash(Math.min(...purchasable.map(item=>item.price))):'Offer';
  return '<article class="track'+(current?' active':'')+'" data-track="'+id+'"><div class="track-title"><button type="button" class="cover-play play-row" data-action="play" data-id="'+id+'" aria-label="'+(playing?'Pause ':'Play ')+escapeHTML(track.title)+'">'+cover(track)+'<span class="cover-play-overlay">'+icon(playing?'pause':'play',18)+'</span></button><div class="track-name"><b><a href="#beat-'+encodeURIComponent(track.id)+'" data-beat-link="'+id+'" aria-label="View '+escapeHTML(track.title)+' beat details">'+escapeHTML(track.title)+'</a></b><small>'+escapeHTML(track.genre)+'</small></div></div><span class="track-tags col-tags">'+track.tags.slice(0,2).map(tagButton).join('')+'</span><span class="meta col-bpm" aria-label="'+track.bpm+' BPM">'+track.bpm+'</span><span class="meta col-key">'+escapeHTML(track.key||'—')+'</span><span class="meta col-time">'+clock(track.duration)+'</span>'+
    buttonIcon('heart',(favorites.has(track.id)?'Remove from favorites: ':'Favorite ')+track.title,'favorite',track.id,favorites.has(track.id))+
    '<div class="beat-purchase"><span class="beat-price">'+price+'</span><button class="add-beat'+(selected?' in-cart':'')+'" data-action="'+(selected?'remove':'choose')+'" data-id="'+id+'" aria-label="'+cartLabel+'" title="'+cartLabel+'" aria-pressed="'+Boolean(selected)+'">'+icon(selected?'x':'plus',20)+'</button></div></article>';
}
function licenseCards(id='') { return referenceLicenseCards(id); }
function showLicenses() { renderReferenceLicenses(); }
function showDialog(title, subtitle, content) {
  modal.classList.remove('beat-editor-dialog');
  if(!modal.open)focusedBeforeDialog=document.activeElement;
  const wasOpen=modal.open;
  modal.innerHTML='<div class="modal-head"><div><h2 id="modal-title">'+title+'</h2>'+(subtitle?'<p>'+subtitle+'</p>':'')+'</div>'+buttonIcon('x','Close dialog','close')+'</div>'+content;
  if(!wasOpen)modal.showModal();
  else $('.modal-head button',modal).focus();
  document.dispatchEvent(new CustomEvent('jt:dialog',{detail:{wasOpen}}));
}
function showOptions(id) {
  const track=beat(id);
  if(!track)return;
  const current=cartRows().find(item=>item.beatId===id);
  const selected=current&&current.tierId!=='custom'?current.tierId:tiers.filter(item=>item.price&&available(track,item.id)).sort((a,b)=>a.price-b.price)[0]?.id;
  const rows=tiers.filter(item=>item.price).map(item=>{
    const enabled=available(track,item.id);
    return '<label class="license-option'+(!enabled?' unavailable':'')+'"><input type="radio" name="selected-license" value="'+item.id+'" '+(selected===item.id?'checked ':'')+(!enabled?'disabled ':'')+'><span class="radio-indicator"></span><span class="option-description"><b>'+item.name+'</b><small>'+item.files+(!enabled?' · Files unavailable':'')+'</small></span><strong>'+cash(item.price)+'</strong></label>';
  }).join('');
  showDialog('Choose your license','', '<div class="license-beat">'+cover(track,true)+'<div><b>'+escapeHTML(track.title)+'</b><p>'+escapeHTML(track.genre)+' · '+track.bpm+' BPM · '+escapeHTML(track.key)+'</p></div></div><fieldset class="license-options"><legend class="sr-only">License tier</legend>'+rows+'</fieldset><div class="custom-option"><div><b>Need a custom agreement?</b><p>Negotiate a price and royalty splits.</p></div><button class="text-link" data-action="offer" data-id="'+escapeHTML(id)+'">Make an offer '+icon('arrow',16)+'</button></div><p class="demo-note">Full rights and unresolved terms are shown in your agreement preview.</p><div class="license-dialog-footer"><span>License fee <strong id="license-price">'+(selected?cash(tier(selected).price):'—')+'</strong></span><button id="license-add" class="btn" data-action="add" data-id="'+escapeHTML(id)+'" data-tier="'+(selected||'')+'" '+(!selected?'disabled':'')+'>'+icon('plus',18)+' '+(current?'Update cart':'Add to cart')+'</button></div>');
}
function checkoutSteps(current) {
  return '<nav class="checkout-steps" aria-label="Checkout progress"><a href="#cart" '+(current==='cart'?'aria-current="step"':'')+'><span>'+icon(current==='checkout'?'check':'cart',16)+'</span> Your cart</a>'+icon('right',14)+'<span '+(current==='checkout'?'aria-current="step"':'')+'><span>'+icon('file',16)+'</span> Agreement review</span>'+icon('right',14)+'<span class="future-step"><span>'+icon('lock',16)+'</span> Payment</span></nav>';
}
function showCart() {
  const rows=cartRows();
  const pricing=cartPricing(rows);
  if(!rows.length){
    nav(page('Your cart','',empty('Your next record starts here.','Choose a beat, then add the license that fits your session.','<a class="btn" href="#store">Find a beat '+icon('arrow',18)+'</a>')));
    return;
  }
  const entries=rows.map((item,index)=>{
    const track=beat(item.beatId);
    const license=cartLicense(item);
    return '<article class="cart-row"><button class="cart-art" data-action="play" data-id="'+escapeHTML(track.id)+'" aria-label="Preview '+escapeHTML(track.title)+'">'+cover(track,true)+'<span>'+icon('play',20)+'</span></button><div class="cart-beat"><h2>'+beatPageLink(track)+'</h2><p>'+escapeHTML(track.genre)+' · '+track.bpm+' BPM · '+escapeHTML(track.key)+'</p><span class="cart-license">'+license.name+' <span> / </span> '+license.files+'</span>'+(license.offer?'<a class="text-link" href="#offers">View offer</a>':'<button class="text-link" data-action="change" data-id="'+escapeHTML(track.id)+'" aria-label="Change license for '+escapeHTML(track.title)+'">Change license</button>')+'</div><div class="cart-price">'+(pricing.rate?'<del aria-label="Listed price '+cash(license.price)+'">'+cash(license.price)+'</del>':'')+'<strong>'+cash(pricing.items[index].totalCents/100)+'</strong>'+(pricing.rate?'<small class="bulk-item-saving">'+pricing.rate+'% off</small>':'')+buttonIcon('trash','Remove '+track.title,'remove',track.id)+'</div></article>';
  }).join('');
  nav('<section class="shell page">'+checkoutSteps('cart')+'<div class="page-title"><h1>Your cart<span class="title-count" aria-hidden="true">'+rows.length+'</span></h1></div><div class="checkout-grid"><div><div class="cart-list">'+entries+'</div><a class="text-link continue-link" href="#store">'+icon('back',16)+' Keep browsing</a></div>'+summary(rows,'<a href="#checkout" class="btn">Review agreements '+icon('arrow',18)+'</a>','You’ll review the selected license before the payment step.')+'</div></section>');
}
function summary(rows,action,note) {
  const pricing=cartPricing(rows);
  const offerNote=pricing.rate?'<strong>'+pricing.rate+'% bulk discount applied</strong><br>You save '+cash(pricing.discountCents/100)+' on '+pricing.count+' beats.':pricing.count===1?'Add one more beat for 15% off your cart.':'';
  return '<aside class="order-summary"><h2>Order summary</h2>'+(offerNote?'<p class="bulk-offer-note">'+offerNote+'</p>':'')+rows.map(item=>'<div class="summary-item"><span>'+escapeHTML(beat(item.beatId).title)+'<small>'+cartLicense(item).name+'</small></span><strong>'+cash(cartLicense(item).price)+'</strong></div>').join('')+
    '<div class="sum-row delivery-row"><span>Delivery</span><span>Digital files</span></div><div class="sum-row"><span>Subtotal</span><span>'+cash(pricing.subtotalCents/100)+'</span></div>'+(pricing.rate?'<div class="sum-row bulk-discount"><span>Bulk discount ('+pricing.rate+'%)</span><strong>−'+cash(pricing.discountCents/100)+'</strong></div>':'')+'<div class="sum-row total"><span>Total <small>USD</small></span><strong>'+cash(pricing.totalCents/100)+'</strong></div>'+action+'<p class="demo-note">'+note+'</p><div class="summary-foot">'+icon('file',16)+'<span>One agreement for each beat</span></div></aside>';
}
function showCheckout() {
  const rows=cartRows();
  if(!rows.length){
    nav(page('Checkout','',empty('Your cart is empty','Add a beat and choose your license first.','<a class="btn" href="#store">Find a beat</a>')));
    return;
  }
  nav('<section class="shell page">'+checkoutSteps('checkout')+'<div class="page-title"><h1>Review your license</h1><p>Review your files, license and royalty splits.</p></div><div class="checkout-grid"><div class="checkout-content"><section class="checkout-section"><div class="section-number">1</div><div><h2>Buyer details</h2><div class="field-grid"><label class="field">Buyer display name<input id="buyer-name" autocomplete="name" value="'+escapeHTML(buyer.name)+'" maxlength="100" placeholder="Your artist or label name"></label></div></div></section><section class="checkout-section"><div class="section-number">2</div><div><h2>Your license agreements</h2><p class="section-description">Each draft reflects the beat and license in your cart.</p><div class="agreements" id="agreements">'+agreementList()+'</div><div class="callout">'+icon('file',18)+'<p>Drafts for review. Unresolved terms need approval and review by a qualified lawyer in the applicable jurisdiction.</p></div><label class="demo-check"><input id="reviewed" type="checkbox" '+(agreementsReviewed?'checked':'')+'><span>I’ve reviewed the demo terms.</span></label></div></section><a class="text-link continue-link" href="#cart">'+icon('back',16)+' Back to your cart</a></div>'+summary(rows,'<button id="finish-review" class="btn" data-action="finish" '+(agreementsReviewed?'':'disabled')+'>Finish demo review '+icon('arrow',18)+'</button>','Prototype checkout. Payment, signature and file delivery are pending.')+'</div></section>');
}
function renderPlayer() {
  const player=$('#player');
  if(beat(activeTrack)?.status!=='Published')activeTrack=tracks.find(item=>item.status==='Published')?.id;
  const track=beat(activeTrack);
  if(route().startsWith('studio')||!track){player.innerHTML='';return;}
  const playing=!audio.paused&&Boolean(sourceURL);
  player.innerHTML='<div class="shell player-inner"><div class="player-track">'+cover(track,true)+'<div class="track-name"><b>'+beatPageLink(track)+'</b><small>Joel Tracks · '+escapeHTML(track.genre.replace(' Beats',''))+'</small></div>'+buttonIcon('heart',(favorites.has(track.id)?'Remove from favorites: ':'Favorite ')+track.title,'favorite',track.id,favorites.has(track.id))+'</div><div class="player-center"><div class="transport">'+buttonIcon('prev','Previous beat','previous')+'<button class="icon-btn main-play" data-action="play" data-id="'+escapeHTML(track.id)+'" aria-label="'+(playing?'Pause current beat':'Play current beat')+'">'+icon(playing?'pause':'play',20)+'</button>'+buttonIcon('next','Next beat','next')+'</div><span class="time" id="elapsed">0:00</span><div class="seek-wrap"><div class="seek-track"><div id="seek-fill"></div></div><input id="seek" type="range" min="0" max="'+(track.duration||1)+'" step=".1" value="'+audio.currentTime+'" aria-label="Playback position" '+(sourceURL?'':'disabled')+'></div><span class="time" id="duration">'+clock(track.duration)+'</span></div><div class="player-tools"><div class="volume">'+buttonIcon(audio.muted?'mute':'volume',audio.muted?'Unmute':'Mute','mute')+'<input type="range" id="volume" min="0" max="1" step=".01" value="'+audio.volume+'" aria-label="Preview volume"></div><button class="player-buy" data-action="choose" data-id="'+escapeHTML(track.id)+'" aria-label="Add playing beat '+escapeHTML(track.title)+' to cart">'+icon('plus',18)+'<span>Add license</span></button></div></div>';
  updateProgress();
}
function updateProgress() {
  const seek=$('#seek');
  if(!seek)return;
  const length=Number.isFinite(audio.duration)?audio.duration:beat(activeTrack)?.duration||0;
  const position=audio.currentTime||0;
  $('#elapsed').textContent=clock(position);
  $('#duration').textContent=clock(length);
  seek.max=length||1;
  seek.value=position;
  seek.setAttribute('aria-valuetext',clock(position)+' of '+clock(length));
  $('#seek-fill').style.transform='scaleX('+(length?position/length:0)+')';
}

const journalEntries = [];
function showBlog() {
  nav(page('The writing room.','Notes on beats, sessions and getting a record ready.', '<div class="journal-grid">'+journalEntries.map(entry=>'<a class="journal-card" href="#article-'+entry.id+'"><div class="journal-image"><img src="assets/cover-'+entry.cover+'.jpg" alt="" width="360" height="260" loading="lazy">'+icon('external',22)+'</div><span class="subtle-label">'+entry.category+'</span><h2>'+entry.title+'</h2><p>'+entry.intro+'</p><span class="text-link">Read article '+icon('arrow',16)+'</span></a>').join('')+'</div><p class="demo-note">Original draft articles for the prototype. Editorial copy awaits your review.</p>'));
}
function showArticle(id) {
  const entry=journalEntries.find(entry=>entry.id===id);
  if(!entry){showBlog();return;}
  nav('<article class="shell page article-page"><a class="text-link" href="#blog">'+icon('back',16)+' Back to the writing room</a><div class="article-title"><span class="subtle-label">'+entry.category+'</span><h1>'+entry.title+'</h1><p>'+entry.intro+'</p></div><div class="article-body">'+entry.paragraphs.map(paragraph=>'<p>'+paragraph+'</p>').join('')+'</div><a class="btn" href="#store">Find a beat '+icon('arrow',18)+'</a></article>');
}
function showContacts() {
  const draft=read('contact-draft',{});
  const channels='<nav class="contact-channels" aria-label="Contact Joel Tracks"><a class="contact-channel" href="https://www.instagram.com/prodbyjo_el/" target="_blank" rel="noopener noreferrer"><span class="contact-channel-icon">'+icon('instagram',24)+'</span><span><strong>Instagram</strong><span>@prodbyjo_el</span></span>'+icon('external',18)+'<span class="sr-only">Opens in a new tab</span></a><a class="contact-channel" href="mailto:joeltracks2000@gmail.com"><span class="contact-channel-icon">'+icon('mail',24)+'</span><span><strong>Email</strong><span>joeltracks2000@gmail.com</span></span>'+icon('arrow',18)+'</a></nav>';
  nav(page('Let’s talk records','Questions about a beat, your session or a custom agreement?', channels+'<div class="contact-layout"><div class="contact-topics"><section><h2>Find your files</h2><p>Compare the MP3, WAV and stems included in each license.</p><a class="text-link" href="#licenses">Compare licenses '+icon('arrow',16)+'</a></section><section><h2>Talk custom terms</h2><p>Choose a beat and propose your price and splits. You can track the offer in your offers page.</p><a class="text-link" href="#offers">View your offers '+icon('arrow',16)+'</a></section></div><form id="contact-form" class="contact-form"><h2>A note to JT</h2><p class="section-description">Enquiry preview. Your draft is saved in this browser.</p><div class="field-grid"><label class="field">Your name<input name="name" required autocomplete="name" maxlength="100" value="'+escapeHTML(draft.name||'')+'"></label><label class="field">Email address<input name="email" type="email" autocomplete="email" required maxlength="160" value="'+escapeHTML(draft.email||'')+'"></label><label class="field wide">What’s on your mind?<textarea name="message" required rows="5" maxlength="2000">'+escapeHTML(draft.message||'')+'</textarea></label></div><button class="btn" type="submit">Save enquiry draft '+icon('arrow',18)+'</button><p id="contact-status" class="form-status" role="status"></p></form></div>'));
}
function openBeatEditor(id) {
  const track=beat(id);
  const input=(name,label,value='',extra='')=>'<label class="field">'+label+'<input name="'+name+'" value="'+escapeHTML(value)+'" '+extra+'></label>';
  const upload=(name,label,accept,description)=>'<label class="upload-field"><span class="upload-icon">'+icon(name==='cover'?'image':'upload',21)+'</span><span><b>'+label+'</b><small>'+escapeHTML(track?.files[name]?.name||description)+'</small></span><input type="file" name="'+name+'" accept="'+accept+'"></label>';
  showDialog(track?'Edit beat':'Upload a beat','Audio, artwork and the details listeners see.',
    '<form id="beat-form" data-id="'+escapeHTML(id||'')+'"><div class="editor-columns"><div class="editor-details"><h3>Beat details</h3><div class="field-grid">'+input('title','Beat title',track?.title||'','required maxlength="100"')+
      '<label class="field">Category<select name="genre">'+categories.map(genre=>'<option '+(track?.genre===genre?'selected':'')+'>'+escapeHTML(genre)+'</option>').join('')+'</select></label>'+
      input('bpm','BPM',track?.bpm||'','type="number" required min="1" max="400"')+input('key','Musical key',track?.key||'','maxlength="70"')+
      input('tags','Searchable tags',track?.tags.join(', ')||'','maxlength="220" placeholder="soulful, late night, guitar"')+
      '<label class="field">Store status<select name="status"><option '+(track?.status!=='Published'?'selected':'')+'>Draft</option><option '+(track?.status==='Published'?'selected':'')+'>Published</option></select></label></div><div id="cover-preview">'+(track?'<div class="file-preview">'+cover(track,true)+'<span>Current artwork</span></div>':'')+'</div>'+upload('cover','Cover artwork','image/jpeg,image/png,image/webp','JPG, PNG or WebP')+'</div><div class="editor-files"><h3>Audio files</h3>'+upload('preview','Clean full-length preview','audio/mpeg,audio/wav,.mp3,.wav','Optional · MP3 or WAV')+
      upload('mp3','MP3 file','audio/mpeg,.mp3','For every fixed license')+upload('wav','WAV file','audio/wav,.wav','For Premium and Unlimited')+upload('stems','Stems archive','.zip','ZIP · For Unlimited')+'</div></div><p class="demo-note">Files and edits are stored in this browser. Clearing site data removes them.</p><p class="form-error" id="beat-error" role="alert"></p><div class="editor-footer"><button type="button" class="btn secondary" data-action="close">Cancel</button><button class="btn" type="submit">'+icon('check',18)+' Save beat</button></div></form>');
  modal.classList.add('beat-editor-dialog');
}

function afterRender() {
  document.dispatchEvent(new CustomEvent('jt:render'));
}


