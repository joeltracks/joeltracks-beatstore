from pathlib import Path

p=Path('storefront.js');s=p.read_text(encoding='utf-8')
s=s.replace("function renderReferenceStore(){\n", "function renderReferenceStore(){\n  const refinementsOpen=!compactCatalog.matches||catalogFiltersOpen;\n")
s=s.replace('Find your next beat.</h1>','Find your next beat</h1>')
s=s.replace('R&B, Afro and Trap beats. Listen, save your favorites and choose a license from ', 'R&B, Afro and Trap beats from Joel Tracks. Licenses from ')
s=s.replace('>Explore the beats</h2>','>Beat library</h2>')
s=s.replace('placeholder="Search titles, moods, tags…"','placeholder="Search beats or tags"')
old='<div class="store-filter-bottom">'
new='<details class="catalog-refinements" id="catalog-refinements"\'+(refinementsOpen?\' open\':\'\')+\'><summary><span>Tags & sort</span><small id="filter-summary"></small>\'+icon(\'down\',16)+\'</summary><div class="store-filter-bottom">'
assert old in s;s=s.replace(old,new,1)
old='</select></label></div></div><div id="results">'
new='</select></label></div></details></div><div id="results">'
assert old in s;s=s.replace(old,new,1)
s=s.replace("  $('#sort').value=sorting;", "  $('#catalog-refinements').addEventListener('toggle',event=>{\n    if(compactCatalog.matches)catalogFiltersOpen=event.currentTarget.open;\n  });\n  $('#sort').value=sorting;")
for old,new in [('Choose the files your release needs.</h2>','Choose the files your release needs</h2>'),('Find it. Choose it. Review it.</h2>','Find it. Choose it. Review it</h2>'),("page('Choose a license.'","page('Compare licenses'"),('A few things to know.</h2>','A few things to know</h2>')]:s=s.replace(old,new)
p.write_text(s,encoding='utf-8')

p=Path('design.js');s=p.read_text(encoding='utf-8')
s=s.replace("  $('#catalog-count').textContent", "  const filterSummary=$('#filter-summary');\n  if(filterSummary)filterSummary.textContent=tag?'#'+tag:sorting==='title'?'Title A–Z':sorting==='bpm'?'BPM ↑':'';\n  $('#catalog-count').textContent",1)
s=s.replace('<h2>Listening activity</h2>',"<h2>'+(chartMetric==='revenue'?'License revenue':'Preview activity')+'</h2>")
s=s.replace('A closer look at your beats and your business.','Revenue, listening and catalog activity for the selected period.')
s=s.replace('>Keep things moving</h2>','>Manage your store</h2>')
s=s.replace('icon(mark,19)','icon(mark,18)')
s=s.replace('Review your license.</h1>','Review your license</h1>')
s=s.replace("page('Let’s talk records.'","page('Let’s talk records'")
p.write_text(s,encoding='utf-8')

p=Path('footer.js');s=p.read_text(encoding='utf-8').replace('Your song. Your next release.</h2>','Your song. Your next release</h2>').replace('Stay close to the music.</h2>','Stay close to the music</h2>');p.write_text(s,encoding='utf-8')
