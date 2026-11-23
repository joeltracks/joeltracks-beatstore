import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

const uploads = await readFile(new URL('../seller-uploads.js', import.meta.url), 'utf8');
const auth = await readFile(new URL('../seller-auth.js', import.meta.url), 'utf8');
function workspace() {
  const timers = [], clicks = [], events = {}, windowEvents = {};
  const ctx = vm.createContext({
    document: { hidden: false, addEventListener(name, handler) { (events[name] ||= []).push(handler); if (name === 'click') clicks.push(handler); }, getElementById() { return null; } },
    window: { addEventListener(name, handler) { (windowEvents[name] ||= []).push(handler); } }, setTimeout(fn) { timers.push(fn); },
    escapeHTML: value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;'),
    icon: () => '', categories: ['R&B Beats', 'Afro Beats', 'Trap Beats'], tiers: [],
    route: () => 'studio-catalog', nav() {}, afterRender() {}, page: (...parts) => parts.join(''),
    empty: title => '<p>' + title + '</p>', formatCount: String, cash: String,
  });
  vm.runInContext(uploads + '\n' + auth, ctx);
  vm.runInContext("sellerView={stage:'ready'};sellerChecked=true;sellerOverview={recentOrders:[],paidOrders:0,revenueCents:0,pendingOrders:0};", ctx);
  return { ctx, timers, clicks, events, windowEvents, run: source => vm.runInContext(source, ctx) };
}
const data = { beats: [], limits: { mp3: 52428800, wav: 262144000, stems: 536870912, cover: 10485760 }, storageAvailable: true };

test('a failed library request stops retrying until the seller explicitly retries', async () => {
  const { ctx, timers, clicks, run } = workspace();
  let requests = 0;
  ctx.sellerAPI = async () => { if (++requests === 1) throw new Error('Storage temporarily unavailable'); return data; };
  assert.match(run('sellerLibraryContent()'), /Loading your private drafts and upload form/);
  assert.equal(timers.length, 1);
  await timers.shift()();
  for (let n = 0; n < 5; n++) {
    const html = run('sellerLibraryContent()');
    assert.match(html, /Couldn’t load your beat library/);
    assert.match(html, /Retry loading library/);
    assert.doesNotMatch(html, /Loading your private drafts/);
  }
  assert.equal(timers.length, 0);
  assert.equal(requests, 1);
  await clicks[0]({ target: { closest: () => ({ dataset: { uploadAction: 'refresh' } }) } });
  assert.equal(requests, 2);
  assert.match(run('sellerLibraryContent()'), /id="seller-beat-form"/);
  assert.doesNotMatch(run('sellerLibraryContent()'), /Storage temporarily unavailable/);
});

test('returning to the tab preserves the editor when the seller session is unchanged', async () => {
  const { ctx, events, run } = workspace();
  let replacements = 0;
  ctx.nav = () => replacements++;
  ctx.sellerAPI = async path => path === 'session' ? { stage: 'ready' } : { recentOrders: [] };
  ctx.document.hidden = true;
  for (const handler of events.visibilitychange) await handler();
  ctx.document.hidden = false;
  for (const handler of events.visibilitychange) await handler();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(run('sellerView.stage'), 'ready');
  assert.equal(replacements, 0, 'A tab-return check must not replace the selected files/editor DOM');
});

test('concurrent visibility/navigation checks share one session check, and revocation closes the editor', async () => {
  const { ctx, events, windowEvents, run } = workspace();
  let requests=0, release;
  ctx.sellerAPI=async()=>{requests++;return new Promise(resolve=>{release=resolve;});};
  const pending=events.visibilitychange[0]();
  windowEvents.hashchange.forEach(handler=>handler());
  assert.equal(requests,1);
  release({stage:'password'});await pending;
  assert.equal(run('sellerView.stage'),'password');
  assert.equal(run('sellerBeatData'),null);
});

test('switching to an authenticator app never resets the setup or code-entry form', async () => {
  const { ctx, events, run }=workspace();
  run("sellerView={stage:'verify-enrollment'};sellerSetupKey='test-only-key';");
  ctx.sellerAPI=()=>{throw new Error('Unexpected request during setup');};
  await events.visibilitychange[0]();
  assert.equal(run('sellerView.stage'),'verify-enrollment');
  assert.equal(run('sellerSetupKey'),'test-only-key');
});

test('an idle, loaded dashboard schedules no reload or automatic editor replacement', async () => {
  const {ctx,timers,run}=workspace();let replacements=0,requests=0;
  ctx.nav=()=>replacements++;ctx.libraryData=data;
  ctx.sellerAPI=async()=>{requests++;throw new Error('Unexpected idle request');};
  run('sellerBeatData=libraryData;renderSellerWorkspace();');
  await new Promise(resolve=>setTimeout(resolve,50));
  assert.equal(replacements,1);assert.equal(requests,0);assert.equal(timers.length,0);
});

test('delayed public catalog responses never redraw the active private editor', async () => {
  const source=await readFile(new URL('../launch.js',import.meta.url),'utf8');
  const start=source.indexOf("Promise.allSettled([accessAPI('catalog')"),end=source.indexOf('// Show the offer strip',start);
  assert(start>0&&end>start);
  const pending=[];let replacements=0;
  const ctx=vm.createContext({accessAPI:()=>new Promise(resolve=>pending.push(resolve)),route:()=> 'studio-catalog',renderRoute:()=>replacements++,removeUnavailableCartItems(){}});
  vm.runInContext(source.slice(start,end),ctx);
  pending[0]({beats:[]});pending[1]({available:false});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(replacements,0,'A slow startup request replaced the untouched dashboard');
});

test('WAV-only selection creates an MP3 automatically while an explicit MP3 remains an override', async () => {
  const {ctx,run}=workspace();ctx.libraryData=data;run('sellerBeatData=libraryData');
  const wav={name:'song.wav',size:1024},mp3={name:'song.mp3',size:512};
  let conversions=0;ctx.convertSellerWav=async file=>{assert.equal(file,wav);conversions++;return mp3;};
  ctx.selected=[{kind:'wav',file:wav}];
  const prepared=await run('prepareSellerFiles(selected)');
  assert.equal(conversions,1);assert.deepEqual(Array.from(prepared,item=>item.kind),['wav','mp3']);
  assert.equal(run('uploadRun.fileCount'),2);
  ctx.selected=[{kind:'mp3',file:mp3},{kind:'wav',file:wav}];await run('prepareSellerFiles(selected)');
  assert.equal(conversions,1,'Explicit MP3 was unexpectedly replaced');
});

test('upload progress distinguishes real byte progress from indeterminate server verification', () => {
  const {ctx,run}=workspace(),nodes={};
  const progress={setAttribute(){},removeAttribute(name){delete this[name];}};
  const el={dataset:{},querySelector(selector){return selector==='progress'?progress:nodes[selector]||=( {textContent:''} );}};
  ctx.document.getElementById=()=>el;
  run("Object.assign(uploadRun,{active:true,phase:'upload',loaded:5,total:10,fileIndex:1,fileCount:2,message:'Uploading song.wav…'});uploadFeedback();");
  assert.equal(nodes['[data-upload-percent]'].textContent,'50%');assert.equal(progress.value,5);
  run("uploadRun.phase='verify';uploadFeedback();");
  assert.equal(progress.value,undefined,'Verification must not falsely show 100% completion');
  assert.match(nodes['[data-upload-detail]'].textContent,/not ready until verification finishes/);
});

test('overview exposes uploads before orders and the library exposes all file inputs and explicit editing', () => {
  const { ctx, run } = workspace();
  ctx.route = () => 'studio';
  const overview = run('sellerDashboard()');
  assert.match(overview, /Beat library & files/);
  assert(overview.indexOf('Upload a beat') < overview.indexOf('Recent orders'));
  ctx.route = () => 'studio-catalog';
  ctx.libraryData = { ...data, beats: [{ id: 'test-id', title: '<Existing beat>', genre: 'R&B Beats', bpm: 88, key: 'C min', tags: ['soulful'], assets: [] }] };
  run("sellerBeatData=libraryData;sellerEditingId='test-id'");
  const library = run('sellerDashboard()');
  assert.match(library, /Edit beat & files/);
  assert.match(library, /Saved beats \(1\)/);
  assert.match(library, /Edit &lt;Existing beat>/);
  for (const kind of ['mp3', 'wav', 'stems', 'cover']) assert.match(library, new RegExp('type="file" name="' + kind + '"'));
  assert.match(library, /Leaving a field empty keeps an existing file/);
  assert.match(library, /data-id="test-id"/);
});
