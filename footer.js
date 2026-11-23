// Reference-inspired JT footer. Platform names are examples, not integrations.
function customerFooter(){
  const platforms=['Spotify','Apple Music','Amazon Music','YouTube','Deezer','TIDAL'];
  const uses=[
    ['footerAudio','Audio releases','Streaming services and digital downloads, within your license’s stream and copy limits.'],
    ['footerVideo','Music videos','Share your finished video within the video and monetized-view limits of your selected license.'],
    ['footerLive','Live performances','Take your song to the stage according to your license’s performance permissions.']
  ];
  const browse=[['All beats','All beats'],...categories.map(name=>[name,name])];
  return '<section class="release-band" aria-labelledby="release-title"><div class="shell"><div class="release-heading"><div><p class="section-label">Beyond the studio</p><h2 id="release-title">Your song. Your next release</h2><p>Make a song with a JT beat, then plan where it goes. Your selected license sets the permitted uses and limits.</p></div><a class="text-link" href="#licenses">Explore license rights '+icon('arrow',17)+'</a></div><p class="platform-label">Examples of release platforms</p><ul class="release-platforms" aria-label="Examples of release platforms">'+platforms.map(name=>'<li>'+name+'</li>').join('')+'</ul><div class="release-uses">'+uses.map(([graphic,title,copy])=>'<article class="release-use">'+jtGraphics[graphic]+'<h3>'+title+'</h3><p>'+copy+'</p></article>').join('')+'</div><p class="release-footnote">Arrange distribution yourself or through your distributor. Platform requirements also apply. For radio, TV, film, ads or games, <a href="#contacts">discuss a custom agreement with JT</a>.</p></div></section><div class="site-footer-main"><div class="shell site-footer-grid"><section class="site-footer-column footer-about" aria-label="About Joel Tracks">'+brandLink()+'<p>R&B, Afro and Trap beats by Joel Tracks. Find your sound, choose your license and build your next record.</p><a class="text-link" href="#contacts">Talk to JT '+icon('external',15)+'</a></section><nav class="site-footer-column" aria-labelledby="footer-shop-title"><h2 id="footer-shop-title">Find your sound</h2>'+browse.map(([label,category])=>'<a href="#store" data-footer-category="'+escapeHTML(category)+'">'+escapeHTML(label)+'</a>').join('')+'<a href="#favorites">Favorites</a></nav><nav class="site-footer-column" aria-labelledby="footer-help-title"><h2 id="footer-help-title">Here to help</h2><a href="#licenses">Licenses & usage</a><a href="#contacts">Custom licensing</a><a href="#store" data-footer-target="store-questions-title">FAQs</a><a href="#contacts">Contact JT</a><a href="#blog">The blog</a></nav><section class="site-footer-column footer-newsletter" aria-labelledby="footer-newsletter-title"><h2 id="footer-newsletter-title">Stay close to the music</h2><p>New beats, release notes and JT updates.</p><form id="footer-newsletter"><label for="footer-email">Email address</label><div class="footer-email-row"><input id="footer-email" name="email" type="email" autocomplete="email" required maxlength="254" placeholder="you@example.com" aria-describedby="footer-signup-note"><button class="btn" type="submit">Preview signup '+icon('arrow',16)+'</button></div><p id="footer-signup-note" class="footer-form-note">Signup preview only. No subscription is created or email sent.</p><p id="footer-signup-status" class="footer-signup-status" role="status" aria-live="polite"></p></form></section></div><div class="shell site-footer-bottom"><p>© '+new Date().getFullYear()+' Joel Tracks</p><p>Frontend preview · Demo audio & data</p><nav aria-label="Preview utilities"><a href="GUIDE.md" target="_blank" rel="noopener">Review notes</a><a href="#studio">Seller demo</a></nav></div></div>';
}
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
document.addEventListener('submit',event=>{
  if(event.target.id!=='footer-newsletter')return;
  event.preventDefault();
  document.getElementById('footer-signup-status').textContent='Preview complete. No subscription was created or email sent.';
});
