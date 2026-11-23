// Targeted extract-design measurement; preserves the existing JT roles and DESIGN.md.
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {launch,loadPlaywright} from 'file:///C:/Users/BEST/.codex/skills/extract-design/scripts/lib/browser.mjs';
const out=resolve('design-system/source/footer-reference');mkdirSync(out,{recursive:true});
const {chromium}=await loadPlaywright();const browser=await launch(chromium);
try{
  for(const width of [1440,390]){
    const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1});
    await page.goto('https://ear2thabeat.com/beat-store/',{waitUntil:'networkidle',timeout:60000}).catch(()=>{});
    await page.evaluate(()=>document.fonts.ready);
    await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));
    await page.waitForTimeout(700);
    const data=await page.evaluate(()=>{
      const read=e=>{const s=getComputedStyle(e),b=e.getBoundingClientRect();return {tag:e.tagName,text:e.textContent.trim().slice(0,90),width:b.width,height:b.height,background:s.backgroundColor,image:s.backgroundImage,font:s.fontFamily,size:s.fontSize,weight:s.fontWeight,lineHeight:s.lineHeight,padding:s.padding,gap:s.gap,columns:s.gridTemplateColumns}};
      const h=[...document.querySelectorAll('h2')].find(e=>e.textContent.includes('Release &'));
      return {url:location.href,viewport:{width:innerWidth,height:innerHeight},footer:read(document.querySelector('footer')),headings:[...document.querySelectorAll('footer h4')].map(read),columns:[...document.querySelectorAll('footer .e-con-inner')].map(read),release:h?{heading:read(h),container:read(h.parentElement.parentElement.parentElement.parentElement)}:null};
    });
    writeFileSync(resolve(out,`footer-${width}.json`),JSON.stringify({checked:'2026-11-18',...data},null,2));
    await page.screenshot({path:resolve(out,`footer-${width}.png`)});
    console.log(`Measured footer at ${width}px`);await page.close();
  }
}finally{await browser.close();}
