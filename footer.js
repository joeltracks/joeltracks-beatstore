document.addEventListener('click',event=>{
  const link=event.target.closest('[data-footer-category],[data-footer-target]');
  if(!link||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  event.preventDefault();
  const category=link.dataset.footerCategory;
  if(category){genre=category;query='';tag='';shown=12;}
  const target=link.dataset.footerTarget||'beat-catalog';
  const jump=()=>requestAnimationFrame(()=>{
    const destination=document.getElementById(target);
    if(!destination)return;
    destination.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
    if(target==='beat-catalog')document.querySelector('#categories [aria-pressed="true"]')?.focus({preventScroll:true});
    else {destination.setAttribute('tabindex','-1');destination.focus({preventScroll:true});}
  });
  if(route()==='store'){renderRoute();jump();}
  else {window.addEventListener('hashchange',jump,{once:true});location.hash='store';}
});
