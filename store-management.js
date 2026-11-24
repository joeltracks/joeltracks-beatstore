// Public settings and anonymous action counts. No visitor identity or tracking cookie is stored.
function applyStoreSettings(settings){
  if(settings?.licenses){hydrateLicenses(settings.licenses);agreementsReviewed=false;}
  if(settings?.feature)featureSettings={beatId:settings.feature.beatId||'',label:settings.feature.label||'Featured beat'};
}
const recordedActions=new Map();
function recordStoreAction(beatId,kind){
  if(!beat(beatId)||route().startsWith('studio'))return;
  const key=beatId+':'+kind,now=Date.now();if(now-(recordedActions.get(key)||0)<30000)return;recordedActions.set(key,now);
  accessAPI('activity',{id:crypto.randomUUID(),beatId,kind}).catch(()=>{});
}
document.addEventListener('click',event=>{const button=event.target.closest('[data-action="favorite"]');if(button&&favorites.has(button.dataset.id))recordStoreAction(button.dataset.id,'favorite');});
function customOfferForm(id){
  const track=beat(id);if(!track){showDialog('Custom licensing','', '<p>Choose a published beat to make an offer, or email JT about your project.</p><a class="btn" href="'+emailLink('Custom license enquiry')+'">Email JT</a>');return;}
  const optional=(key,label)=>'<label class="field">'+label+'<input name="'+key+'" type="number" min="0" max="100" step=".01"><small>Optional · leave blank to negotiate.</small></label>';
  showDialog('Make an offer','Discuss a custom license for '+track.title,
    '<form id="custom-offer-form" data-id="'+escapeHTML(id)+'"><div class="field-grid"><label class="field">Artist / label name<input name="artist" required maxlength="100" autocomplete="name"></label><label class="field">Email<input name="email" type="email" required maxlength="254" autocomplete="email"></label><label class="field">Offer price (USD)<input name="price" type="number" min=".01" max="1000000" step=".01" required></label>'+optional('publishing','Artist publishing share (%)')+optional('master','Artist master share (%)')+'<label class="field wide">Release plans and requested terms<textarea name="terms" maxlength="4000" rows="5"></textarea></label></div><p class="access-help">This submits a negotiation proposal. It does not reserve the beat, accept a license or make a purchase.</p><button class="btn" type="submit">Send offer</button><p id="custom-offer-status" class="form-status" role="status"></p></form>');
}
document.addEventListener('submit',async event=>{
  const form=event.target;if(form.id!=='custom-offer-form')return;event.preventDefault();const data=new FormData(form),button=form.querySelector('button[type="submit"]'),status=document.getElementById('custom-offer-status');button.disabled=true;status.textContent='Submitting your offer…';
  const optional=k=>data.get(k)===''?null:Number(data.get(k));
  try{const result=await accessAPI('offers',{beatId:form.dataset.id,artist:data.get('artist'),email:data.get('email'),price:Number(data.get('price')),publishing:optional('publishing'),master:optional('master'),terms:data.get('terms')});status.textContent='Offer received. Reference: '+result.reference+'. JT can now review it. No payment or license has been created.';form.querySelectorAll('input,textarea').forEach(el=>el.disabled=true);button.textContent='Offer received';}
  catch(error){status.textContent=error.message;button.disabled=false;}
});
