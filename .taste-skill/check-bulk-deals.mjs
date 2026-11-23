import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const scope=vm.createContext({document:{addEventListener(){}}});
vm.runInContext(fs.readFileSync('bulk-deals.js','utf8'),scope);
const price=values=>JSON.parse(JSON.stringify(scope.calculateBulkDeal(values)));
const cases=[
  {prices:[],rate:0,subtotal:0,saving:0,total:0},
  {prices:[50],rate:0,subtotal:5000,saving:0,total:5000},
  {prices:[50,50],rate:15,subtotal:10000,saving:1500,total:8500},
  {prices:[50,100],rate:15,subtotal:15000,saving:2250,total:12750},
  {prices:[50,50,50],rate:25,subtotal:15000,saving:3750,total:11250},
  {prices:[50,100,500],rate:25,subtotal:65000,saving:16250,total:48750},
  {prices:[50,50,50,50],rate:25,subtotal:20000,saving:5000,total:15000},
  {prices:[50,125],rate:15,subtotal:17500,saving:2625,total:14875},
  {prices:[49.99,100.01],rate:15,subtotal:15000,saving:2250,total:12750},
  {prices:[.01,.01,.01],rate:25,subtotal:3,saving:1,total:2},
  {prices:[2.01,3.02,10.03],rate:25,subtotal:1506,saving:377,total:1129}
];
for(const item of cases){
  const actual=price(item.prices);
  assert.equal(actual.rate,item.rate);
  assert.equal(actual.subtotalCents,item.subtotal);
  assert.equal(actual.discountCents,item.saving);
  assert.equal(actual.totalCents,item.total);
  assert.equal(actual.items.reduce((sum,item)=>sum+item.totalCents,0),actual.totalCents);
}
let selected=[50,100,500];
assert.equal(price(selected).rate,25);
selected.pop();assert.equal(price(selected).rate,15);
selected.pop();assert.equal(price(selected).rate,0);
assert.deepEqual(selected,[50]);
assert.equal(price([50,500]).totalCents,46750,'A license change reprices the same 2-beat offer');
let seed=271828;
for(let count=0;count<30;count++){
  const prices=Array.from({length:count},()=>{seed=(seed*16807)%2147483647;return ((seed%100000)+1)/100;});
  const original=prices.slice(),actual=price(prices),rate=count>=3?25:count===2?15:0;
  const subtotal=prices.reduce((sum,value)=>sum+Math.round(value*100),0);
  assert.equal(actual.totalCents,subtotal-Math.round(subtotal*rate/100));
  assert.equal(actual.items.reduce((sum,item)=>sum+item.discountCents,0),actual.discountCents);
  assert.equal(actual.items.reduce((sum,item)=>sum+item.totalCents,0),actual.totalCents);
  assert.ok(actual.items.every(item=>item.totalCents>=0&&Math.abs(item.discountCents-item.priceCents*rate/100)<1));
  assert.deepEqual(prices,original);
}
console.log('PASS: 0/1/2/3+ thresholds, mixed licenses and negotiated prices, removal, license changes, no stacking, and exact cent reconciliation for 30 cart sizes.');
