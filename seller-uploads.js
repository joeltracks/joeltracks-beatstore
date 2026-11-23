// Private draft library and direct-to-R2 uploader. File bytes never enter the API.
let sellerBeatData=null,sellerBeatLoading=false,sellerEditingId='',sellerBeatsAttempted=false,sellerBeatError='';
const uploadRun={active:false,stopped:false,xhr:null,loaded:0,total:1,message:'',phase:'',fileIndex:0,fileCount:0,cancelConversion:null};
const fileLabels={mp3:'MP3',wav:'WAV',stems:'Stems ZIP',cover:'Thumbnail'};
const fileAccept={mp3:'.mp3,audio/mpeg',wav:'.wav,audio/wav',stems:'.zip,application/zip',cover:'.jpg,.jpeg,.png,.webp'};
const bytesLabel=n=>n>=1048576?(n/1048576).toFixed(1)+' MB':Math.ceil(n/1024)+' KB';
async function loadSellerBeats({preserveEditor=false}={}){
  if(sellerBeatLoading||sellerView.stage!=='ready')return;sellerBeatLoading=true;sellerBeatsAttempted=true;
  sellerBeatError='';
  try{sellerBeatData=await sellerAPI('beats');}
  catch(error){sellerBeatError=error.message;}
  finally{
    sellerBeatLoading=false;
    if(route()==='studio-catalog'&&sellerView.stage==='ready'){
      if((preserveEditor||sellerBeatError)&&document.getElementById('seller-beat-form')){
        if(sellerBeatData){
          const template=document.createElement('template');template.innerHTML=sellerLibraryContent();document.querySelector('.seller-draft-list')?.replaceWith(template.content.querySelector('.seller-draft-list'));
          const count=document.querySelector('[data-upload-action="library-list"]');if(count)count.textContent='Saved beats ('+sellerBeatData.beats.length+')';
        }
      }else{renderSellerWorkspace();afterRender();}
    }
  }
}
function uploadFeedback(){
  const el=document.getElementById('upload-progress');if(!el)return;
  if(!uploadRun.active&&!uploadRun.message){el.replaceChildren();delete el.dataset.layout;return;}
  const layout=String(uploadRun.active)+':'+uploadRun.phase;
  if(el.dataset.layout!==layout){
    el.dataset.layout=layout;
    el.innerHTML='<p data-upload-status role="status" aria-live="polite"></p>'+(uploadRun.active?'<div class="upload-progress-heading"><strong data-upload-phase></strong><span data-upload-percent></span></div><progress aria-label="File upload progress"></progress><p class="access-help" data-upload-detail></p>'+(uploadRun.phase==='verify'?'':'<button type="button" class="btn secondary" data-upload-action="pause">'+(uploadRun.phase==='convert'?'Cancel conversion':'Pause upload')+'</button>'):sellerBeatError?'<button type="button" class="btn secondary" data-upload-action="refresh">Reload saved beats</button>':'');
  }
  const status=el.querySelector('[data-upload-status]'),message=uploadRun.message+(sellerBeatError?' The saved-beat list could not refresh. Reload it to see the latest file status.':'');if(status.textContent!==message)status.textContent=message;
  const progress=el.querySelector('progress');if(progress){
    const determinate=['hash','convert','upload'].includes(uploadRun.phase),percent=Math.min(100,Math.floor(uploadRun.loaded/Math.max(1,uploadRun.total)*100));
    const label={prepare:'Preparing files',convert:'Converting WAV to MP3',hash:'Checking file',upload:'Uploading file',verify:'Verifying uploaded file'}[uploadRun.phase]||'Preparing files';
    progress.setAttribute('aria-label',label);progress.max=Math.max(1,uploadRun.total);
    if(determinate)progress.value=uploadRun.loaded;else progress.removeAttribute('value');
    el.querySelector('[data-upload-phase]').textContent=label;
    el.querySelector('[data-upload-percent]').textContent=determinate?percent+'%':uploadRun.phase==='verify'?'Checking…':'Please wait…';
    el.querySelector('[data-upload-detail]').textContent=(uploadRun.fileIndex?'File '+uploadRun.fileIndex+' of '+uploadRun.fileCount+' · ':'')+(uploadRun.phase==='upload'?bytesLabel(uploadRun.loaded)+' of '+bytesLabel(uploadRun.total):uploadRun.phase==='verify'?'Uploaded bytes are being checked. This file is not ready until verification finishes.':uploadRun.phase==='convert'?'Generating a full-length MP3. Your original WAV is kept unchanged.':'Keep this tab open.');
  }
}

function convertSellerWav(file){
  if(typeof Worker!=='function')throw new Error('This browser cannot convert WAV files. Use a current browser or upload an MP3 alongside your WAV.');
  uploadRun.phase='convert';uploadRun.loaded=0;uploadRun.total=file.size;uploadRun.message='Creating MP3 from '+file.name+'…';uploadFeedback();
  return new Promise((resolve,reject)=>{
    const worker=new Worker('/seller-audio-worker.js?v=20261123-audio1');
    const timer=setTimeout(()=>finish(new Error('Conversion took too long. Try again or upload an exported MP3.')),600000);
    let finished=false;
    function finish(error,blob){
      if(finished)return;finished=true;clearTimeout(timer);worker.terminate();uploadRun.cancelConversion=null;
      if(error)reject(error);else resolve(new File([blob],file.name.replace(/\.wav$/i,'')+'.mp3',{type:'audio/mpeg',lastModified:0}));
    }
    uploadRun.cancelConversion=()=>finish(new Error('Conversion cancelled. Your files are still selected; save again when ready.'));
    worker.onmessage=({data})=>{
      if(finished)return;
      if(data.type==='progress'){uploadRun.loaded=data.loaded;uploadRun.total=data.total;uploadFeedback();}
      else if(data.type==='complete')finish(null,data.blob);
      else if(data.type==='error')finish(new Error(data.message));
    };
    worker.onerror=()=>finish(new Error('MP3 conversion could not run. Try again or upload an exported MP3.'));
    worker.postMessage({file});
  });
}
async function prepareSellerFiles(files){
  const wav=files.find(item=>item.kind==='wav');
  for(const {file,kind} of files)if(!file.size||file.size>sellerBeatData.limits[kind])throw new Error(fileLabels[kind]+' must be within '+bytesLabel(sellerBeatData.limits[kind])+'.');
  uploadRun.fileCount=files.length+(wav&&!files.some(item=>item.kind==='mp3')?1:0);
  if(wav&&!files.some(item=>item.kind==='mp3'))files=[...files,{kind:'mp3',file:await convertSellerWav(wav.file)}];
  return files.sort((a,b)=>['wav','mp3','stems','cover'].indexOf(a.kind)-['wav','mp3','stems','cover'].indexOf(b.kind));
}
function sellerLibraryContent(){
  if(!sellerBeatData){
    if(!sellerBeatLoading&&!sellerBeatsAttempted)setTimeout(loadSellerBeats,0);
    return '<div class="page-title"><h1>Beat library</h1><p>Manage beat details, audio files and artwork.</p></div><section class="panel" aria-live="polite">'+(sellerBeatError?'<h2>Couldn’t load your beat library</h2><p>'+escapeHTML(sellerBeatError)+'</p><button class="btn" type="button" data-upload-action="refresh">Retry loading library</button>':'<p role="status">Loading your private drafts and upload form…</p>')+'</section>';
  }
  const beats=sellerBeatData.beats,editing=beats.find(b=>b.id===sellerEditingId),limits=sellerBeatData.limits;
  const input=(name,label,type='text',extra='')=>'<label class="field">'+label+'<input name="'+name+'" type="'+type+'" value="'+escapeHTML(editing?.[name]??'')+'" '+extra+'></label>';
  const files=['wav','mp3','stems','cover'].map(kind=>'<label class="field">'+(kind==='wav'?'WAV (creates MP3 automatically)':kind==='mp3'?'MP3 (optional with WAV)':fileLabels[kind])+'<input type="file" name="'+kind+'" accept="'+fileAccept[kind]+'"><small>'+(kind==='mp3'?'Optional with WAV: a full-length MP3 is generated automatically. A selected MP3 overrides conversion.':kind==='wav'?'Upload a WAV to also create a high-quality MP3 for previews and MP3 licenses. Mono/stereo PCM or float WAV.':kind==='cover'?'JPG, PNG or WebP.':'Optional; required for Unlimited.')+' Up to '+bytesLabel(limits[kind])+'.</small></label>').join('');
  const cards=beats.map(b=>{
    const pending=b.assets.filter(a=>a.status!=='ready'),current=b.assets.filter(a=>a.current);
    const tiersText=tiers.filter(t=>t.id!=='custom').map(t=>'<span class="status-pill">'+escapeHTML(t.name.replace(' License',''))+': '+(licenseAvailability(b,t).enabled?'available':'missing '+escapeHTML(missingLicenseFiles(b,t)))+'</span>').join('');
    return '<article class="panel seller-draft"><div class="panel-heading"><div><span class="subtle-label">Private draft</span><h3>'+escapeHTML(b.title)+'</h3><p>'+escapeHTML(b.genre)+' · '+b.bpm+' BPM'+(b.key?' · '+escapeHTML(b.key):'')+'</p></div><button type="button" class="btn secondary small" data-upload-action="edit" data-id="'+b.id+'" '+(uploadRun.active?'disabled':'')+'>Edit beat & files</button></div><div class="draft-license-status">'+tiersText+'</div><ul class="draft-files">'+current.map(a=>'<li><span>'+icon(a.kind==='cover'?'image':'file',18)+'<strong>'+fileLabels[a.kind]+'</strong> '+escapeHTML(a.filename)+' <small>'+bytesLabel(a.size)+' · Verified</small></span><button class="text-link" type="button" data-upload-action="remove" data-id="'+a.id+'" '+(uploadRun.active?'disabled':'')+' aria-label="Remove '+escapeHTML(a.filename)+' from this beat">Remove</button></li>').join('')+pending.map(a=>'<li><span><strong>'+fileLabels[a.kind]+'</strong> '+escapeHTML(a.filename)+' <small>'+escapeHTML(a.status==='verifying'?'Verification pending':a.status==='initializing'?'Setup incomplete':'Upload paused or incomplete')+'</small></span><div class="pending-actions">'+(a.status==='initializing'?'':'<label class="btn secondary small">Resume<input class="sr-only" type="file" accept="'+(a.kind==='mp3'?fileAccept.mp3+',.wav,audio/wav':fileAccept[a.kind])+'" data-resume-upload="'+a.id+'" '+(uploadRun.active?'disabled':'')+'></label>')+'<button type="button" class="text-link" data-upload-action="abort" data-id="'+a.id+'" '+(uploadRun.active?'disabled':'')+'>Cancel</button></div></li>').join('')+'</ul>'+(current.length?'':'<p class="access-help">No verified files yet.</p>')+'</article>';
  }).join('');
  return '<div class="seller-page-heading"><div class="page-title"><p class="section-label">Your private catalog</p><h1>Beat library</h1><p>Add beats and edit their audio, artwork and details. Drafts are visible only to you.</p></div><div class="seller-library-actions"><button class="btn" type="button" data-upload-action="new" '+(uploadRun.active?'disabled':'')+'>'+icon('upload',18)+' Add a beat</button><button class="btn secondary" type="button" data-upload-action="library-list">Saved beats ('+beats.length+')</button></div></div>'+ (sellerBeatError?'<p role="status">'+escapeHTML(sellerBeatError)+' <button class="text-link" type="button" data-upload-action="refresh">Retry</button></p>':'')+(!sellerBeatData.storageAvailable?'<div class="callout"><p>Upload storage is not configured yet.</p></div>':'')+'<section class="panel seller-upload-panel" aria-labelledby="beat-editor-title" tabindex="-1"><div class="panel-heading"><h2 id="beat-editor-title">'+(editing?'Edit '+escapeHTML(editing.title):'Add a beat')+'</h2>'+(editing?'<button class="text-link" type="button" data-upload-action="new" '+(uploadRun.active?'disabled':'')+'>Add another beat</button>':'')+'</div><div id="upload-progress"></div><form id="seller-beat-form" data-id="'+escapeHTML(editing?.id||'')+'"><div class="field-grid">'+input('title','Beat title','text','required maxlength="100"')+'<label class="field">Category<select name="genre" required><option value="">Choose category</option>'+categories.map(c=>'<option '+(editing?.genre===c?'selected':'')+'>'+escapeHTML(c)+'</option>').join('')+'</select></label>'+input('bpm','BPM','number','required min="1" max="400" step="1"')+input('key','Musical key','text','maxlength="70"')+'<label class="field wide">Searchable tags<input name="tags" value="'+escapeHTML(editing?.tags.join(', ')||'')+'" maxlength="650" placeholder="soulful, late night, guitar"><small>Comma separated, up to 16 tags.</small></label></div><h3>Upload or replace files</h3><p class="access-help">Select only the files you want to add or replace. Leaving a field empty keeps an existing file.</p><div class="field-grid">'+files+'</div><p class="access-help">Basic needs MP3. Premium needs MP3 + WAV. Unlimited also needs stems. Files enable tiers only after verification. Removing a file changes availability for this draft; retained versions are not deleted.</p><button class="btn" type="submit" '+(!sellerBeatData.storageAvailable||uploadRun.active?'disabled':'')+'>Save draft and upload '+icon('upload',18)+'</button><p id="seller-status" class="form-status" role="status" aria-live="polite">'+escapeHTML(sellerError)+'</p></form></section><section class="seller-draft-list" aria-label="Saved beat drafts" tabindex="-1">'+(cards||empty('No beat drafts yet','Add the first beat using the form above.'))+'</section>';
}
async function checksum(file){
  const hasher=await hashwasm.createSHA256();hasher.init();uploadRun.phase='hash';uploadRun.total=file.size;uploadRun.loaded=0;uploadRun.message='Checking '+file.name+'…';uploadFeedback();
  for(let offset=0;offset<file.size;offset+=4194304){if(uploadRun.stopped)throw new Error('Upload paused. Reselect the same file to resume.');hasher.update(new Uint8Array(await file.slice(offset,offset+4194304).arrayBuffer()));uploadRun.loaded=Math.min(offset+4194304,file.size);uploadFeedback();}
  return hasher.digest('hex');
}
function putPart(url,blob,base,total){
  return new Promise((resolve,reject)=>{
    const xhr=new XMLHttpRequest();uploadRun.xhr=xhr;xhr.open('PUT',url);xhr.timeout=600000;xhr.setRequestHeader('Content-Type','application/octet-stream');
    xhr.upload.onprogress=e=>{uploadRun.total=total;uploadRun.loaded=base+e.loaded;uploadFeedback();};
    xhr.onload=()=>xhr.status>=200&&xhr.status<300?resolve():reject(new Error('Part upload failed. Retry or resume.'));
    xhr.onerror=()=>reject(new Error('Connection interrupted. Retry or resume the upload.'));xhr.ontimeout=()=>reject(new Error('Upload timed out. Resume with the same file.'));xhr.onabort=()=>reject(new Error('Upload paused. Reselect the same file to resume.'));xhr.send(blob);
  });
}
async function sendFile(file,beatId,kind,resume){
  const limit=sellerBeatData.limits[kind];if(file.size<1||file.size>limit)throw new Error(fileLabels[kind]+' must be nonempty and within '+bytesLabel(limit)+'.');
  const sha256=await checksum(file);if(uploadRun.stopped)throw new Error('Upload paused. Reselect the same file to resume.');
  if(!resume)resume=sellerBeatData.beats.find(beat=>beat.id===beatId)?.assets.find(asset=>asset.kind===kind&&['uploading','verifying'].includes(asset.status));
  let id=resume?.id;
  if(resume&&sha256!==resume.sha256)throw new Error('This is a different file. Select the original '+resume.filename+' to resume, or cancel that upload.');
  if(!id)({id}=await sellerAPI('beats/'+beatId+'/uploads',{kind,filename:file.name,size:file.size,sha256}));
  const status=await sellerAPI('uploads/'+id);if(status.status==='ready')return;
  const completed=new Map(status.parts.map(p=>[p.part,p.size])),size=status.partSize,count=Math.ceil(file.size/size);
  uploadRun.phase='upload';uploadRun.total=file.size;uploadRun.loaded=0;uploadRun.message='Uploading '+file.name+'…';uploadFeedback();
  let sent=0;
  if(!status.completed)for(let part=1;part<=count;part++){
    if(uploadRun.stopped)throw new Error('Upload paused. Reselect the same file to resume.');
    const start=(part-1)*size,end=Math.min(start+size,file.size),length=end-start;
    if(completed.get(part)===length){sent+=length;uploadRun.loaded=sent;uploadFeedback();continue;}
    for(let attempt=0;;attempt++){
      try{const {url}=await sellerAPI('uploads/'+id+'/part',{part});await putPart(url,file.slice(start,end),sent,file.size);break;}
      catch(error){if(uploadRun.stopped||error.status===401||error.status===403||attempt>=2)throw error;await new Promise(r=>setTimeout(r,500*(attempt+1)));}
    }
    sent+=length;uploadRun.loaded=sent;uploadFeedback();
  }
  if(uploadRun.stopped)throw new Error('Upload paused. Reselect the same file to resume.');
  uploadRun.phase='verify';uploadRun.loaded=file.size;uploadRun.message='Verifying '+file.name+'…';uploadFeedback();await sellerAPI('uploads/'+id+'/complete',{});
  uploadRun.message=file.name+' verified.';uploadRun.phase='';uploadFeedback();
}
function uploadControlsBusy(busy){
  document.querySelectorAll('#seller-beat-form input, #seller-beat-form select, #seller-beat-form button, [data-upload-action="new"], [data-upload-action="edit"], [data-upload-action="remove"], [data-upload-action="abort"], [data-resume-upload]').forEach(control=>{
    if(busy&&!control.disabled){control.dataset.uploadDisabled='1';control.disabled=true;}
    else if(!busy&&control.dataset.uploadDisabled){control.disabled=false;delete control.dataset.uploadDisabled;}
  });
}
async function runUploads(work){
  if(uploadRun.active)return;Object.assign(uploadRun,{active:true,stopped:false,message:'Preparing files…',phase:'prepare',loaded:0,total:1,fileIndex:0,fileCount:0});sellerError='';uploadFeedback();uploadControlsBusy(true);
  document.getElementById('upload-progress')?.scrollIntoView({behavior:prefersQuietMotion()?'instant':'smooth',block:'start'});
  let failed=false;
  try{await work();uploadRun.message='Draft saved. File availability is up to date.';}
  catch(error){failed=true;uploadRun.message=error.message;if(error.status===401){sellerChecked=false;await loadSeller();}}
  finally{uploadRun.active=false;uploadRun.xhr=null;uploadRun.cancelConversion=null;await loadSellerBeats({preserveEditor:failed});uploadControlsBusy(false);uploadFeedback();}
}
document.addEventListener('submit',event=>{
  if(event.target.id!=='seller-beat-form')return;event.preventDefault();if(uploadRun.active)return;
  const form=event.target,data=new FormData(form),files=Object.keys(fileLabels).map(kind=>({kind,file:data.get(kind)})).filter(x=>x.file?.size);
  runUploads(async()=>{
    const prepared=await prepareSellerFiles(files);if(uploadRun.stopped)throw new Error('Upload paused. Your files are still selected.');
    uploadRun.phase='prepare';uploadRun.message='Saving beat details…';uploadFeedback();
    const {id}=await sellerAPI('beats',{id:form.dataset.id||undefined,title:data.get('title'),genre:data.get('genre'),bpm:Number(data.get('bpm')),key:data.get('key'),tags:String(data.get('tags')).split(',').map(t=>t.trim()).filter(Boolean)});
    sellerEditingId=id;form.dataset.id=id;
    for(const [index,{file,kind}] of prepared.entries()){uploadRun.fileIndex=index+1;if(uploadRun.stopped)throw new Error('Upload paused. Resume saved files from the draft below.');await sendFile(file,id,kind);}
  });
});
document.addEventListener('change',event=>{
  const input=event.target,id=input.dataset.resumeUpload;if(!id||!input.files?.[0]||uploadRun.active)return;
  const asset=sellerBeatData.beats.flatMap(b=>b.assets.map(a=>({...a,beatId:b.id}))).find(a=>a.id===id);if(!asset)return;
  const file=input.files[0];input.value='';runUploads(async()=>{
    if(asset.kind==='wav'){
      const prepared=await prepareSellerFiles([{kind:'wav',file}]);
      for(const [index,item] of prepared.entries()){uploadRun.fileIndex=index+1;await sendFile(item.file,asset.beatId,item.kind,item.kind==='wav'?asset:undefined);}
    }else{uploadRun.fileCount=1;uploadRun.fileIndex=1;await sendFile(asset.kind==='mp3'&&/\.wav$/i.test(file.name)?await convertSellerWav(file):file,asset.beatId,asset.kind,asset);}
  });
});
document.addEventListener('click',async event=>{
  const button=event.target.closest('[data-upload-action]');if(!button)return;const action=button.dataset.uploadAction,id=button.dataset.id;
  if(action==='open-new'){sellerEditingId='';return;}
  if(action==='library-list'){const list=document.querySelector('.seller-draft-list');list?.focus({preventScroll:true});list?.scrollIntoView({behavior:prefersQuietMotion()?'instant':'smooth',block:'start'});return;}
  if(action==='pause'){uploadRun.stopped=true;uploadRun.xhr?.abort();uploadRun.cancelConversion?.();return;}
  if(uploadRun.active)return;
  if(action==='refresh'){sellerError='';await loadSellerBeats();return;}
  if(action==='edit'||action==='new'){sellerEditingId=action==='edit'?id:'';uploadRun.message='';renderSellerWorkspace();document.querySelector('.seller-upload-panel')?.focus({preventScroll:true});document.querySelector('.seller-upload-panel')?.scrollIntoView({behavior:prefersQuietMotion()?'instant':'smooth',block:'start'});return;}
  button.disabled=true;
  try{if(action==='remove')await sellerAPI('assets/'+id+'/remove',{});if(action==='abort')await sellerAPI('uploads/'+id+'/abort',{});sellerError='';await loadSellerBeats();}
  catch(error){sellerMessage(error.message);button.disabled=false;}
});
window.addEventListener('beforeunload',event=>{if(uploadRun.active){event.preventDefault();event.returnValue='';}});
window.addEventListener('hashchange',()=>{if(route()!=='studio-catalog'&&uploadRun.active&&uploadRun.phase!=='verify'){uploadRun.stopped=true;uploadRun.xhr?.abort();uploadRun.cancelConversion?.();}});
