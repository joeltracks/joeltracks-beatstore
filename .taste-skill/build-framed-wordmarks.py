"""Five full-name-only logo concepts. Existing website assets remain untouched."""
from pathlib import Path
from urllib.request import urlretrieve
import sys, html, json
sys.path.insert(0,str(Path(__file__).parent/'font-tools'))
sys.path.insert(0,str(Path(__file__).parent/'vector-tools'))
import pathops
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.svgLib.path import parse_path

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/branding/framed-wordmarks-20261118'
OUT.mkdir(parents=True,exist_ok=True)
SOURCE=OUT/'sources';SOURCE.mkdir(exist_ok=True)
VERSION=sys.argv[1] if len(sys.argv)>1 else 'v1'
for name,url in [('BarlowCondensed-Bold.ttf','BarlowCondensed-Bold.ttf'),('BarlowCondensed-OFL.txt','OFL.txt')]:
    if not (SOURCE/name).exists():
        urlretrieve('https://raw.githubusercontent.com/google/fonts/main/ofl/barlowcondensed/'+url,SOURCE/name)

def n(v):return format(v,'.2f').rstrip('0').rstrip('.') if isinstance(v,float) else str(v)
def trans(d,t):
    p=SVGPathPen(None,ntos=n);parse_path(d,TransformPen(p,t));return p.getCommands()
def bounds(d):
    p=BoundsPen(None);parse_path(d,p);return p.bounds
def fit(d,x,y,w,h):
    a,b,c,e=bounds(d);s=min(w/(c-a),h/(e-b))
    return trans(d,(s,0,0,s,x+(w-(c-a)*s)/2-a*s,y+(h-(e-b)*s)/2-b*s))
def typepath(file,text,axes=None,pairs=None,tracking=0):
    f=TTFont(file)
    if 'fvar' in f and axes:
        tags={a.axisTag for a in f['fvar'].axes};f=instantiateVariableFont(f,{k:v for k,v in axes.items() if k in tags},inplace=False)
    glyphs=f.getGlyphSet();cmap=f.getBestCmap();pen=SVGPathPen(glyphs,ntos=n);cursor=0;prev=''
    kern={}
    if 'kern' in f:
        for table in f['kern'].kernTables:kern.update(table.kernTable)
    for char in text:
        name=cmap[ord(char)]
        if prev:cursor+=kern.get((cmap[ord(prev)],name),0)+(pairs or {}).get(prev+char,0)
        glyphs[name].draw(TransformPen(pen,(1,0,0,-1,cursor,0)))
        cursor+=f['hmtx'].metrics[name][0]+tracking;prev=char
    return pen.getCommands()
def path(d,rule='nonzero'):return f'<path fill="#151515" fill-rule="{rule}" d="{d}"/>'
def knockout(outer,lettering):
    a=pathops.Path();b=pathops.Path()
    parse_path(outer,a.getPen());parse_path(lettering,b.getPen())
    result=pathops.op(a,b,pathops.PathOp.DIFFERENCE)
    pen=SVGPathPen(None,ntos=n);result.draw(pen);return pen.getCommands()
concepts=[]
def save(key,name,style,idea,width,content):
    title=html.escape('Joel Tracks — '+name)
    svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} 256" role="img" aria-labelledby="title"><title id="title">{title}</title>{content}</svg>'
    file=OUT/f'{key}-{VERSION}.svg';file.write_text(svg,encoding='utf-8')
    concepts.append(dict(key=key,name=name,style=style,idea=idea,width=width,svg=svg,file=file.name))

# A: four original corner brackets, with alternating long/short legs.
# The diagonal-opposite lengths establish a quiet visual rhythm without boxing the type in.
aw=typepath(ROOT/'assets/fonts/space-grotesk-logo-source.ttf','Joel Tracks',{'wght':560},
            pairs={'Jo':-15,'Tr':-65,'ra':-15,'ck':-8},tracking=-8)
af='M24 40H156V52H36V112H24ZM816 40H936V112H924V52H816ZM24 144H36V204H144V216H24ZM924 144H936V216H804V204H924Z'
save('a-open-frame','Open Frame','Open corner brackets','Precisely spaced lettering with a frame that leaves room to breathe.',960,
     path(af)+path(fit(aw,80,68,800,120)))

# B: one solid capsule; the outlined lettering is a true transparent knockout.
bw=typepath(ROOT/'assets/branding/exploration-20261118/sources/Fraunces.ttf','joel tracks',
            {'wght':650,'opsz':72,'SOFT':75,'WONK':1},pairs={'jo':-15,'tr':-30,'ra':-10,'l ':35,' t':35},tracking=-8)
capsule='M120 20H840A108 108 0 0 1 948 128A108 108 0 0 1 840 236H120A108 108 0 0 1 12 128A108 108 0 0 1 120 20Z'
save('b-soft-seal','Soft Seal','Filled capsule','Soft serif lettering cut directly into a generous capsule.',960,
     path(knockout(capsule,fit(bw,96,60,768,136))))

# C: a deliberate stepped outline, squared inside corners and condensed type.
cw=typepath(SOURCE/'BarlowCondensed-Bold.ttf','JOEL TRACKS',tracking=4,pairs={'TR':-15,'RA':-15})
cf='M12 52H52V12H588V52H628V204H588V244H52V204H12ZM24 64V192H64V232H576V192H616V64H576V24H64V64Z'
save('c-session-label','Session Label','Stepped frame','Condensed lettering in a stepped frame inspired by a session label.',640,
     path(cf,'evenodd')+path(fit(cw,76,64,488,128)))

# D: a tapered open orbit, with an intentionally asymmetric opening at upper right.
dw=typepath(ROOT/'assets/branding/exploration-20261118/sources/Yellowtail.ttf','Joel Tracks',
            pairs={'Jo':-15,'Tr':-35,'l ':40,' T':40},tracking=-2)
df='M856 52C772 26 632 16 476 24C220 36 28 84 24 142C20 204 230 244 494 232C744 221 940 170 936 112C935 100 926 89 910 80L900 87C914 96 922 105 922 115C922 165 730 210 492 220C240 232 38 198 38 142C38 91 224 48 478 36C628 29 768 38 852 62Z'
save('d-orbit','Orbit','Open oval signature','A flowing full-name signature wrapped by one tapered orbit.',960,
     path(df)+path(fit(dw,138,64,684,128)))

# E: a tabbed perimeter with two rounded bottom corners. No additional symbol.
ew=typepath(ROOT/'assets/fonts/bricolage-grotesque-latin.woff2','Joel Tracks',{'wght':650},
            pairs={'Jo':-15,'Tr':-40,'ra':-12,'ck':-10,'l ':80,' T':80},tracking=-8)
ef='M24 72H568L608 32H936V192Q936 224 904 224H56Q24 224 24 192ZM36 84V192Q36 212 56 212H904Q924 212 924 192V44H613L573 84Z'
save('e-index','Index','Asymmetric tab','A single raised tab gives the full name a recognizable edge.',960,
     path(ef,'evenodd')+path(fit(ew,84,102,792,88)))

# Two-column board: large concepts plus honest 48px-high reversed header tests.
# Presentation labels may use text; the logo masters above contain outlined paths only.
W,H=1600,1576
parts=[f'<rect width="{W}" height="{H}" fill="#f5f4f0"/>',
       '<text x="64" y="68" font-size="40" font-weight="650" fill="#151515">Joel Tracks / Framed wordmarks</text>',
       '<text x="64" y="108" font-size="21" fill="#60605c">Five new directions • Full name only • No initials or monograms</text>']
positions=[(64,144),(816,144),(64,600),(816,600),(440,1056)]
for i,(c,(x,y)) in enumerate(zip(concepts,positions)):
    parts.append(f'<rect x="{x}" y="{y}" width="720" height="424" rx="12" fill="#fff" stroke="#d8d8d2"/>')
    label=html.escape(f'{chr(65+i)} — {c["name"]}')
    parts.append(f'<text x="{x+32}" y="{y+44}" font-size="25" font-weight="650" fill="#151515">{label}</text>')
    parts.append(f'<text x="{x+32}" y="{y+76}" font-size="18" fill="#6a6a65">{html.escape(c["style"])}</text>')
    content=c['svg'].split('</title>',1)[1].rsplit('</svg>',1)[0]
    parts.append(f'<svg x="{x+32}" y="{y+100}" width="656" height="200" viewBox="0 0 {c["width"]} 256">{content}</svg>')
    parts.append(f'<rect x="{x+24}" y="{y+320}" width="672" height="80" rx="5" fill="#151515"/>')
    inverse=content.replace('#151515','#f7f7f3')
    display_w=c['width']*48/256
    parts.append(f'<svg x="{x+44}" y="{y+336}" width="{display_w}" height="48" viewBox="0 0 {c["width"]} 256">{inverse}</svg>')
    parts.append(f'<text x="{x+666}" y="{y+366}" font-size="15" text-anchor="end" fill="#bdbdb7">48px header preview</text>')
parts.append('<text x="800" y="1536" text-anchor="middle" font-size="18" fill="#60605c">Concepts for selection — the current website logo is unchanged</text>')
board=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" font-family="Segoe UI,Arial,sans-serif">'+''.join(parts)+'</svg>'
(OUT/f'five-framed-wordmarks-{VERSION}.svg').write_text(board,encoding='utf-8')
(OUT/f'concepts-{VERSION}.json').write_text(json.dumps([{k:v for k,v in c.items() if k!='svg'} for c in concepts],indent=2),encoding='utf-8')
print('Created five framed, full-name-only concepts:',OUT)
