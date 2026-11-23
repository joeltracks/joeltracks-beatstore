import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const sources=Object.fromEntries(await Promise.all(['catalog.js','license-proposals.js','license-settings.js','app.js','bulk-deals.js','design.js','launch.js'].map(async name=>[name,await readFile(name,'utf8')])));
function section(file,start,end){return sources[file].slice(sources[file].indexOf(start),sources[file].indexOf(end,sources[file].indexOf(start)));}
function fixture(){
  let markup='';
  const saved=[];
  const notices=[];
  const context=vm.createContext({Blob,URL,Intl,document:{querySelector:()=>({})},matchMedia:()=>({matches:false}),localStorage:{getItem:()=>null,setItem:(key,value)=>saved.push([key,value])},announce:text=>notices.push(text),showDialog:(_title,_subtitle,body)=>{markup=body;}});
  for(const file of ['catalog.js','license-proposals.js','license-settings.js'])vm.runInContext(sources[file],context);
  vm.runInContext(section('bulk-deals.js','function calculateBulkDeal','let bulkDockObserver'),context);
  vm.runInContext(sources['app.js'].slice(0,sources['app.js'].indexOf('audio.volume')),context);
  vm.runInContext(section('app.js','const thumbnails =','function buttonIcon('),context);
  vm.runInContext(section('app.js','function changeCart(','const buyer='),context);
  vm.runInContext(section('design.js','function showOptions(','function checkoutSteps('),context);
  vm.runInContext(section('launch.js',"function referenceLicenseCards(id=''){",'function renderReferenceLicenses('),context);
  const run=code=>vm.runInContext(code,context);
  run("tracks=[{id:'fixture',title:'Test beat',genre:'R&B Beats',bpm:90,key:'C min',status:'Published',files:{}}];");
  return {run,markup:()=>markup,saved,notices};
}

test('all MP3/WAV/stems combinations enable only tiers with their entire file package',()=>{
  const {run}=fixture();
  for(let mask=0;mask<8;mask++){
    const flags={mp3:Boolean(mask&1),wav:Boolean(mask&2),stems:Boolean(mask&4)};
    run(`tracks[0].fileAvailability=${JSON.stringify(flags)}`);
    assert.equal(run("available(tracks[0],'basic')"),flags.mp3);
    assert.equal(run("available(tracks[0],'premium')"),flags.mp3&&flags.wav);
    assert.equal(run("available(tracks[0],'unlimited')"),flags.mp3&&flags.wav&&flags.stems);
    assert.equal(run("available(tracks[0],'custom')"),false);
  }
});

test('nonempty local files qualify; previews, empty files and incomplete upload records do not',()=>{
  const {run}=fixture();
  run("tracks[0].files={preview:new Blob(['preview']),mp3:new Blob(['audio']),wav:new Blob([]),stems:{name:'stems.zip',status:'uploading',size:200}};");
  assert.equal(run("available(tracks[0],'basic')"),true);
  assert.equal(run("available(tracks[0],'premium')"),false);
  assert.equal(run("available(tracks[0],'unlimited')"),false);
  run("tracks[0].files.mp3={name:'audio.mp3',size:100,status:'failed'};");
  assert.equal(run("available(tracks[0],'basic')"),false);
  run("tracks[0].fileAvailability={mp3:'true',wav:1,stems:{ready:true}};");
  assert.equal(run("available(tracks[0],'basic')"),false);
  run("delete tracks[0].files; delete tracks[0].fileAvailability;");
  assert.equal(run("available(tracks[0],'basic')"),false);
  assert.equal(run("available(null,'basic')"),false);
  assert.equal(run("available(tracks[0],'unknown')"),false);
});

test('availability follows edited delivery requirements and stays isolated per beat',()=>{
  const {run}=fixture();
  run("tracks[0].fileAvailability={mp3:true,wav:true,stems:false}; tracks.push({...tracks[0],id:'second',fileAvailability:{mp3:true,wav:false,stems:false}});");
  assert.equal(run("available(tracks[0],'premium')"),true);
  assert.equal(run("available(tracks[1],'premium')"),false);
  run("tier('premium').delivery=['wav','stems'];");
  assert.equal(run("available(tracks[0],'premium')"),false);
  run("tracks[0].fileAvailability.stems=true;");
  assert.equal(run("available(tracks[0],'premium')"),true);
  run("tier('premium').delivery=[];");
  assert.equal(run("available(tracks[0],'premium')"),false);
});

test('picker and beat-page cards disable missing packages and explain missing files',()=>{
  const f=fixture();
  f.run("tracks[0].fileAvailability={mp3:true,wav:false,stems:false}; showOptions('fixture');");
  assert.match(f.markup(),/value="basic" checked /);
  assert.match(f.markup(),/value="premium" disabled /);
  assert.match(f.markup(),/value="unlimited" disabled /);
  assert.match(f.markup(),/Unavailable: missing WAV/);
  assert.match(f.markup(),/Unavailable: missing WAV \+ stems/);
  f.run("delete tracks[0].files; showOptions('fixture');");
  assert.match(f.markup(),/assets\/branding\/soft-seal\/capsule.svg/);
  const cards=f.run("referenceLicenseCards('fixture')");
  assert.match(cards,/data-tier="basic">Add Basic to cart/);
  assert.match(cards,/data-tier="premium" disabled aria-describedby="license-files-premium"/);
  assert.match(cards,/data-tier="unlimited" disabled aria-describedby="license-files-unlimited"/);
  assert.match(cards,/data-tier="custom">Discuss custom license/);
  f.run("tracks[0].fileAvailability.wav=true; tracks[0].fileAvailability.stems=true;");
  assert.doesNotMatch(f.run("referenceLicenseCards('fixture')"),/ disabled/);
  assert.doesNotMatch(f.run('referenceLicenseCards()'),/ disabled|Unavailable: missing/);
});

test('stale cart licenses cannot be added or priced, and refresh removes them without substitution',()=>{
  const f=fixture();
  f.run("tracks[0].fileAvailability={mp3:true,wav:true,stems:true}; cart=[{beatId:'fixture',tierId:'unlimited'}]; agreementsReviewed=true;");
  assert.equal(f.run('total()'),500);
  f.run('tracks[0].fileAvailability.stems=false;');
  assert.equal(f.run('cartRows().length'),0);
  assert.equal(f.run('total()'),0);
  f.run("changeCart('fixture','unlimited');");
  assert.equal(f.run('cart.length'),1); // Rejected add leaves the original state untouched.
  f.run('removeUnavailableCartItems();');
  assert.equal(f.run('cart.length'),0);
  assert.equal(f.run('agreementsReviewed'),false);
  assert.equal(f.saved.at(-1)[1],'[]');
  assert.match(f.notices.at(-1),/removed from your cart/);
  f.run("tracks[0].fileAvailability.stems=true;");
  assert.equal(f.run("available(tracks[0],'unlimited')"),true);
  assert.equal(f.run('cart.length'),0); // Re-upload enables the tier without resurrecting a removed purchase choice.
});

test('bulk discounts count only licenses with all required files available',()=>{
  const {run}=fixture();
  run("tracks[0].fileAvailability={mp3:true,wav:true,stems:true}; tracks.push({...tracks[0],id:'second'},{...tracks[0],id:'third',fileAvailability:{mp3:true,wav:true,stems:false}}); cart=[{beatId:'fixture',tierId:'basic'},{beatId:'second',tierId:'unlimited'},{beatId:'third',tierId:'unlimited'}];");
  assert.equal(run('cartPricing().count'),2);
  assert.equal(run('cartPricing().rate'),15);
  assert.equal(run('total()'),467.5);
  run('removeUnavailableCartItems();');
  assert.equal(run('cart.length'),2);
  assert.equal(run("cart.some(item=>item.beatId==='third')"),false);
});
