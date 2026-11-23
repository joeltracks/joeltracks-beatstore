// Presentation helpers for the JT storefront and local seller workspace.
const logo = '<img class="jt-logo-lockup" src="assets/branding/soft-seal/joel-tracks.svg" width="936" height="216" alt="">';
const sellerMark = '<img src="assets/branding/soft-seal/capsule.svg" width="28" height="28" alt="">';
const navigation = [['store','Beats'],['licenses','Licenses'],['favorites','Favorites'],['contacts','Contacts'],['blog','Blog']];
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
    '</div>'+(studio?'':'<nav id="mobile-navigation" class="mobile-navigation" aria-label="Mobile navigation" hidden>'+links+'<a href="#offers">My custom offers</a></nav>');
  $('#footer').innerHTML = studio?'<div class="shell footer-inner">'+brandLink()+'<span class="prototype-label">Frontend preview · Demo audio & data</span><nav aria-label="Footer"><a href="GUIDE.md" target="_blank" rel="noopener">Review notes</a><a href="#store">Storefront</a></nav></div>':customerFooter();
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
  const common = ['late night','soulful','808','warm','guitar','dance'];
  $('#catalog-tags').innerHTML = [...new Set([...common,...(tag?[tag]:[])])].map(tagButton).join('')+(tag?'<button class="clear-tag text-link" data-action="clear">Clear filters '+icon('x',14)+'</button>':'');
  results.innerHTML = list.length?trackList(list.slice(0,shown))+(list.length>shown?'<div class="load-more"><button class="btn secondary" data-action="more">Show more beats '+icon('down',16)+'</button></div>':''):
    empty('No beats found','Try another title, mood or category.','<button class="btn secondary" data-action="clear">Clear filters</button>');
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

const sampleActivity = {
  '7': {
    label:'Nov 11 – 17, 2026',
    days:['Nov 11','Nov 12','Nov 13','Nov 14','Nov 15','Nov 16','Nov 17'],
    plays:[240,328,284,410,365,492,536],
    revenue:[150,100,300,50,500,200,350],
    orders:[2,1,3,1,1,2,4],
    favorites:[18,27,22,35,28,47,41]
  },
  '30': {
    label:'Oct 19 – Nov 17, 2026',
    days:['Oct 19–23','Oct 24–28','Oct 29–Nov 2','Nov 3–7','Nov 8–12','Nov 13–17'],
    plays:[1108,1384,1296,1620,1851,2087],
    revenue:[600,750,500,900,650,1400],
    orders:[8,10,7,12,9,11],
    favorites:[72,98,83,121,138,164]
  }
};
const sumValues = values=>values.reduce((sum,value)=>sum+value,0);
function studioNavigation(current) {
  return '<aside class="studio-sidebar"><div class="sidebar-navigation-region"><div class="sidebar-sticky"><p class="sidebar-label">Workspace</p><nav aria-label="Seller sections">'+studioLinks.map(([id,label,mark])=>'<a href="#'+id+'"'+(current===id?' aria-current="page"':'')+'>'+icon(mark,18)+'<span>'+label+'</span>'+notificationBadge(id)+'</a>').join('')+'</nav></div></div><div class="sidebar-bottom"><div class="seller-identity"><span class="avatar" aria-hidden="true">'+sellerMark+'</span><div>Joel Tracks<small>Seller demo</small></div></div><a class="text-link" href="#store">'+icon('external',17)+' View storefront</a></div></aside>';
}
function statBlocks(items) {
  return '<div class="dashboard-stats">'+items.map(([label,value,note])=>'<article><span>'+label+'</span><strong><span class="sr-only">'+escapeHTML(value)+'</span><span aria-hidden="true" data-count="'+Number(String(value).replace(/[^\d.-]/g,''))+'" data-money="'+String(value).includes('$')+'">'+value+'</span></strong><small>'+note+'</small></article>').join('')+'</div>';
}
function periodSelect() {
  return '<select id="dashboard-range" class="sort" aria-label="Analytics date range"><option value="7" '+(dashboardRange==='7'?'selected':'')+'>Last 7 days</option><option value="30" '+(dashboardRange==='30'?'selected':'')+'>Last 30 days</option></select>';
}
function lineChart(metric) {
  const series=sampleActivity[dashboardRange];
  const values=series[metric];
  const ceiling=Math.ceil(Math.max(...values)/100)*100 || 100;
  const money=metric==='revenue';
  const points=values.map((value,index)=>({x:52+index/(values.length-1)*660,y:210-value/ceiling*168,value,label:series.days[index]}));
  const path=points.map((point,index)=>(index?'L':'M')+point.x.toFixed(1)+','+point.y.toFixed(1)).join(' ');
  const labels=[0,.25,.5,.75,1].map(fraction=>{
    const y=210-fraction*168;
    return '<line x1="52" x2="712" y1="'+y+'" y2="'+y+'" class="chart-grid"/><text x="40" y="'+(y+4)+'" text-anchor="end">'+(money?'$':'')+formatCount(ceiling*fraction)+'</text>';
  }).join('');
  return '<div class="chart-visual" id="activity-visual" aria-label="Sample '+(money?'revenue':'preview starts')+' chart"><svg viewBox="0 0 746 252" class="line-chart" role="img" aria-label="'+(money?'Revenue':'Preview starts')+' over '+series.label+'. Values are available in the data table.">'+labels+
    '<path d="'+path+'L712,210L52,210Z" class="chart-area"/><path d="'+path+'" class="chart-line" pathLength="1"/>'+
    points.map(point=>'<circle class="chart-point" cx="'+point.x+'" cy="'+point.y+'" r="4.5" tabindex="0" role="img" aria-label="'+point.label+': '+(money?cash(point.value):formatCount(point.value)+' preview starts')+'"><title>'+point.label+' · '+(money?cash(point.value):formatCount(point.value)+' preview starts')+'</title></circle>').join('')+
    points.map((point,index)=>'<text class="chart-date '+(index===0||index===points.length-1||index===Math.floor(points.length/2)?'':'alternate-date')+'" x="'+point.x+'" y="244" text-anchor="middle">'+point.label+'</text>').join('')+'</svg></div><div class="chart-footer"><details class="chart-data"><summary>View chart data</summary>'+table(['Period',money?'Revenue (USD)':'Preview starts'],points.map(point=>[point.label,money?cash(point.value):formatCount(point.value)]))+'</details><button class="text-link" data-action="chart-reveal" aria-label="Replay chart generation animation">Replay reveal '+icon('play',13)+'</button></div>';
}
function genreChart() {
  const groups=dashboardRange==='7'?[['R&B',46],['Afro',32],['Trap',22]]:[['R&B',43],['Afro',35],['Trap',22]];
  return '<section class="chart-panel genre-panel"><div class="panel-heading"><h2>By genre</h2><span class="muted">Preview share</span></div><div class="genre-bars">'+groups.map(([name,percent])=>'<div><div class="bar-label"><span>'+name+' Beats</span><strong>'+percent+'%</strong></div><div class="bar-track"><span style="--bar-scale:'+percent/100+'"></span></div></div>').join('')+'</div><p class="demo-note">Sample distribution for the selected period.</p><a class="text-link" href="#studio-stats">View analytics '+icon('arrow',16)+'</a></section>';
}
function sampleChartPanel() {
  const series=sampleActivity[dashboardRange];
  return '<section class="chart-panel main-chart"><div class="panel-heading"><div><h2>'+(chartMetric==='revenue'?'License revenue':'Preview activity')+'</h2><p>'+series.label+'</p></div><div class="metric-switch" aria-label="Chart metric"><button data-action="chart-metric" data-id="plays" aria-pressed="'+(chartMetric==='plays')+'">Previews</button><button data-action="chart-metric" data-id="revenue" aria-pressed="'+(chartMetric==='revenue')+'">Revenue</button></div></div>'+lineChart(chartMetric)+'</section>';
}
function topBeatList() {
  const records=dashboardRange==='7'?[['demo-0',536],['demo-1',492],['demo-2',410]]:[['demo-0',1840],['demo-1',1632],['demo-2',1294]];
  return '<section class="workspace-panel"><div class="panel-heading"><h2>Top beats</h2><a class="text-link" href="#studio-stats">View all '+icon('arrow',16)+'</a></div><div class="top-beats">'+records.map(([id,count],index)=>{
    const track=beat(id);
    if(!track)return '';
    return '<div class="top-beat"><span class="rank">'+(index+1)+'</span>'+cover(track)+'<div><b>'+escapeHTML(track.title)+'</b><small>'+escapeHTML(track.genre)+'</small></div><span>'+formatCount(count)+'<small>previews</small></span></div>';
  }).join('')+'</div></section>';
}
function studioOverview() {
  const series=sampleActivity[dashboardRange];
  return '<div class="workspace-title"><div><h1>Store overview</h1><p>Revenue, listening and catalog activity for the selected period.</p></div><div class="workspace-actions">'+periodSelect()+'<button class="btn" data-action="edit">'+icon('plus',18)+' Upload beat</button></div></div><div class="data-context"><span class="status-dot"></span><span>Sample analytics</span><span>'+series.label+'</span></div>'+
    statBlocks([['License revenue',cash(sumValues(series.revenue)),'Paid license fees · Sample'],['Preview starts',formatCount(sumValues(series.plays)),'Full-length beat previews'],['Licenses sold',formatCount(sumValues(series.orders)),'Across all fixed tiers'],['Favorites',formatCount(sumValues(series.favorites)),'Saved by listeners · Sample']])+
    '<div class="dashboard-charts">'+sampleChartPanel()+genreChart()+'</div><div class="dashboard-bottom">'+topBeatList()+'<section class="workspace-panel next-actions"><div class="panel-heading"><h2>Manage your store</h2></div><a href="#studio-catalog"><span>'+icon('disc',20)+'</span><div>Manage your catalog<small>'+tracks.length+' beats in your library</small></div>'+icon('arrow',18)+'</a><a href="#studio-offers"><span>'+icon('inbox',20)+'</span><div>Review custom offers<small>'+offers.filter(item=>item.status==='Offer received').length+' offers awaiting your review</small></div>'+icon('arrow',18)+'</a><a href="#studio-payments"><span>'+icon('wallet',20)+'</span><div>Track payments<small>Review sample transaction records</small></div>'+icon('arrow',18)+'</a></section></div>';
}
function studioCatalog() {
  return '<div class="workspace-title"><div><h1>Beat library</h1><p>Your audio, artwork and release details in one place.</p></div><button class="btn" data-action="edit">'+icon('plus',18)+' Upload beat</button></div><div class="library-toolbar"><label class="search-field">'+icon('search',19)+'<input type="search" id="studio-search" aria-label="Search seller beats" value="'+escapeHTML(studioQuery)+'" placeholder="Search your beats…"></label><select class="sort" id="studio-status" aria-label="Beat status filter">'+['All','Published','Draft'].map(status=>'<option '+(studioStatus===status?'selected':'')+'>'+status+'</option>').join('')+'</select></div><div id="studio-library-results">'+libraryTable()+'</div>';
}
function libraryTable() {
  const list=tracks.filter(track=>(studioStatus==='All'||track.status===studioStatus)&&[track.title,track.genre,...track.tags].join(' ').toLowerCase().includes(studioQuery.trim().toLowerCase())).sort((a,b)=>b.created-a.created);
  return list.length?table(['Beat','Category','Files','Status',''],list.map(track=>[
    '<div class="track-title">'+cover(track)+'<div class="track-name"><b>'+escapeHTML(track.title)+'</b><small>'+track.bpm+' BPM · '+escapeHTML(track.key||'Key pending')+'</small></div></div>',
    escapeHTML(track.genre),
    track.demo?'MP3 · WAV · Stems':['mp3','wav','stems'].filter(key=>track.files[key]).map(key=>key==='stems'?'Stems':key.toUpperCase()).join(' · ')||'—',
    '<span class="status-pill '+(track.status==='Published'?'positive':'')+'">'+track.status+'</span>',
    '<button class="text-link" data-action="edit" data-id="'+escapeHTML(track.id)+'" aria-label="Edit '+escapeHTML(track.title)+'">Edit beat '+icon('edit',15)+'</button>'
  ])):empty('No beats found','Try another title or status.','<button class="btn secondary" data-action="clear-library">Clear filters</button>');
}
function localAnalytics() {
  const totals=key=>sumValues(Object.values(metrics).map(item=>item[key]||0));
  const ranked=tracks.map(track=>({track,value:metrics[track.id]?.plays||0})).sort((a,b)=>b.value-a.value).slice(0,5);
  const maximum=Math.max(1,...ranked.map(item=>item.value));
  return '<div class="workspace-title"><div><h1>Beat analytics</h1><p>Activity from this browser, as you test the store.</p></div><a href="#store" class="btn secondary">Try the storefront '+icon('arrow',18)+'</a></div><div class="data-context"><span class="status-dot"></span><span>Local activity</span><span>Since this browser first opened JT</span></div>'+
    statBlocks([['Preview starts',formatCount(totals('plays')),'Counted when a new beat starts'],['Current favorites',formatCount(totals('favorites')),'Saved in this browser'],['Cart additions',formatCount(totals('cart')),'Includes repeat additions']])+
    '<section class="chart-panel local-chart"><div class="panel-heading"><h2>Most played beats</h2><span class="muted">Preview starts</span></div>'+(ranked.some(item=>item.value)?'<div class="local-bars">'+ranked.map(({track,value})=>'<div class="local-bar"><span>'+escapeHTML(track.title)+'</span><div class="bar-track"><span style="--bar-scale:'+value/maximum+'"></span></div><strong>'+value+'</strong></div>').join('')+'</div>':empty('Your first play is waiting','Start a preview in the storefront to see activity here.'))+'</section><section class="workspace-panel"><div class="panel-heading"><h2>Every beat</h2></div>'+table(['Beat','Preview starts','Current favorites','Cart additions'],tracks.map(track=>[escapeHTML(track.title),...['plays','favorites','cart'].map(key=>metrics[track.id]?.[key]||0)]))+'</section>';
}
function paymentView() { return livePaymentView(); }
function showStudio(current) {
  let content;
  if(current==='studio-catalog')content=studioCatalog();
  else if(current==='studio-stats')content=localAnalytics();
  else if(current==='studio-payments')content=livePaymentView();
  else if(current==='studio-feature')content=featureView();
  else if(current==='studio-licenses')content=sellerLicenseView()+licenseProposalReview();
  else if(current==='studio-offers')content='<div class="workspace-title"><div><h1>Custom offers</h1><p>Review the price and splits, then agree on the next revision.</p></div>'+notificationAction('offers')+'</div>'+sellerOffers();
  else content=studioOverview();
  nav('<div class="studio-layout">'+studioNavigation(current)+'<section class="workspace">'+content+'<p class="workspace-disclosure">Local seller preview. Production access requires seller sign-in.</p></section></div>');
}
const journalEntries = [
  {id:'mp3-wav-stems',title:'MP3, WAV or stems?',category:'In the session',intro:'Choose the files that fit the way you record.',cover:3,
    paragraphs:['An MP3 is a compact audio file that makes listening and writing easy. Compare the current license options for each beat to check exactly which files are included.',
      'A WAV gives you an uncompressed stereo file for your recording session. Stems separate the beat into groups or individual parts, which gives your engineer more room to balance vocals, drums and instruments.',
      'Choose your delivery files before adding the beat to the cart. You can change your license from the cart and review the updated agreement before the demo checkout finishes.']},
  {id:'find-your-pocket',title:'Finding your pocket in a beat',category:'Writing room',intro:'A few ways to turn a first listen into a writing session.',cover:8,
    paragraphs:['Start with a full listen before you write. Notice the space between the drums, the melody and the bass. A sparse section can leave room for a hook, while a denser one might change how you deliver a verse.',
      'Save beats that suggest a melody or a rhythm immediately. Your favorites keep those ideas together while you move between R&B, Afro and Trap beats.',
      'Try a few phrases at the beat’s tempo. Leave space, repeat the strongest idea, and listen again. A beat can feel different when you stop trying to fill every bar.']},
  {id:'custom-license',title:'Before you make a custom offer',category:'Release planning',intro:'Bring a clear idea of your release to the conversation.',cover:11,
    paragraphs:['A custom conversation starts with the beat, a proposed price, and the publishing and master royalty shares you want to discuss. Add notes about the release and the files your team needs.',
      'JT’s Custom License is offer based. In this prototype, both the buyer and seller can review a proposed price and splits. An offer marked as agreed can be added to the cart for a draft agreement review.',
      'Price and splits are only part of a license. Usage rights, territory, duration, delivery files and the remaining legal terms must be confirmed, with review by a qualified lawyer in the applicable jurisdiction.']}
];
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


