import { generate } from './assets/vendor/ui-generation.js';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const header = document.querySelector('#header');
const player = document.querySelector('#player');
const dialog = document.querySelector('#modal');
const spring = {value:0, target:0, velocity:0};
const toolsSpring = {value:0, target:0, velocity:0};
const dialogSpring = {value:1, target:1, velocity:0};
let tools;
let headerHeight = 88;
let frame = 0;
let lastTime = 0;
let closingDialog = false;
let generationRun;
let lastMotionRoute = "";

const clamp = value => Math.max(0,Math.min(1,value));
const chartResize = new ResizeObserver(entries=>{
  for(const {target,contentRect} of entries){
    target.style.setProperty('--chart-label-size',(12*746/Math.max(1,contentRect.width))+'px');
  }
});
const toolsResize = new ResizeObserver(entries=>{
  for(const {target,contentRect} of entries){
    target.closest('.catalog').style.setProperty('--catalog-controls-height',Math.ceil(contentRect.height)+'px');
  }
});

// Critical damping preserves the current position and velocity when a target changes.
function stepSpring(state, delta, response=.36) {
  if(reducedMotion.matches){
    state.value=state.target;
    state.velocity=0;
    return false;
  }
  const omega=2*Math.PI/response;
  const steps=Math.max(1,Math.ceil(delta*120));
  const dt=delta/steps;
  for(let index=0;index<steps;index++){
    const acceleration=omega*omega*(state.target-state.value)-2*omega*state.velocity;
    state.velocity+=acceleration*dt;
    state.value+=state.velocity*dt;
  }
  if(Math.abs(state.value-state.target)<.0005&&Math.abs(state.velocity)<.005){
    state.value=state.target;
    state.velocity=0;
    return false;
  }
  return true;
}
function requestFrame() {
  if(!frame)frame=requestAnimationFrame(updateFrame);
}
function updateFrame(time) {
  frame=0;
  const delta=Math.min(.032,lastTime?(time-lastTime)/1000:1/60);
  lastTime=time;
  const scroll=window.scrollY;
  spring.target=clamp(scroll/140);
  toolsSpring.target=tools&&tools.getBoundingClientRect().top<=headerHeight+1&&scroll>40?1:0;
  const headerMoving=stepSpring(spring,delta);
  const toolsMoving=stepSpring(toolsSpring,delta,.26);
  const value=clamp(spring.value).toFixed(4);
  header.style.setProperty('--dock-progress',value);
  player.style.setProperty('--dock-progress',value);
  const distance=document.documentElement.scrollHeight-innerHeight;
  header.style.setProperty('--page-progress',String(distance>0?clamp(scroll/distance):0));
  if(tools)tools.style.setProperty('--tools-docked',String(clamp(toolsSpring.value)));
  let dialogMoving=false;
  if(dialog.open){
    dialogMoving=stepSpring(dialogSpring,delta,closingDialog ? .22 : .29);
    const progress=clamp(dialogSpring.value);
    dialog.style.transform='translate3d(0,'+((1-progress)*14).toFixed(3)+'px,0) scale('+(.98+progress*.02).toFixed(5)+')';
    dialog.style.opacity=String(.5+progress*.5);
    if(closingDialog&&!dialogMoving)dialog.close();
  }
  if(headerMoving||toolsMoving||dialogMoving)requestFrame();
  else lastTime=0;
}

// One short route entry. Actions within the current page never replay it.
function animateRouteEntry(){
  const current=location.hash||'#store';
  const previous=lastMotionRoute;
  lastMotionRoute=current;
  if(current===previous||reducedMotion.matches||current.startsWith('#beat-')||previous.startsWith('#beat-'))return;
  const target=document.querySelector('#main [data-enter], #main .workspace-title, #main .page');
  if(!target)return;
  const styles=getComputedStyle(document.documentElement);
  target.animate([{opacity:.7,transform:'translateY(6px)'},{opacity:1,transform:'none'}],{
    duration:parseFloat(styles.getPropertyValue('--motion-entry'))||240,
    easing:styles.getPropertyValue('--motion-ease').trim()||'cubic-bezier(.22,1,.36,1)'
  });
}
function animateCharts() {
  if(reducedMotion.matches)return;
  document.querySelectorAll('.bar-track>span').forEach((element,index)=>{
    const target=getComputedStyle(element).getPropertyValue('--bar-scale').trim()||'0';
    element.animate([{transform:'scaleX(0)'},{transform:'scaleX('+target+')'}],{
      duration:550,easing:'cubic-bezier(.22,1,.36,1)',delay:Math.min(index*40,160)
    });
  });
  const line=document.querySelector('.chart-line');
  if(line)line.animate([
    {strokeDasharray:1,strokeDashoffset:1},
    {strokeDasharray:1,strokeDashoffset:0}
  ],{duration:650,easing:'cubic-bezier(.22,1,.36,1)'});
}
function animateStats() {
  if(reducedMotion.matches)return;
  for(const badge of document.querySelectorAll('.side-count'))badge.animate([{opacity:.5},{opacity:1}],{duration:220,easing:'cubic-bezier(.22,1,.36,1)'});
  const elements=[...document.querySelectorAll('[data-count]')];
  if(elements.length){
    const start=performance.now();
    const finals=elements.map(element=>element.textContent);
    elements.forEach(element=>element.textContent=element.dataset.money==='true'?'$0':'0');
    function count(time){
      const progress=Math.min(1,(time-start)/900);
      const eased=1-Math.pow(1-progress,3);
      elements.forEach((element,index)=>{
        if(!element.isConnected)return;
        if(progress===1||reducedMotion.matches){element.textContent=finals[index];return;}
        const target=Number(element.dataset.count);
        const value=Math.round(target*eased*100)/100;
        element.textContent=element.dataset.money==='true'?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:target%1?2:0}).format(value):Math.round(value).toLocaleString('en-US');
      });
      if(progress<1&&!reducedMotion.matches&&elements.some(element=>element.isConnected))requestAnimationFrame(count);
    }
    requestAnimationFrame(count);
  }
  for(const arc of document.querySelectorAll('.payment-arc')){
    const end=arc.getAttribute('stroke-dasharray');
    arc.animate([{strokeDasharray:'0 100'},{strokeDasharray:end}],{duration:650,easing:'cubic-bezier(.22,1,.36,1)'});
  }
}
function connectView() {
  generationRun?.cancel();
  generationRun=undefined;
  tools=document.querySelector('#catalog-tools');
  toolsResize.disconnect();
  if(tools)toolsResize.observe(tools);
  headerHeight=header.getBoundingClientRect().height;
  chartResize.disconnect();
  const chart=document.querySelector('.chart-visual');
  if(chart)chartResize.observe(chart);
  animateRouteEntry();
  animateCharts();
  animateStats();
  requestFrame();
}
function closeDialog() {
  if(reducedMotion.matches){dialog.close();return;}
  closingDialog=true;
  dialogSpring.target=0;
  requestFrame();
}

document.addEventListener('jt:render',connectView);
document.addEventListener('jt:dialog',event=>{
  closingDialog=false;
  if(!event.detail?.wasOpen){
    dialogSpring.value=0;
    dialogSpring.velocity=0;
  }
  dialogSpring.target=1;
  requestFrame();
});
dialog.addEventListener('cancel',event=>{
  if(reducedMotion.matches)return;
  event.preventDefault();
  closeDialog();
});
dialog.addEventListener('close',()=>{
  closingDialog=false;
  dialogSpring.value=1;
  dialogSpring.target=1;
  dialogSpring.velocity=0;
  dialog.style.transform='';
  dialog.style.opacity='';
});
document.addEventListener('click',event=>{
  if(event.target.closest('#modal [data-action="close"]')&&!reducedMotion.matches){
    event.preventDefault();
    event.stopImmediatePropagation();
    closeDialog();
  }
},true);

// Generation is a deliberate optional replay in the seller chart.
document.addEventListener('click',async event=>{
  if(!event.target.closest('[data-action="chart-reveal"]'))return;
  if(reducedMotion.matches)return;
  const visual=document.querySelector('#activity-visual');
  if(!visual)return;
  await document.fonts.ready;
  if(!visual.isConnected)return;
  generationRun?.cancel();
  generationRun=generate(visual,{variant:'ui',mode:'skeleton',duration:1600,keys:0,maxParts:24});
});
window.addEventListener('scroll',requestFrame,{passive:true});
window.addEventListener('resize',()=>{
  headerHeight=header.getBoundingClientRect().height;
  requestFrame();
},{passive:true});
reducedMotion.addEventListener('change',()=>{
  generationRun?.cancel();
  document.getAnimations().forEach(animation=>{
    const end=animation.effect?.getComputedTiming().endTime;
    if(!Number.isFinite(end)){animation.cancel();return;}
    try{animation.finish();}catch{animation.cancel();}
  });
  requestFrame();
});
connectView();
