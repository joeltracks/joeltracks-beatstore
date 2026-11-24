import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import{readFile}from'node:fs/promises';
test('the player and dock appear only after explicit beat playback selection and remain available when paused',async()=>{
 const source=await readFile('design.js','utf8'),start=source.indexOf('function renderPlayer()'),end=source.indexOf('function updateProgress()',start);
 const player={innerHTML:'',hasChildNodes(){return Boolean(this.innerHTML);},getBoundingClientRect(){return {height:this.innerHTML?90:0};}},banner={hidden:false,getBoundingClientRect(){return {height:this.hidden?0:36};}},variables={};
 const track={id:'published',title:'Real published beat',genre:'R&B Beats',status:'Published',duration:180};let currentRoute='store';
 const ctx=vm.createContext({document:{getElementById:id=>id==='player'?player:banner,documentElement:{style:{setProperty:(key,value)=>variables[key]=value}}},$:()=>player,beat:id=>id===track.id?track:undefined,tracks:[track],route:()=>currentRoute,activeTrack:'',sourceURL:'',audio:{paused:true,currentTime:0,volume:.75},favorites:new Set(),cover:()=>'',beatPageLink:()=>track.title,buttonIcon:()=>'',icon:()=>'',escapeHTML:String,clock:()=> '3:00',updateProgress(){}});
 vm.runInContext(await readFile('bulk-deals.js','utf8'),ctx);vm.runInContext(source.slice(start,end),ctx);
 vm.runInContext('renderPlayer()',ctx);assert.equal(player.innerHTML,'');assert.equal(ctx.activeTrack,'');assert.equal(banner.hidden,true);assert.equal(variables['--listening-dock-height'],'0px');
 ctx.activeTrack='published';ctx.sourceURL='/api/media/preview';ctx.audio.paused=false;vm.runInContext('renderPlayer()',ctx);assert(player.innerHTML);assert.equal(banner.hidden,false);
 ctx.audio.paused=true;currentRoute='favorites';vm.runInContext('renderPlayer()',ctx);assert(player.innerHTML,'Paused selected audio still needs its controls');
 currentRoute='studio';vm.runInContext('renderPlayer()',ctx);assert.equal(player.innerHTML,'');assert.equal(banner.hidden,true);
});
