import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const app=fs.readFileSync('app.js','utf8');
const helpers=app.slice(app.indexOf('const dollars'),app.indexOf('function read('));
const availability=app.slice(app.indexOf('function available('),app.indexOf('const cartRows'));
const agreements=app.slice(app.indexOf('function agreementList('),app.indexOf('function syncPlayButtons'));
const pricing=app.slice(app.indexOf('const cartPricing'),app.indexOf('audio.volume'));
const table=app.slice(app.indexOf('function table('),app.indexOf('function sellerOffers'));
const scope=vm.createContext({assert,console,Intl,document:{addEventListener(){}},window:{addEventListener(){}}});
vm.runInContext(fs.readFileSync('catalog.js','utf8')+'\n'+helpers+'\n'+fs.readFileSync('bulk-deals.js','utf8')+'\n'+pricing+'\n'+fs.readFileSync('seller.js','utf8')+'\n'+fs.readFileSync('storefront.js','utf8')+'\n'+fs.readFileSync('license-proposals.js','utf8')+'\n'+availability+'\n'+agreements+'\n'+table+`
let offers=[{id:'old'},{id:'new'}],demoSales=[{id:'sale-1',ref:'SIM',track:'Palm Wine',license:'Basic License',amount:65,status:'Paid'}];
let tracks=demoTracks.slice();
let seenEvents={offers:['old'],payments:[]};
const mockPayments=[{ref:'PAID',track:'After Hours',license:'Premium License',amount:100,status:'Paid'},{ref:'WAIT',track:'Palm Wine',license:'Basic License',amount:50,status:'Pending'}];
const tier=id=>tiers.find(item=>item.id===id);
hydrateLicenses({basic:{price:65,delivery:['mp3','wav'],publishing:45,major:88,indie:72,grant:'<test> draft',version:3}});
assert.equal(tier('basic').files,'MP3 + WAV');
assert.equal(tier('premium').price,100);
assert.equal(available({demo:false,files:{mp3:{}}},'basic'),false);
assert.equal(available({demo:false,files:{mp3:{},wav:{}}},'basic'),true);
assert.equal(available({demo:true,files:{}},'unlimited'),true);
assert.equal(unreadEvents('offers').length,1);
assert.equal(unreadEvents('payments').length,1);
assert.match(notificationBadge('studio-payments'),/1 unread sale notification/);
const chart=livePaymentView();
assert.match(chart,/Paid \\$165, pending \\$50, refunded \\$0/);
assert.match(chart,/Purchases by beat/);
assert.equal(beatPurchaseCounts().find(item=>item.id==='demo-0').count,1);
assert.equal(beatPurchaseCounts().find(item=>item.id==='demo-1').count,1);
assert.equal(beatPurchaseCounts().find(item=>item.id==='demo-2'),undefined);
const countCatalog=[{id:'a',title:'Renamed beat'},{id:'b',title:'Shared title'},{id:'c',title:'Shared title'},{id:'d',title:'Not sold'}];
const countRecords=[
  {beatId:'a',track:'Old title',status:'Paid'},
  {beatId:'a',track:'Old title',status:'Paid'},
  {beatId:'a',track:'Old title',status:'Refunded'},
  {beatId:'d',track:'Not sold',status:'Pending'},
  {track:'Shared title',status:'Paid'}
];
const counts=beatPurchaseCounts(countRecords,countCatalog);
assert.equal(counts.find(item=>item.id==='a').count,2);
assert.equal(counts.find(item=>item.id==='a').title,'Renamed beat');
assert.equal(counts.find(item=>item.id==='d'),undefined);
assert.equal(counts.find(item=>item.id==='b'),undefined);
assert.equal(counts.find(item=>item.legacy).count,1);
assert.equal(counts.reduce((sum,item)=>sum+item.count,0),3);
assert.equal(beatPurchaseCounts([],countCatalog).length,0);
assert.ok(counts.every(item=>item.count>=1));
const buyer={name:'Test buyer'};
let agreementRows=[{beatId:'demo-0',tierId:'basic'}];
const cartRows=()=>agreementRows;
const beat=id=>demoTracks.find(item=>item.id===id);
let agreedOffer=null;
const cartLicense=item=>agreedOffer?{...tier(item.tierId),price:125,offer:agreedOffer}:tier(item.tierId);
const draft=agreementList();
assert.match(draft,/\\$65 USD/);
assert.match(draft,/45% artist \\/ 55% JT/);
assert.match(draft,/Major-label: 88% artist \\/ 12% JT/);
assert.match(draft,/Smaller indie: 72% artist \\/ 28% JT/);
assert.match(draft,/&lt;test&gt; draft/);
assert.match(draft,/Prototype draft v3/);
const publicCards=referenceLicenseCards();
assert.match(publicCards,/\\$65/);
assert.match(publicCards,/MP3 \\+ WAV/);
assert.match(publicCards,/&lt;test&gt; draft/);
assert.match(publicCards,/100,000 total/);
assert.match(draft,/100,000 total/);
assert.match(draft,/10 years/);
agreementRows=[{beatId:'demo-0',tierId:'basic'},{beatId:'demo-1',tierId:'premium'}];
let discounted=agreementList();
assert.match(discounted,/Bulk discount/);
assert.match(discounted,/15%/);
assert.match(discounted,/\\$55.25 USD/);
assert.match(discounted,/\\$85 USD/);
assert.equal(total(),140.25);
agreementRows.push({beatId:'demo-2',tierId:'unlimited'});
discounted=agreementList();
assert.match(discounted,/25%/);
assert.match(discounted,/\\$48.75 USD/);
assert.match(discounted,/\\$75 USD/);
assert.match(discounted,/\\$375 USD/);
assert.equal(total(),498.75);
agreementRows=[{beatId:'demo-0',tierId:'basic'}];
assert.equal(total(),65);
const proposals=licenseProposalReview();
assert.match(proposals,/Dashboard defaults/);
assert.match(proposals,/100,000 total/);
assert.equal(tier('basic').grant,'<test> draft');
for(const item of tiers){
  assert.ok(item.grant&&item.limits&&item.terms);
  if(item.id==='custom')assert.match(item.grant,/negotiated/);
  else assert.match(item.limits,/10 years/);
}
hydrateLicenses({premium:{grant:'Seller override',limits:'',terms:'',version:4}});
assert.equal(tier('premium').grant,'Seller override');
assert.match(tier('premium').limits,/500,000 total/);
assert.equal(tier('premium').version,5);
const savedLicense=JSON.parse(JSON.stringify(tier('premium')));
savedLicense.grant='';
hydrateLicenses({premium:savedLicense});
assert.equal(tier('premium').grant,'');
assert.equal(tier('premium').version,5);
assert.match(tier('unlimited').limits,/No audio-stream cap/);
for(const item of tiers){
  item.grant=item.id+' custom grant';item.limits=item.id+' custom limits';item.terms=item.id+' custom terms';
  agreementRows=[{beatId:'demo-0',tierId:item.id}];
  agreedOffer=item.id==='custom'?{id:'offer-test',revision:2,party:'Artist',publishing:40,master:80,terms:'Specific negotiated notes'}:null;
  const html=agreementList();
  assert.match(html,new RegExp(item.id+' custom grant'));
  assert.match(html,new RegExp(item.id+' custom limits'));
  assert.match(html,new RegExp(item.id+' custom terms'));
  if(agreedOffer){assert.match(html,/Specific negotiated notes/);assert.ok(html.includes('40% artist / 60% JT'));}
}
seenEvents.payments=['sale-1'];
assert.equal(notificationBadge('studio-payments'),'');
console.log('PASS: license/draft checks including bulk fees, unread state, payment totals, sold-only tally, renamed beats, ambiguous older records and status exclusions.');
`,scope);
