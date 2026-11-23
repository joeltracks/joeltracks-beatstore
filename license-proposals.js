// Seller-requested usage schedule. Saved dashboard wording overrides these defaults.
const jtLicenseProposals=[
  ['Scope','One new song','One new song','One new song','Negotiated'],
  ['Paid copies / downloads','5,000 total','10,000 total','No unit cap','Negotiated'],
  ['Audio-only streams','100,000 total','500,000 total','No audio-stream cap','Negotiated'],
  ['Music videos','1','2','No music-video cap','Negotiated'],
  ['Monetized video views','250,000 total','1,000,000 total','No video-view cap','Negotiated'],
  ['Live performances','No performance-count cap','No performance-count cap','No performance-count cap','Negotiated'],
  ['Radio / TV broadcast','Separate written clearance','Separate written clearance','Separate written clearance','Negotiated'],
  ['Film, ads and games','Separate sync agreement','Separate sync agreement','Separate sync agreement','Negotiated'],
  ['Term','10 years','10 years','10 years','Negotiated'],
  ['Territory','Worldwide','Worldwide','Worldwide','Negotiated'],
  ['Exclusivity','Nonexclusive','Nonexclusive','Nonexclusive','Case-by-case; existing licenses addressed'],
  ['Content ID reference registration','Not permitted for shared beat material','Not permitted for shared beat material','Not permitted for shared beat material','Separate review'],
  ['Producer credit','Produced by Joel Tracks','Produced by Joel Tracks','Produced by Joel Tracks','Negotiated'],
  ['Raw beat / stems resale','Not permitted','Not permitted','Not permitted','Separate agreement if intended'],
  ['Upgrades and reaching a cap','Contact JT before exceeding the cap; new terms required','Contact JT before exceeding the cap; new terms required','Other reserved uses still require consent','Negotiated']
];
function dashboardLicenseDefaults(id){
  const column=['basic','premium','unlimited','custom'].indexOf(id)+1;
  if(!column)return {grant:'',limits:'',terms:''};
  const value=label=>jtLicenseProposals.find(row=>row[0]===label)[column];
  if(id==='custom')return {
    grant:'Price, delivery files, publishing and master splits, permitted uses and exclusivity are negotiated for this beat. Any exclusive arrangement must address existing licenses.',
    limits:'Song count, copies, streams, videos, video views, live performances, broadcast, sync uses, term and territory must be recorded in the negotiated agreement.',
    terms:'Producer credit, Content ID eligibility, raw beat or stems resale, upgrades and all remaining terms require written agreement. Specific negotiated terms appear with the offer revision. Legal contracting details, sample clearance, royalty accounting, termination, governing law and disputes require confirmation and lawyer review.'
  };
  return {
    grant:'Scope: '+value('Scope')+'. Exclusivity: '+value('Exclusivity')+'. Music videos: '+value('Music videos')+'. Live performances: '+value('Live performances')+'. Radio / TV broadcast: '+value('Radio / TV broadcast')+'. Film, ads and games: '+value('Film, ads and games')+'.',
    limits:'Paid copies / downloads: '+value('Paid copies / downloads')+'. Audio-only streams: '+value('Audio-only streams')+'. Monetized video views: '+value('Monetized video views')+'. Term: '+value('Term')+'. Territory: '+value('Territory')+'. '+value('Upgrades and reaching a cap')+'. Counts apply to the licensed new song across outlets; counting definitions and expiry treatment require confirmation.',
    terms:'Content ID reference registration: '+value('Content ID reference registration')+'. Producer credit: '+value('Producer credit')+'. Raw beat / stems resale: '+value('Raw beat / stems resale')+'. Ownership, royalty revenue basis and deductions, artist eligibility, registration, sample clearance, reporting, termination, refunds, governing law and dispute terms require confirmation and review by a qualified lawyer in the applicable jurisdiction.'
  };
}
function licenseProposalReview(){
  return '<details class="proposal-review"><summary>Usage schedule and research notes</summary><p class="proposal-status">Dashboard defaults · editable drafts</p><p>At your request, this schedule now supplies empty dashboard license fields and appears in the matching customer agreement. Saved license wording takes precedence. Prices, file packages and royalty settings are unchanged. These drafts still require review by a qualified lawyer in the applicable jurisdiction.</p>'+table(['Permission','Basic','Premium','Unlimited','Custom'],jtLicenseProposals.map(row=>row.map(escapeHTML)))+'<p>This table records the starting schedule. The editable license fields above are the source of truth for current customer terms. Definitions of streams, copies, short clips, reporting, expiry, remedies and third-party permissions still need agreement. “Unlimited” describes only the stated numeric caps.</p><p>Reference practices: <a href="https://ear2thabeat.com/beat-store/" target="_blank" rel="noopener">store comparison</a> and <a href="https://ear2thabeat.com/faq/" target="_blank" rel="noopener">FAQ</a>. They differ on some video and exclusivity statements. These are one seller’s published practices, not a verified industry-wide standard.</p><p>Read the <a href="LICENSING_PROPOSALS.md" target="_blank" rel="noopener">schedule, original draft framework and source notes</a>. Sources checked November 18, 2026. Viewing a draft creates no contract or active license.</p></details>';
}
