// Customer beat pages and local visual cart feedback; no purchase integrations.
let previousBeatRoute='';
let beatReturn={hash:'#store',scroll:0,id:''};
let beatReturnPending=false;
let beatTransitionTimer;
let cartFlight;
let cartFlightAnimation;
const prefersQuietMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;

function beatPageLink(track){
  return '<a href="#beat-'+encodeURIComponent(track.id)+'" data-beat-link="'+escapeHTML(track.id)+'" aria-label="View '+escapeHTML(track.title)+' beat details">'+escapeHTML(track.title)+'</a>';
}
function showBeatPage(encodedId){
  let id;
  try{id=decodeURIComponent(encodedId);}catch{id='';}
  const track=beat(id);
  if(!track||track.status!=='Published'){
    nav(page('Beat unavailable','',empty('This beat is not available','Return to the store to find another beat.','<a class="btn" href="#store">Browse beats</a>')));
    return;
  }
  const selected=cartRows().find(item=>item.beatId===id);
  const files=[...new Set(tiers.filter(item=>item.price&&available(track,item.id)).flatMap(item=>item.delivery))];
  const packageText=files.length?files.map(file=>file==='stems'?'Stems':file.toUpperCase()).join(' · '):'Custom package by agreement';
  const prices=tiers.filter(item=>item.price&&available(track,item.id)).map(item=>item.price);
  nav('<section class="shell page beat-page" aria-labelledby="beat-title"><div class="beat-page-top"><a href="'+escapeHTML(beatReturn.hash)+'" class="text-link" data-action="close-beat">'+icon('back',17)+' Back to beats</a><button type="button" class="icon-btn beat-page-close" data-action="close-beat" aria-label="Close beat details" title="Close beat details">'+icon('x',23)+'</button></div><div class="beat-overview"><div class="beat-artwork"><img src="'+artURL(track)+'" alt="Cover artwork for '+escapeHTML(track.title)+'" width="480" height="480"></div><div class="beat-information"><p class="section-label">'+escapeHTML(track.genre)+'</p><h1 id="beat-title">'+escapeHTML(track.title)+'</h1><p class="beat-producer">Produced by Joel Tracks</p><dl class="beat-facts"><div><dt>Tempo</dt><dd>'+track.bpm+' BPM</dd></div><div><dt>Key</dt><dd>'+escapeHTML(track.key||'Not specified')+'</dd></div><div><dt>Length</dt><dd>'+clock(track.duration)+'</dd></div></dl><div class="tags beat-page-tags" aria-label="Beat tags">'+track.tags.map(tagButton).join('')+'</div><div class="beat-listening-actions"><button class="btn secondary" data-action="play" data-id="'+escapeHTML(id)+'" data-beat-preview aria-label="Play '+escapeHTML(track.title)+'">'+icon('play',18)+'<span>Play beat</span></button>'+buttonIcon('heart',(favorites.has(id)?'Remove from favorites: ':'Favorite ')+track.title,'favorite',id,favorites.has(id))+'</div><div class="beat-purchase-panel"><div><span>'+(selected?escapeHTML(cartLicense(selected).name):'Licenses from')+'</span><strong>'+(selected?cash(cartLicense(selected).price):prices.length?cash(Math.min(...prices)):'Let’s talk')+'</strong></div><button class="btn" data-beat-cart data-action="'+(selected?'remove':prices.length?'choose':'offer')+'" data-id="'+escapeHTML(id)+'">'+icon(selected?'x':'plus',18)+(selected?'Remove from cart':prices.length?'Add to cart':'Make an offer')+'</button></div><p class="beat-files">Available packages: '+escapeHTML(packageText)+'. Select a license below for its files and terms.</p></div></div><section class="beat-license-options" aria-labelledby="beat-license-title"><div class="store-section-heading"><div><p class="section-label">Make it yours</p><h2 id="beat-license-title">Choose your license</h2></div><a href="#cart" class="text-link">View cart '+icon('cart',17)+'</a></div>'+referenceLicenseCards(id)+'<p class="license-review-note">Review the agreement in checkout before proceeding. These contract drafts require review by a qualified lawyer in the applicable jurisdiction.</p></section></section>');
}
document.addEventListener('click',event=>{
  const link=event.target.closest('[data-beat-link]');
  if(!link||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  if(!route().startsWith('beat-'))beatReturn={hash:location.hash||'#store',scroll:window.scrollY,id:link.dataset.beatLink};
});
function closeBeatPage(){
  beatReturnPending=true;
  location.hash=beatReturn.hash;
}
document.addEventListener('click',event=>{
  if(event.target.closest('a[data-action="close-beat"]'))event.preventDefault();
});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&route().startsWith('beat-')&&!modal.open){event.preventDefault();closeBeatPage();}
});
function clearBeatTransition(){
  clearTimeout(beatTransitionTimer);
  const live=main.querySelector(':scope > .t-page.is-current');
  if(live){
    const focused=live.contains(document.activeElement)?document.activeElement:null;
    main.replaceChildren(...live.childNodes);
    focused?.focus({preventScroll:true});
  }
  main.classList.remove('t-page-slide');
  main.removeAttribute('data-page');
}
function prepareBeatTransition(next){
  clearBeatTransition();
  const before=previousBeatRoute;
  previousBeatRoute=next;
  const from=before.startsWith('beat-')?'2':'1';
  const to=next.startsWith('beat-')?'2':'1';
  if(!before||from===to||prefersQuietMotion())return null;
  const outgoing=document.createElement('section');
  outgoing.className='t-page';outgoing.dataset.pageId=from;
  outgoing.setAttribute('aria-hidden','true');outgoing.inert=true;
  for(const child of main.children)outgoing.append(child.cloneNode(true));
  outgoing.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));
  return {outgoing,from,to};
}
function finishBeatTransition(state){
  if(state){
    const incoming=document.createElement('section');
    incoming.className='t-page is-current';incoming.dataset.pageId=state.to;
    incoming.append(...main.childNodes);
    main.classList.add('t-page-slide');main.dataset.page=state.from;
    main.append(state.outgoing,incoming);
    void main.offsetWidth;
    main.dataset.page=state.to;
    const duration=parseFloat(getComputedStyle(main).getPropertyValue('--page-slide-dur'))||250;
    beatTransitionTimer=setTimeout(clearBeatTransition,duration+30);
  }
  if(beatReturnPending){
    beatReturnPending=false;
    window.scrollTo({top:beatReturn.scroll,behavior:'instant'});
    (main.querySelector(':scope > .t-page.is-current')||main).querySelector('[data-beat-link="'+CSS.escape(beatReturn.id)+'"]')?.focus({preventScroll:true});
  }
}
function captureCartOrigin(id){
  const track=beat(id);
  const image=modal.open?modal.querySelector('.license-beat img'):main.querySelector('.beat-artwork img')||main.querySelector('[data-track="'+CSS.escape(id)+'"] img');
  const imageBox=image?.getBoundingClientRect();
  const visibleImage=imageBox&&imageBox.top<innerHeight&&imageBox.bottom>0;
  const element=visibleImage?image:document.activeElement;
  const box=element?.getBoundingClientRect();
  return {src:image?.src,from:box?{x:box.left+box.width/2,y:box.top+box.height/2}:null,title:track?.title};
}
function clearCartFlight(){
  cartFlightAnimation?.cancel();cartFlightAnimation=undefined;
  cartFlight?.remove();cartFlight=undefined;
}
document.addEventListener('jt:render',clearCartFlight);
document.addEventListener('jt:cart-add',event=>{
  clearCartFlight();
  const cartIcon=document.querySelector('.cart-link > svg');
  if(!cartIcon||prefersQuietMotion())return;
  const target=cartIcon.getBoundingClientRect();
  const end={x:target.left+target.width/2,y:target.top+target.height/2};
  const origin=event.detail.from||{x:end.x-30,y:end.y+60};
  const start={x:Math.max(24,Math.min(innerWidth-24,origin.x)),y:Math.max(40,Math.min(innerHeight-40,origin.y))};
  const chip=document.createElement('span');
  chip.className='cart-flight';chip.setAttribute('aria-hidden','true');
  if(event.detail.src){const img=document.createElement('img');img.src=event.detail.src;img.alt='';chip.append(img);}
  else chip.innerHTML=icon('disc',24);
  document.body.append(chip);cartFlight=chip;
  const duration=parseFloat(getComputedStyle(chip).getPropertyValue('--cart-flight-duration'))||560;
  const transform=(x,y,scale)=>'translate3d('+x+'px,'+y+'px,0) translate(-50%,-50%) scale('+scale+')';
  cartFlightAnimation=chip.animate([
    {offset:0,opacity:0,transform:transform(start.x,start.y,.8)},
    {offset:.12,opacity:1,transform:transform(start.x,start.y-16,1)},
    {offset:.72,opacity:.9,transform:transform(end.x,end.y-30,.5)},
    {offset:1,opacity:0,transform:transform(end.x,end.y+6,.15)}
  ],{duration,easing:'cubic-bezier(.22,.6,.36,1)',fill:'both'});
  const bounce=cartIcon.animate([{transform:'translateY(0)'},{transform:'translateY(3px)',offset:.7},{transform:'translateY(0)'}],{duration:240,delay:duration-130,easing:'ease-out'});
  cartFlightAnimation.finished.then(()=>{chip.remove();if(cartFlight===chip)cartFlight=undefined;},()=>chip.remove());
  bounce.finished.catch(()=>{});
});
