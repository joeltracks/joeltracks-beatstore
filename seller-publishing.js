// Publish saved, verified snapshots. Uploading or saving alone never publishes.
let sellerPublicationBusy='';
const sellerPublicationMessages=new Map();
function sellerPublicationControls(beat){
  const publication=beat.publication,live=publication?.isPublished===true;
  const pending=beat.assets.some(asset=>['initializing','uploading','verifying'].includes(asset.status));
  const busy=Boolean(sellerPublicationBusy)||uploadRun.active||sellerQueuedFiles.size>0;
  const canPublish=sellerBeatData.publishingAvailable===true&&beat.fileAvailability.mp3===true&&!pending;
  const disabled=busy||!canPublish||(live&&!publication.needsUpdate);
  const reason=pending?'Finish or cancel incomplete uploads before publishing.':!beat.fileAvailability.mp3?'A verified MP3 is needed to publish. Upload a WAV to generate it automatically.':live&&publication.needsUpdate?'Your saved draft has changes. Update storefront when they are ready.':live?'The published version is live. Saving further changes keeps them private until you update the storefront.':'Publish makes the saved beat, full-length MP3 preview and artwork visible in the store.';
  const id=escapeHTML(beat.id);
  return '<section class="seller-publication" aria-label="Storefront visibility for '+escapeHTML(beat.title)+'"><div><span class="status-pill">'+(live?'Published':'Private draft')+'</span><p class="access-help">'+escapeHTML(reason)+'</p></div><div class="publication-actions"><button type="button" class="btn small" data-publication-action="publish" data-id="'+id+'" '+(disabled?'disabled':'')+'>'+(live?'Update storefront':'Publish')+'</button>'+(live?'<button type="button" class="btn secondary small" data-publication-action="unpublish" data-id="'+id+'" '+(busy?'disabled':'')+'>Unpublish</button><a class="text-link" href="#beat-'+id+'">View in store '+icon('external',16)+'</a>':'')+'</div><p id="publication-status-'+id+'" class="form-status" role="status" aria-live="polite">'+escapeHTML(sellerPublicationMessages.get(beat.id)||'')+'</p></section>';
}
async function refreshPublishedCatalog(){
  const result=await accessAPI('catalog');
  if(result.settings&&typeof applyStoreSettings==='function')applyStoreSettings(result.settings);
  tracks=Array.isArray(result.beats)?result.beats.filter(track=>track.status==='Published'&&!track.demo):[];
  catalogStatus=tracks.length?'ready':'empty';removeUnavailableCartItems();
  if(activeTrack&&!tracks.some(track=>track.id===activeTrack)){audio.pause();audio.removeAttribute('src');sourceURL='';activeTrack='';}
}
document.addEventListener('click',async event=>{
  const button=event.target.closest('[data-publication-action]');if(!button)return;
  const {id,publicationAction:action}=button.dataset;
  if(!['publish','unpublish'].includes(action))return;
  if(sellerPublicationBusy||uploadRun.active||sellerQueuedFiles.size){
    const status=document.getElementById('publication-status-'+id);if(status)status.textContent='Finish the queued uploads before changing storefront visibility.';return;
  }
  sellerPublicationBusy=id;
  const message=action==='publish'?'Checking verified files and publishing…':'Removing this beat from the storefront…';
  sellerPublicationMessages.set(id,message);
  document.querySelectorAll('[data-publication-action]').forEach(control=>{if(!control.disabled){control.dataset.publicationDisabled='1';control.disabled=true;}});
  const status=document.getElementById('publication-status-'+id);if(status)status.textContent=message;
  try{
    await sellerAPI('beats/'+id+'/'+action,{});
    const done=action==='publish'?'Published. This version is now visible in the storefront.':'Unpublished. New catalog and preview requests no longer show this beat. Existing preview links may work for up to 10 minutes.';
    sellerPublicationMessages.set(id,done);if(status)status.textContent=done;
    try{await refreshPublishedCatalog();}catch{sellerPublicationMessages.set(id,done+' Reload the storefront to refresh its list.');}
  }catch(error){sellerPublicationMessages.set(id,error.message);if(status)status.textContent=error.message;}
  finally{
    sellerPublicationBusy='';await loadSellerBeats({preserveEditor:true});
    document.querySelectorAll('[data-publication-action][data-publication-disabled]').forEach(control=>{control.disabled=false;delete control.dataset.publicationDisabled;});
    if(sellerBeatError){const status=document.getElementById('publication-status-'+id);if(status)status.textContent=(sellerPublicationMessages.get(id)||'')+' Dashboard status could not refresh. Reload the saved-beat list.';}
    const form=document.getElementById('seller-beat-form');if(sellerQueuedFiles.size&&form)scheduleSellerFiles(form);
  }
});
