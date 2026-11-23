// extract-design proof capture of the live JT footer, with floating chrome hidden only in PNGs.
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {launch,loadPlaywright} from 'file:///C:/Users/BEST/.codex/skills/extract-design/scripts/lib/browser.mjs';
const out=resolve('.taste-skill/footer-review');mkdirSync(out,{recursive:true});
const {chromium}=await loadPlaywright();const browser=await launch(chromium);
const checks=[];
try{
  for(const width of [1440,714,390,320]){
    const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1,reducedMotion:'reduce'});
    await page.goto('http://127.0.0.1:4173/?proof=footer#store',{waitUntil:'networkidle'});
    await page.evaluate(()=>document.fonts.ready);
    await page.locator('#footer').screenshot({path:resolve(out,`footer-${width}.png`),style:'#header,#player,.skip{visibility:hidden !important}'});
    checks.push(await page.evaluate(()=>({width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,platforms:document.querySelectorAll('.release-platforms li').length,uses:document.querySelectorAll('.release-use').length,footerColumns:getComputedStyle(document.querySelector('.site-footer-grid')).gridTemplateColumns,footerHeight:document.querySelector('#footer').getBoundingClientRect().height,newsletterType:document.querySelector('#footer-email').type,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches})));
    await page.close();
  }
  writeFileSync(resolve(out,'layout-checks.json'),JSON.stringify(checks,null,2));
  console.log(JSON.stringify(checks));
}finally{await browser.close();}
