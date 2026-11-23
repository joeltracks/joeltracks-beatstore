// Frontend cart pricing. Work in cents and reconcile per-beat rounding to the total.
function calculateBulkDeal(prices) {
  const cents=prices.map(price=>Math.round(Number(price)*100));
  const rate=cents.length>=3?25:cents.length===2?15:0;
  const subtotalCents=cents.reduce((sum,price)=>sum+price,0);
  const discountCents=Math.round(subtotalCents*rate/100);
  const discounts=cents.map(price=>Math.floor(price*rate/100));
  const priority=cents.map((price,index)=>({index,remainder:(price*rate)%100}))
    .sort((a,b)=>b.remainder-a.remainder||a.index-b.index);
  const pennies=discountCents-discounts.reduce((sum,value)=>sum+value,0);
  for(let index=0;index<pennies;index++)discounts[priority[index].index]++;
  return {count:cents.length,rate,subtotalCents,discountCents,totalCents:subtotalCents-discountCents,
    items:cents.map((priceCents,index)=>({priceCents,discountCents:discounts[index],totalCents:priceCents-discounts[index]}))};
}

let bulkDockObserver;
function syncBulkDock() {
  const player=document.getElementById('player');
  const banner=document.getElementById('bulk-banner');
  const playerHeight=player.getBoundingClientRect().height;
  const bannerHeight=banner.getBoundingClientRect().height;
  document.documentElement.style.setProperty('--player-dock-height',playerHeight+'px');
  document.documentElement.style.setProperty('--listening-dock-height',(playerHeight+bannerHeight)+'px');
}
function renderBulkBanner() {
  const banner=document.getElementById('bulk-banner');
  if(!banner||banner.hasChildNodes())return;
  const group='<span class="bulk-ticker-group"><span>Buy 2 beats, get <strong>15% off</strong></span><span class="bulk-ticker-separator" aria-hidden="true">•</span><span>Buy 3 or more beats, get <strong>25% off</strong></span><span class="bulk-ticker-separator" aria-hidden="true">•</span><span class="bulk-ticker-auto">Automatically applied in your cart</span><span class="bulk-ticker-separator" aria-hidden="true">•</span></span>';
  banner.innerHTML='<p class="sr-only">Bulk beat deals: buy 2 beats and get 15% off. Buy 3 or more beats and get 25% off. Discounts apply automatically in your cart. Hover over or focus this strip to pause scrolling.</p><div class="bulk-ticker-window" aria-hidden="true"><div class="bulk-ticker-track" id="bulk-ticker-track">'+group+group+'</div></div>';
  bulkDockObserver=new ResizeObserver(syncBulkDock);
  bulkDockObserver.observe(document.getElementById('player'));
  bulkDockObserver.observe(banner);
}
