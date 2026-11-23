import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {launch,loadPlaywright} from 'file:///C:/Users/BEST/.codex/skills/extract-design/scripts/lib/browser.mjs';
const {chromium}=await loadPlaywright();const browser=await launch(chromium);
const results=[];
try{
  for(const [width,height] of [[320,844],[390,844],[714,662],[1440,900]]){
    const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
    await page.goto('http://127.0.0.1:4173/?check=polish2#store',{waitUntil:'networkidle'});
    await page.evaluate(()=>document.fonts.ready);
    const value=await page.evaluate(()=>{
      const row=document.querySelector('#results .track'),dock=document.querySelector('#player').getBoundingClientRect(),banner=document.querySelector('#bulk-banner').getBoundingClientRect();
      const control=e=>{const b=e.getBoundingClientRect();return {label:e.getAttribute('aria-label'),width:b.width,height:b.height}};
      return {width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth,filtersOpen:document.querySelector('#catalog-refinements').open,summaryDisplay:getComputedStyle(document.querySelector('#catalog-refinements>summary')).display,firstRowTop:row.getBoundingClientRect().top,playerTop:dock.top,bannerTop:banner.top,bannerBottom:banner.bottom,bannerButtons:document.querySelectorAll('#bulk-banner button').length,visibleRows:[...document.querySelectorAll('#results .track')].filter(e=>e.getBoundingClientRect().bottom<=Math.min(dock.top,banner.top)+1).length,controls:[...row.querySelectorAll('.cover-play,.icon-btn,.add-beat')].map(control),animations:document.getAnimations().filter(a=>a.playState==='running').length,footerPlatforms:document.querySelectorAll('.release-platforms li').length};
    });
    if(value.overflow){
      console.log('Overflow details:',JSON.stringify(await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,boxes:[...document.querySelectorAll('body *')].map(e=>({id:e.id,class:typeof e.className==='string'?e.className:'svg',right:e.getBoundingClientRect().right,width:e.getBoundingClientRect().width})).filter(e=>e.right>innerWidth+1&&e.width>0).slice(0,12)}))));
      await page.screenshot({path:'.taste-skill/bulk-overflow.png'});
    }
    assert.equal(value.overflow,false,'No horizontal overflow at '+width+'px');
    assert.equal(value.filtersOpen,width>900);
    assert.equal(value.animations,0);
    assert.equal(value.bannerButtons,0);
    assert.ok(Math.abs(value.bannerBottom-value.playerTop)<1,'Offer strip directly above player at '+width);
    assert.equal(value.footerPlatforms,6);
    if(width===714)console.log('Tablet:',JSON.stringify(value));
    assert.ok(value.visibleRows>=1,'At least one complete beat row above the player at '+width);
    for(const control of value.controls){assert.ok(control.width>=44,control.label+' width');assert.ok(control.height>=44,control.label+' height');}
    results.push(value);await page.close();
  }
  mkdirSync('.taste-skill/unslop-refinement',{recursive:true});
  writeFileSync('.taste-skill/unslop-refinement/layout-checks.json',JSON.stringify(results,null,2));
  console.log('PASS: responsive filters, 44px row controls, no page overflow, retained footer and static reduced-motion rendering');
  console.log(JSON.stringify(results.map(({width,firstRowTop,visibleRows})=>({width,firstRowTop,visibleRows}))));
}finally{await browser.close();}
