from pathlib import Path
p=Path('motion.js');s=p.read_text(encoding='utf-8')
s=s.replace('const appeared = new WeakSet();\nlet intro;\nlet artwork;\n','')
s=s.replace('let entranceDelay = 0;','let lastMotionRoute = "";')
start=s.index('  if(artwork&&intro){');end=s.index('  let dialogMoving=false;',start);s=s[:start]+s[end:]
start=s.index('const arrivals = new IntersectionObserver');end=s.index('function animateCharts()',start)
s=s[:start]+'''// One short route entry. Actions within the current page never replay it.
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
''' + s[end:]
s=s.replace("badge.animate([{opacity:.5,transform:'scale(.85)'},{opacity:1,transform:'scale(1)'}]", "badge.animate([{opacity:.5},{opacity:1}]")
s=s.replace('  arrivals.disconnect();\n','').replace("  intro=document.querySelector('.store-intro');\n",'').replace("  artwork=document.querySelector('.featured-art');\n",'')
start=s.index("  for(const element of document.querySelectorAll('[data-enter]')){");end=s.index('  animateCharts();',start)
s=s[:start]+'  animateRouteEntry();\n'+s[end:]
s=s.replace("document.addEventListener('jt:catalog',()=>observeContent(true));\n",'')
p.write_text(s,encoding='utf-8')
