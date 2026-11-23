"""Rebuild JT's approved C identity from local font outlines and explicit geometry."""
from pathlib import Path
import sys
import json
sys.path.insert(0, str(Path(__file__).parent / 'font-tools'))
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

root = Path(__file__).resolve().parents[1]
out = root / 'assets/branding/two-takes'
out.mkdir(parents=True, exist_ok=True)
ink = '#1c1d1f'
paper = '#eeeeeb'
accent = '#c2501b'
symbol = 'M32 32H224V68H68V152H32ZM224 104V224H32V188H188V104Z'
reverse = 'M33 33H223V67H67V151H33ZM223 105V223H33V189H189V105Z'
small = 'M2 2H14V4H4V9.5H2ZM14 6.5V14H2V12H12V6.5Z'

def svg(name, box, body, title):
    (out/name).write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{box}" role="img"><title>{title}</title>{body}</svg>\n', encoding='utf-8')

svg('jt-symbol.svg', '0 0 256 256', f'<path fill="{ink}" d="{symbol}"/>', 'JT / Joel Tracks — Two Takes')
svg('jt-symbol-reversed.svg', '0 0 256 256', f'<path fill="{paper}" d="{reverse}"/>', 'JT / Joel Tracks — reversed')
svg('jt-symbol-small.svg', '0 0 16 16', f'<path fill="{ink}" d="{small}"/>', 'JT / Joel Tracks — small-size mark')

font = TTFont(root/'assets/fonts/bricolage-grotesque-latin.woff2')
axes = {axis.axisTag:axis.defaultValue for axis in font['fvar'].axes}
axes.update({k:v for k,v in {'wght':600,'opsz':24,'wdth':100}.items() if k in axes})
font = instantiateVariableFont(font, axes, inplace=False)
glyphs = font.getGlyphSet()
cmap = font.getBestCmap()
units = font['head'].unitsPerEm
pen = SVGPathPen(glyphs, ntos=lambda value:format(value,'.2f').rstrip('0').rstrip('.') if isinstance(value,float) else str(value))
bounds = BoundsPen(glyphs)
cursor = 0
previous = ''
for character in 'joel tracks':
    cursor += {('t','r'):-10, ('r','a'):-12, ('c','k'):-5}.get((previous, character),0)
    glyph_name = cmap[ord(character)]
    glyphs[glyph_name].draw(TransformPen(pen,(1,0,0,1,cursor,0)))
    glyphs[glyph_name].draw(TransformPen(bounds,(1,0,0,1,cursor,0)))
    cursor += font['hmtx'].metrics[glyph_name][0] - 8
    previous = character
path = pen.getCommands()
x0,y0,x1,y1 = bounds.bounds
scale = 152 / units
word_width = (x1-x0)*scale
word_height = (y1-y0)*scale

def word(x, y, size=1, color=ink):
    s=scale*size
    return f'<path fill="{color}" transform="matrix({s:g} 0 0 {-s:g} {x-x0*s:g} {y+y1*s:g})" d="{path}"/>'

width = round(288+word_width+32)
horizontal = f'<path fill="{ink}" d="{symbol}"/>'+word(288,(256-word_height)/2-2)
svg('jt-horizontal.svg',f'0 0 {width} 256',horizontal,'JT / Joel Tracks')
svg('jt-horizontal-reversed.svg',f'0 0 {width} 256',f'<path fill="{paper}" d="{reverse}"/>'+word(288,(256-word_height)/2-2,color=paper),'JT / Joel Tracks — reversed')
stack_width=round(word_width+64)
svg('jt-stacked.svg',f'0 0 {stack_width} 472',f'<path fill="{ink}" transform="translate({(stack_width-256)/2:g} 0)" d="{symbol}"/>'+word(32,300),'JT / Joel Tracks — stacked')
svg('jt-wordmark.svg',f'0 0 {round(word_width+64)} {round(word_height+64)}',word(32,32),'Joel Tracks wordmark')

# The favicon uses a two-pixel grid at 16px. Light and dark tabs share a stable tile.
favicon = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><title>JT</title><rect width="16" height="16" rx="3" fill="{ink}"/><path fill="{paper}" d="{small}"/></svg>\n'
(root/'assets/jt-mark.svg').write_text(favicon,encoding='utf-8')

spec = {
    'brand':'JT / Joel Tracks','final':True,'round':2,'greyscale':False,
    'brief':'A listening-first store for R&B, Afro and Trap beats. The selected Two Takes mark uses two offset track corners around an open center.',
    'adjectives':['direct','rhythmic','assured'],
    'criteria':'Retain the approved C silhouette, keep the small-size gap open and pair the symbol with readable outlined lettering.',
    'brand_color':ink,'mockups':['website','favicon-tab','social','sticker','tshirt','app-icon'],
    'nav':['Beats','Favorites','Contacts','Blog'],
    'concepts':[{'name':'Two Takes','symbol':'jt-symbol.svg','lockup':'jt-horizontal.svg','stacked':'jt-stacked.svg','avatar':'jt-symbol.svg','lockup_on_dark':'jt-horizontal-reversed.svg','symbol_on_tile':'jt-symbol-reversed.svg','idea':'Two offset track corners share one open center.','rationale':['Approved direction C with its original square silhouette.','Outlined Bricolage Grotesque lettering needs no font installation.','Small-size cut follows a two-pixel grid at 16px.']}],
    'recommendation':'Selected direction C has been applied to the frontend. Digital masters and web icons accompany the usage guide. Mockups illustrate possible brand uses only.',
    'next_steps':['Keep the symbol upright and preserve the open center.','Use the horizontal lockup when the name needs to be read.','Arrange professional trademark clearance before commercial adoption.']
}
(out/'presentation.json').write_text(json.dumps(spec,indent=2),encoding='utf-8')
print(json.dumps({'horizontal_width':width,'word_width':word_width,'word_height':word_height,'axes':axes}))
