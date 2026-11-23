const categories = ['R&B Beats', 'Afro Beats', 'Trap Beats'];
const tiers = [
  {id:'basic', name:'Basic License', price:50, files:'MP3'},
  {id:'premium', name:'Premium License', price:100, files:'MP3 + WAV'},
  {id:'unlimited', name:'Unlimited License', price:500, files:'MP3 + WAV + Stems'},
  {id:'custom', name:'Custom License', price:null, files:'Negotiated'}
];
const marks = {
  instagram:'<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/>',
  mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  check:'<path d="m5 12 4 4L19 6"/>',
  right:'<path d="m9 6 6 6-6 6"/>',
  external:'<path d="M8 5h11v11M19 5 5 19"/>',
  overview:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  chart:'<path d="M4 3v17h17M8 15l4-5 4 2 5-7"/>',
  wallet:'<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 8h18m-6 4h6v5h-6z"/>',
  inbox:'<path d="M4 4h16l2 13v3H2v-3zm-1 11h5l2 3h4l2-3h5"/>',
  lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
  edit:'<path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 14z"/>',
  upload:'<path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5"/>',
  image:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 6-6 4 4 3-3 5 5"/>',
  search:'<circle cx="10.8" cy="10.8" r="6.5"/><path d="m16 16 4.2 4.2"/>',
  heart:'<path d="M20.8 8.6c0 4.2-8.8 9.6-8.8 9.6s-8.8-5.4-8.8-9.6a4.7 4.7 0 0 1 8.8-2.3 4.7 4.7 0 0 1 8.8 2.3Z"/>',
  cart:'<path d="M3 4h2l2.4 10.3h11.1L21 7H6"/><circle cx="9" cy="19" r="1"/><circle cx="18" cy="19" r="1"/>',
  play:'<path fill="currentColor" stroke="none" d="m9 5 11 7-11 7z"/>',
  pause:'<path fill="currentColor" stroke="none" d="M8 5h3v14H8zm6 0h3v14h-3z"/>',
  prev:'<path d="M5 5v14"/><path fill="currentColor" stroke="none" d="m18 5-11 7 11 7z"/>',
  next:'<path d="M19 5v14"/><path fill="currentColor" stroke="none" d="m6 5 11 7-11 7z"/>',
  volume:'<path d="M3 9h4l5-4v14l-5-4H3zM16 9a4 4 0 0 1 0 6m2-8a7 7 0 0 1 0 10"/>',
  mute:'<path d="M3 9h4l5-4v14l-5-4H3zM16 9l5 6m0-6-5 6"/>',
  x:'<path d="m6 6 12 12M18 6 6 18"/>',
  arrow:'<path d="M4 12h15m-6-6 6 6-6 6"/>',
  down:'<path d="m6 9 6 6 6-6"/>',
  back:'<path d="M20 12H5m6-6-6 6 6 6"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  disc:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2"/><path d="M6.5 10a6 6 0 0 1 3.5-3.5m7.5 7.5a6 6 0 0 1-3.5 3.5"/>',
  menu:'<path d="M5 7h14M5 12h14M5 17h14"/>',
  trash:'<path d="M4 7h16M7 7l1 13h8l1-13M9 7V4h6v3m-5 3v7m4-7v7"/>',
  file:'<path d="M6 3h8l4 4v14H6zM14 3v5h4m-9 4h6m-6 4h6"/>',
  headphones:'<path d="M4 13v-2a8 8 0 0 1 16 0v2m-16-1h3v7H5a1 1 0 0 1-1-1zm16 0h-3v7h2a1 1 0 0 0 1-1z"/>'
};
function icon(name, size=20) {
  return '<svg aria-hidden="true" width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">'+marks[name]+'</svg>';
}
