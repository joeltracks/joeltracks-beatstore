import fs from 'node:fs';
import vm from 'node:vm';
const app=fs.readFileSync('app.js','utf8');
const context=vm.createContext({Intl});
const script=fs.readFileSync('catalog.js','utf8')+'\n'+fs.readFileSync('design.js','utf8')+'\n'+
  app.slice(app.indexOf('const dollars'),app.indexOf('function read('))+'\n'+
  app.slice(app.indexOf('function buttonIcon('),app.indexOf('function announce('))+'\n'+
  app.slice(app.indexOf('function tagButton('),app.indexOf('function showFavorites('))+`
const sourceURL='',activeTrack='demo-0',audio={paused:true},favorites=new Set(),tag='';
const available=()=>true;
const tier=id=>tiers.find(item=>item.id===id);
let selected=false;
const cartRows=()=>selected?[{beatId:'demo-0',tierId:'basic'}]:[];
const cartLicense=item=>tier(item.tierId);
const cover=()=>'<img class="cover" src="assets/after-hours.jpg" alt="" width="40" height="40">';
const before=trackRow(demoTracks[0]);
selected=true;
const after=trackRow(demoTracks[0]);
({before,after});`;
const rows=vm.runInContext(script,context);
fs.writeFileSync('.taste-skill/cart-state-preview.html',`<!doctype html><html lang="en"><head><meta charset="utf-8"><base href="../"><link rel="stylesheet" href="assets/fonts/fonts.css"><link rel="stylesheet" href="style.css"><link rel="stylesheet" href="type-motion.css"><link rel="stylesheet" href="refresh.css"><title>Cart control states</title><style>body{padding:36px 48px}.state-label{font-size:14px;color:var(--muted);margin:20px 0 10px}h1{font-size:28px}.tracks{border:0}.track{padding-inline:16px;border:1px solid var(--line);border-radius:10px}</style></head><body><h1>Cart control states</h1><p class="state-label">Not selected · + opens license selection</p><div class="tracks">${rows.before}</div><p class="state-label">In cart · × removes the beat</p><div class="tracks">${rows.after}</div></body></html>`);
