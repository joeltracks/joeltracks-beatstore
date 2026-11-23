// Frontend-only seller settings, notifications and sale simulation.
let purchaseQuery='';
function hydrateLicenses(saved) {
  const delivery={basic:['mp3'],premium:['mp3','wav'],unlimited:['mp3','wav','stems'],custom:[]};
  for(const item of tiers){
    const candidate=saved[item.id]||{};
    const defaults=dashboardLicenseDefaults(item.id);
    const suppliedDefaults=['grant','limits','terms'].some(key=>typeof candidate[key]==='string'&&!candidate[key].trim())&&!candidate.usageDefaultsVersion;
    Object.assign(item,{publishing:50,major:90,indie:70,...defaults,version:1,delivery:delivery[item.id],usageDefaultsVersion:1});
    if(item.id!=='custom'&&Number.isFinite(candidate.price)&&candidate.price>0)item.price=candidate.price;
    for(const key of ['publishing','major','indie'])if(Number.isFinite(candidate[key])&&candidate[key]>=0&&candidate[key]<=100)item[key]=candidate[key];
    for(const key of ['grant','limits','terms'])if(typeof candidate[key]==='string'&&(candidate[key].trim()||candidate.usageDefaultsVersion))item[key]=candidate[key];
    if(Number.isInteger(candidate.version)&&candidate.version>0)item.version=candidate.version;
    if(suppliedDefaults)item.version++;
    if(Array.isArray(candidate.delivery)&&candidate.delivery.length&&candidate.delivery.every(file=>['mp3','wav','stems'].includes(file)))item.delivery=[...new Set(candidate.delivery)];
    item.files=item.id==='custom'?'Negotiated':item.delivery.map(file=>file==='stems'?'Stems':file.toUpperCase()).join(' + ');
  }
}
function publicSplits(){
  return tiers.filter(item=>item.id!=='custom').map(item=>escapeHTML(item.name)+': publishing '+item.publishing+'% artist / '+remainingShare(item.publishing)+'% JT. Master royalties '+item.major+'% artist / '+remainingShare(item.major)+'% JT for major-label artists, and '+item.indie+'% artist / '+remainingShare(item.indie)+'% JT for smaller indie artists.').join('<br><br>');
}
function startingPrice(){return cash(Math.min(...tiers.filter(item=>item.price).map(item=>item.price)));}
function unreadEvents(kind){
  const events=kind==='offers'?offers:demoSales;
  return events.filter(item=>!(seenEvents[kind]||[]).includes(item.id));
}
function notificationBadge(routeId){
  const kind=routeId==='studio-offers'?'offers':routeId==='studio-payments'?'payments':null;
  const count=kind?unreadEvents(kind).length:0;
  return count?'<span class="side-count" aria-label="'+count+' unread '+(kind==='offers'?(count===1?'offer':'offers'):(count===1?'sale notification':'sale notifications'))+'">'+count+'</span>':'';
}
function notificationAction(kind){
  const count=unreadEvents(kind).length;
  return '<div class="notification-action"><span role="status">'+count+' unread</span>'+(count?'<button class="text-link" data-action="mark-read" data-id="'+kind+'">Mark all as read '+icon('check',16)+'</button>':'')+'</div>';
}
function featureView(){
  const chosen=tracks.find(track=>track.id===featureSettings.beatId&&track.status==='Published');
  return '<div class="workspace-title"><div><h1>Featured beat</h1><p>Choose the beat and label shown at the top of your store.</p></div><a class="text-link" href="#store">View storefront '+icon('external',16)+'</a></div><div class="settings-layout"><form id="feature-form" class="workspace-panel settings-form"><h2>Storefront spotlight</h2><label class="field">Featured beat<select name="beatId" required>'+tracks.filter(track=>track.status==='Published').map(track=>'<option value="'+escapeHTML(track.id)+'" '+(track.id===featureSettings.beatId?'selected':'')+'>'+escapeHTML(track.title)+' · '+escapeHTML(track.genre)+'</option>').join('')+'</select></label><label class="field">Feature label<select name="label">'+['Featured beat','Beat of the month','Top played','Top seller'].map(label=>'<option '+(featureSettings.label===label?'selected':'')+'>'+label+'</option>').join('')+'</select></label><p class="demo-note">Labels are selected by you. “Top played” and “Top seller” do not create or verify a ranking.</p><button class="btn" type="submit">Save featured beat '+icon('check',18)+'</button><p role="status" id="feature-status"></p></form><aside class="spotlight-preview"><span class="section-label">Current storefront feature</span>'+(chosen?'<img src="'+artURL(chosen)+'" width="360" height="360" alt="Cover for '+escapeHTML(chosen.title)+'"><span class="subtle-label">'+escapeHTML(featureSettings.label)+'</span><h2>'+escapeHTML(chosen.title)+'</h2>':'<p>Select a published beat to replace the current fallback.</p>')+'</aside></div>';
}
function sellerLicenseView(){
  return '<div class="workspace-title"><div><h1>Licenses</h1><p>Update prices, files and the terms buyers review.</p></div><a class="text-link" href="#licenses">View license comparison '+icon('external',16)+'</a></div><p class="settings-notice">Local draft settings. Saved changes update this prototype’s storefront, cart and agreement preview. Contract drafts still require review by a qualified lawyer in the applicable jurisdiction.</p><div class="license-settings-list">'+tiers.map(item=>'<article class="workspace-panel license-setting"><div><span class="subtle-label">Draft version '+item.version+'</span><h2>'+escapeHTML(item.name)+'</h2><p>'+escapeHTML(item.files)+'</p></div><strong>'+(item.price?cash(item.price):'Offer based')+'</strong><button class="btn secondary" data-action="edit-license" data-id="'+item.id+'">Edit license '+icon('edit',17)+'</button></article>').join('')+'</div>';
}
function editLicense(id){
  const item=tier(id);
  if(!item)return;
  const num=(key,label,max)=>'<label class="field">'+label+'<input name="'+key+'" type="number" min="'+(key==='price'?'.01':'0')+'" max="'+max+'" step=".01" value="'+item[key]+'" required></label>';
  const textarea=(key,label)=>'<label class="field wide">'+label+'<textarea name="'+key+'" maxlength="4000" rows="3" placeholder="Pending confirmation">'+escapeHTML(item[key])+'</textarea></label>';
  showDialog('Edit '+escapeHTML(item.name),'Save a new local draft version. Buyers must review updated terms.', '<form id="license-form" data-id="'+id+'" data-version="'+item.version+'" class="field-grid">'+(id!=='custom'?num('price','License price (USD)',1000000)+'<fieldset class="delivery-options wide"><legend>Delivery files</legend>'+['mp3','wav','stems'].map(file=>'<label><input type="checkbox" name="delivery" value="'+file+'" '+(item.delivery.includes(file)?'checked':'')+'> '+(file==='stems'?'Stems':file.toUpperCase())+'</label>').join('')+'</fieldset>'+num('publishing','Artist publishing share (%)',100)+num('major','Major-label artist master share (%)',100)+num('indie','Smaller indie artist master share (%)',100)+'<p class="demo-note wide">JT receives the remainder of each split. The customer checkout shows both master schedules; eligibility and revenue basis remain pending.</p>':'<p class="demo-note wide">Price, delivery and splits remain offer based. These notes accompany each negotiated draft.</p>')+textarea('grant','Grant and permitted uses')+textarea('limits','Duration, territory and usage limits')+textarea('terms','Additional terms')+'<p class="form-error wide" role="alert" id="license-error"></p><div class="modal-actions wide"><button type="button" class="btn secondary" data-action="close">Cancel</button><button class="btn" type="submit">Save license draft '+icon('check',18)+'</button></div></form>');
}
function paymentRecords(){return [...mockPayments,...demoSales];}
function beatPurchaseCounts(records=paymentRecords(),catalog=tracks){
  const rows=new Map(catalog.map(track=>['id:'+track.id,{id:track.id,title:track.title,count:0,legacy:false}]));
  for(const record of records){
    if(record.status!=='Paid')continue;
    const matches=record.beatId?[]:catalog.filter(track=>track.title===record.track);
    const id=record.beatId||(matches.length===1?matches[0].id:null);
    const key=id?'id:'+id:'legacy:'+record.track;
    if(!rows.has(key))rows.set(key,{id,title:record.track,count:0,legacy:!id});
    rows.get(key).count++;
  }
  return [...rows.values()].filter(item=>item.count>0).sort((a,b)=>b.count-a.count||a.title.localeCompare(b.title));
}
function purchaseTallyTable(){
  const query=purchaseQuery.trim().toLowerCase();
  const sold=beatPurchaseCounts();
  if(!sold.length)return empty('No recorded sales yet','Beats appear here after their first paid sale.');
  const rows=sold.filter(item=>item.title.toLowerCase().includes(query));
  return rows.length?table(['Beat','Paid purchases'],rows.map(item=>[
    '<b>'+escapeHTML(item.title)+'</b>'+(item.legacy?'<small class="table-sub">Older record · beat ID unavailable</small>':''),item.count
  ])):empty('No matching beats','Try another beat name.');
}
function purchaseTally(){
  return '<section class="workspace-panel purchase-tally" aria-labelledby="purchase-tally-title"><div class="panel-heading"><div><h2 id="purchase-tally-title">Purchases by beat</h2><p>One count per paid transaction. Pending and refunded records are excluded.</p></div><label class="search-field">'+icon('search',19)+'<input id="purchase-search" type="search" aria-label="Search purchases by beat" placeholder="Find a beat…" value="'+escapeHTML(purchaseQuery)+'"></label></div><div id="purchase-tally-results">'+purchaseTallyTable()+'</div></section>';
}
function livePaymentView(){
  const records=paymentRecords();
  const groups=['Paid','Pending','Refunded'].map((status,index)=>({status,color:['#6ce4d4','#ffc48a','#bba9ef'][index],value:records.filter(item=>item.status===status).reduce((sum,item)=>sum+item.amount,0)}));
  const totalAmount=groups.reduce((sum,item)=>sum+item.value,0);
  let offset=0;
  const rings=groups.map(item=>{
    const share=totalAmount?item.value/totalAmount*100:0;
    const ring='<circle class="payment-arc" cx="128" cy="128" r="92" fill="none" stroke="'+item.color+'" stroke-width="24" pathLength="100" stroke-dasharray="'+share+' '+(100-share)+'" stroke-dashoffset="'+(-offset)+'" transform="rotate(-90 128 128)"/>';
    offset+=share;return ring;
  }).join('');
  return '<div class="workspace-title"><div><h1>Payments</h1><p>See payment status and new sale notifications.</p></div><button class="btn secondary" data-action="demo-sale">'+icon('plus',18)+' Simulate a sale</button></div><div class="data-context"><span class="status-dot"></span><span>Sample records + local demo sales</span></div><section class="chart-panel payment-summary"><div class="panel-heading"><div><h2>Payment breakdown</h2><p>Amounts in USD · Updates after a simulated sale</p></div>'+notificationAction('payments')+'</div><div class="payment-chart-layout"><div class="payment-donut"><svg viewBox="0 0 256 256" role="img" aria-label="Payment amounts by status. Paid '+cash(groups[0].value)+', pending '+cash(groups[1].value)+', refunded '+cash(groups[2].value)+'."><circle cx="128" cy="128" r="92" fill="none" stroke="var(--soft)" stroke-width="24"/>'+rings+'</svg><div><span>Paid</span><strong>'+cash(groups[0].value)+'</strong><small>'+records.filter(item=>item.status==='Paid').length+(records.filter(item=>item.status==='Paid').length===1?' demo sale':' demo sales')+'</small></div></div><dl class="payment-legend">'+groups.map(item=>'<div><dt><i style="background:'+item.color+'"></i>'+item.status+'</dt><dd>'+cash(item.value)+'<small>'+(totalAmount?Math.round(item.value/totalAmount*100):0)+'% of recorded amount</small></dd></div>').join('')+'</dl></div></section>'+purchaseTally()+'<section class="workspace-panel"><div class="panel-heading"><h2>Recent transactions</h2><span class="muted">USD</span></div>'+table(['Order','Beat / license','Amount','Status'],records.slice().reverse().map(item=>[(item.id&&unreadEvents('payments').some(event=>event.id===item.id)?'<span class="new-event">New sale</span> ':'')+escapeHTML(item.ref),'<b>'+escapeHTML(item.track)+'</b><small class="table-sub">'+escapeHTML(item.license)+'</small>',cash(item.amount),'<span class="status-pill '+(item.status==='Paid'?'positive':'')+'">'+item.status+'</span>']))+'</section><p class="demo-note">Simulation only. No payment is processed, no real sale is recorded and no license is activated.</p>';
}
function showSaleSimulator(){
  showDialog('Simulate a sale','Test the payment chart and notification counter locally.', '<form id="sale-form" class="field-grid"><label class="field wide">Beat<select name="beatId" required>'+tracks.filter(track=>track.status==='Published').map(track=>'<option value="'+escapeHTML(track.id)+'">'+escapeHTML(track.title)+'</option>').join('')+'</select></label><label class="field wide">License<select name="tierId">'+tiers.filter(item=>item.price).map(item=>'<option value="'+item.id+'">'+escapeHTML(item.name)+' · '+cash(item.price)+'</option>').join('')+'</select></label><p class="demo-note wide">Adds one paid sample record in this browser. It does not take payment or complete checkout.</p><button class="btn wide" type="submit">Add simulated sale</button></form>');
}
document.addEventListener('submit',event=>{
  const form=event.target;
  if(!['feature-form','license-form','sale-form'].includes(form.id))return;
  event.preventDefault();
  const data=new FormData(form);
  if(form.id==='feature-form'){
    if(!beat(data.get('beatId'))||beat(data.get('beatId')).status!=='Published')return;
    featureSettings={beatId:data.get('beatId'),label:data.get('label')};
    save('feature',featureSettings);renderRoute();$('#feature-form button[type="submit"]')?.focus({preventScroll:true});announce('Storefront feature updated in this browser.');
  }
  if(form.id==='license-form'){
    const item=tier(form.dataset.id);
    if(Number(form.dataset.version)!==item.version){$('#license-error').textContent='This license changed in another tab. Close and reopen the editor to review the latest version.';return;}
    const delivery=data.getAll('delivery');
    if(item.id!=='custom'&&!delivery.length){$('#license-error').textContent='Select at least one delivery file.';return;}
    if(item.id!=='custom'){
      for(const key of ['price','publishing','major','indie'])item[key]=Number(data.get(key));
      item.delivery=delivery;item.files=delivery.map(file=>file==='stems'?'Stems':file.toUpperCase()).join(' + ');
    }
    for(const key of ['grant','limits','terms'])item[key]=data.get(key).trim();
    item.version++;
    save('license-settings',Object.fromEntries(tiers.map(license=>[license.id,license])));
    agreementsReviewed=false;modal.close();renderRoute();$('[data-action="edit-license"][data-id="'+item.id+'"]')?.focus({preventScroll:true});announce('License draft saved. Updated carts require a new review.');
  }
  if(form.id==='sale-form'){
    const track=beat(data.get('beatId'));const license=tier(data.get('tierId'));
    if(!track||!license?.price)return;
    const id=crypto.randomUUID?.()||String(Date.now());
    demoSales.push({id,ref:'JT-SIM-'+id.slice(0,8).toUpperCase(),beatId:track.id,track:track.title,license:license.name,amount:license.price,status:'Paid',created:Date.now()});
    save('demo-sales',demoSales);modal.close();renderRoute();$('[data-action="demo-sale"]')?.focus({preventScroll:true});announce('Simulated sale added. Payment chart and notification updated.');
  }
});
document.addEventListener('click',event=>{
  const control=event.target.closest('[data-action]');if(!control)return;
  if(control.dataset.action==='edit-license')editLicense(control.dataset.id);
  if(control.dataset.action==='demo-sale')showSaleSimulator();
  if(control.dataset.action==='mark-read'){
    const kind=control.dataset.id;
    if(!['offers','payments'].includes(kind))return;
    seenEvents[kind]=(kind==='offers'?offers:demoSales).map(item=>item.id);
    save('seen-events',seenEvents);renderRoute();main.focus({preventScroll:true});announce('Notifications marked as read.');
  }
});
document.addEventListener('input',event=>{
  if(event.target.id!=='purchase-search')return;
  purchaseQuery=event.target.value;
  document.querySelector('#purchase-tally-results').innerHTML=purchaseTallyTable();
});
// Other tabs at this origin can demonstrate live offer/sale updates without a backend.
window.addEventListener('storage',event=>{
  if(!['jt:offers','jt:demo-sales','jt:seen-events','jt:license-settings','jt:feature'].includes(event.key))return;
  if(event.key==='jt:offers')offers=read('offers',[]);
  if(event.key==='jt:demo-sales')demoSales=read('demo-sales',[]);
  if(event.key==='jt:seen-events')seenEvents=read('seen-events',{offers:[],payments:[]});
  if(event.key==='jt:license-settings'){hydrateLicenses(read('license-settings',{}));agreementsReviewed=false;}
  if(event.key==='jt:feature')featureSettings=read('feature',{beatId:'demo-0',label:'Featured beat'});
  if(!modal.open)renderRoute();
  else pendingSellerRefresh=true;
});
