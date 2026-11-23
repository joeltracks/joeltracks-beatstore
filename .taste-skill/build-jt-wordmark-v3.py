"""Replace only the lettering: Space Grotesk 650, optical spacing, outlined SVG."""
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).parent/'font-tools'))
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

root=Path(__file__).resolve().parents[1]
out=root/'assets/branding/two-takes-v3'
out.mkdir(parents=True,exist_ok=True)
font=instantiateVariableFont(TTFont(root/'assets/fonts/space-grotesk-logo-source.ttf'),{'wght':650},inplace=False)
glyphs=font.getGlyphSet()
cmap=font.getBestCmap()
pen=SVGPathPen(glyphs,ntos=lambda value:format(value,'.3f').rstrip('0').rstrip('.') if isinstance(value,float) else str(value))
bounds=BoundsPen(glyphs)
cursor=0
previous=''
adjustments={('J','o'):-12,('o','e'):-8,('T','r'):-65,('r','a'):-16,('a','c'):-8,('c','k'):-10,('k','s'):-8}
for character in 'Joel Tracks':
    cursor+=adjustments.get((previous,character),0)
    name=cmap[ord(character)]
    transform=(1,0,0,1,cursor,0)
    glyphs[name].draw(TransformPen(pen,transform))
    glyphs[name].draw(TransformPen(bounds,transform))
    cursor+=font['hmtx'].metrics[name][0]-8
    previous=character
x0,y0,x1,y1=bounds.bounds
scale=142/(y1-y0)
width=round(288+(x1-x0)*scale+32)
word_transform=(scale,0,0,-scale,288-x0*scale,128+(y0+y1)*scale/2)
matrix=' '.join(format(number,'.6g') for number in word_transform)
symbol='M32 32H224V68H68V152H32ZM224 104V224H32V188H188V104Z'
for name,color in [('jt-horizontal.svg','#edf7f8'),('jt-horizontal-dark.svg','#15191c')]:
    svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} 256" fill="{color}" role="img"><title>JT / Joel Tracks — Space Grotesk wordmark</title><path d="{symbol}"/><path transform="matrix({matrix})" d="{pen.getCommands()}"/></svg>\n'
    (out/name).write_text(svg,encoding='utf-8')
print(f'Outlined logo: {width} x 256; Space Grotesk 650; title case; mark unchanged')
