import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile(new URL('../seller-publishing.js',import.meta.url),'utf8');
const id='10000000-0000-4000-8000-000000000001';
function workspace(){
  let click;const status={textContent:''},calls=[],refreshes=[];
  const ctx=vm.createContext({
    escapeHTML:value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),icon:()=>'',
    sellerBeatData:{publishingAvailable:true},uploadRun:{active:false},sellerQueuedFiles:new Map(),sellerBeatError:'',
    document:{addEventListener(name,fn){if(name==='click')click=fn;},querySelectorAll:()=>[],getElementById:key=>key.startsWith('publication-status-')?status:null},
    sellerAPI:async(path,data)=>{calls.push({path,data});return {isPublished:true};},
    accessAPI:async()=>({beats:[{id,status:'Published'}]}),loadSellerBeats:async options=>refreshes.push(options),
    tracks:[],catalogStatus:'empty',activeTrack:'',sourceURL:'',audio:{pause(){},removeAttribute(){}},removeUnavailableCartItems(){},scheduleSellerFiles(){},
  });
  vm.runInContext(source,ctx);
  return {ctx,status,calls,refreshes,run:code=>vm.runInContext(code,ctx),click:action=>click({target:{closest:()=>({dataset:{id,publicationAction:action}})}})};
}
test('seller cards distinguish private, published and unpublished-update states and block incomplete files',()=>{
  const {ctx,run}=workspace();ctx.item={id,title:'<My beat>',assets:[],fileAvailability:{mp3:false}};
  let html=run('sellerPublicationControls(item)');assert.match(html,/Private draft/);assert.match(html,/data-publication-action="publish"[^>]* disabled/);assert.match(html,/verified MP3 is needed/);
  ctx.item.fileAvailability.mp3=true;html=run('sellerPublicationControls(item)');assert.doesNotMatch(html,/data-publication-action="publish"[^>]* disabled/);
  ctx.item.publication={isPublished:true,needsUpdate:true};html=run('sellerPublicationControls(item)');assert.match(html,/Update storefront/);assert.match(html,/Unpublish/);assert.match(html,/View in store/);assert(!html.includes('<My beat>'));
  ctx.item.assets=[{status:'uploading'}];html=run('sellerPublicationControls(item)');assert.match(html,/Finish or cancel incomplete uploads/);assert.match(html,/data-publication-action="publish"[^>]* disabled/);
});
test('publish provides feedback, refreshes public data and updates saved cards without replacing the editor',async()=>{
  const {ctx,status,calls,refreshes,click}=workspace();let pruned=0;ctx.removeUnavailableCartItems=()=>pruned++;
  await click('publish');assert.equal(calls[0].path,'beats/'+id+'/publish');assert.match(status.textContent,/Published/);
  assert.equal(ctx.tracks[0].id,id);assert.equal(pruned,1);assert.equal(refreshes.length,1);assert.equal(refreshes[0].preserveEditor,true);
});
test('unpublish clears obsolete playback/catalog and publication failures remain visible',async()=>{
  const {ctx,status,click}=workspace();let paused=0;ctx.activeTrack=id;ctx.sourceURL='/api/media/old';ctx.audio.pause=()=>paused++;
  ctx.accessAPI=async()=>({beats:[]});await click('unpublish');assert.match(status.textContent,/Unpublished/);assert.equal(paused,1);assert.equal(ctx.activeTrack,'');
  ctx.sellerAPI=async()=>{throw new Error('Verified MP3 missing');};await click('publish');assert.equal(status.textContent,'Verified MP3 missing');
});
test('a click while files are queued explains why publication is waiting',async()=>{
  const {ctx,status,calls,click}=workspace();ctx.sellerQueuedFiles.set('wav',{});await click('publish');
  assert.equal(calls.length,0);assert.match(status.textContent,/Finish the queued uploads/);
});
