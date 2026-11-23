"""Five independent JT identity directions; concept files only, no site changes."""
from pathlib import Path
import sys, html, json
sys.path.insert(0, str(Path(__file__).parent/'font-tools'))
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.svgLib.path import parse_path

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/branding/exploration-20261118'
OUT.mkdir(parents=True,exist_ok=True)
def num(v):
    return format(v,'.2f').rstrip('0').rstrip('.') if isinstance(v,float) else str(v)
def transformed(d, transform):
    p=SVGPathPen(None,ntos=num)
    parse_path(d,TransformPen(p,transform))
    return p.getCommands()
def box(d):
    p=BoundsPen(None);parse_path(d,p);return p.bounds
def fitted(d,x,y,w,h):
    a,b,c,e=box(d);s=min(w/(c-a),h/(e-b))
    return transformed(d,(s,0,0,s,x+(w-(c-a)*s)/2-a*s,y+(h-(e-b)*s)/2-b*s))
def outline(file,text,axes=None,tracking=0,pairs=None):
    f=TTFont(file)
    if axes and 'fvar' in f:
        available={a.axisTag for a in f['fvar'].axes}
        f=instantiateVariableFont(f,{k:v for k,v in axes.items() if k in available},inplace=False)
    gs=f.getGlyphSet(); cmap=f.getBestCmap();p=SVGPathPen(gs,ntos=num);cursor=0;prev=''
    kern={}
    if 'kern' in f:
        for k in f['kern'].kernTables:kern.update(k.kernTable)
    for char in text:
        g=cmap[ord(char)]
        if prev:
            cursor+=kern.get((cmap[ord(prev)],g),0)+(pairs or {}).get(prev+char,0)
        gs[g].draw(TransformPen(p,(1,0,0,-1,cursor,0)))
        cursor+=f['hmtx'].metrics[g][0]+tracking;prev=char
    return p.getCommands()
def svg(name,d,w=256,h=256):
    title=html.escape('JT / Joel Tracks — '+name)
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" role="img" aria-labelledby="title"><title id="title">{title}</title><path fill="#151515" fill-rule="nonzero" d="{d}"/></svg>\n'
def save(key,name,symbol,wordmark,width):
    (OUT/f'{key}-symbol-v4.svg').write_text(svg(name+' symbol',symbol),encoding='utf-8')
    (OUT/f'{key}-wordmark-v4.svg').write_text(svg(name+' wordmark',wordmark,width),encoding='utf-8')

# A: a single shared bar ties two clear stems together; wide apertures, 32-unit weight.
a='M80 32H240V64H208V192H176V64H144V160C144 195.35 115.35 224 80 224C44.65 224 16 195.35 16 160V144H48V160C48 177.67 62.33 192 80 192C97.67 192 112 177.67 112 160V64H80Z'
aw=outline(ROOT/'assets/fonts/space-grotesk-logo-source.ttf','joel tracks',{'wght':620},tracking=-12,pairs={'jo':-10,'tr':-26,'ra':-18,'ac':-10,'ck':-8,'ks':-8})
save('a-counterpoint','Counterpoint',a,fitted(aw,32,56,896,144),960)

# B: original contrasting serif monogram, with a bracketed T and open J bowl.
b='M68 36H144V48H124V168C124 207 101 228 68 228C38 228 20 212 20 192C20 179 29 172 40 172C50 172 57 179 57 188C57 201 46 206 38 200C43 211 54 216 68 216C88 216 94 200 94 176V48H68ZM136 36H236L240 84H228C224 58 216 48 196 48H192V204H214V216H148V204H170V48H152C140 48 132 58 128 84H116Z'
bw=outline(OUT/'sources/Fraunces.ttf','Joel Tracks',{'wght':600,'opsz':72,'SOFT':0,'WONK':0},tracking=-10,pairs={'Jo':-32,'el':-10,'Tr':-78,'ra':-22,'ac':-8,'ck':-10})
save('b-imprint','Imprint',transformed(b,(1,0,0,1,0,-4)),fitted(bw,32,48,896,160),960)

# C: original chamfered display alphabet. The same 14-unit stems build every letter.
letters={
'J':'M0 0H64V80L44 100H20L0 80V62H14V74L26 86H38L50 74V14H0Z',
'O':'M16 0H48L64 16V84L48 100H16L0 84V16ZM22 14L14 22V78L22 86H42L50 78V22L42 14Z',
'E':'M0 0H64V14H14V42H54V56H14V86H64V100H0Z',
'L':'M0 0H14V86H64V100H0Z',
'T':'M0 0H64V14H39V100H25V14H0Z',
'R':'M0 100V0H48L64 16V44L50 58L64 100H48L34 60H14V100ZM14 14V46H42L50 38V22L42 14Z',
'A':'M0 100V18L18 0H46L64 18V100H50V64H14V100ZM14 24V50H50V24L40 14H24Z',
'C':'M16 0H48L64 16V30H50V22L42 14H22L14 22V78L22 86H42L50 78V70H64V84L48 100H16L0 84V16Z',
'K':'M0 0H14V42L56 0H64V12L26 50L64 88V100H56L14 58V100H0Z',
'S':'M16 0H48L64 16V30H50V22L42 14H22L14 22V34L22 42H48L64 58V84L48 100H16L0 84V70H14V78L22 86H42L50 78V64L42 56H16L0 40V16Z'}
def industrial(text):
    ds=[];x=0
    for char in text:
        if char==' ':x+=32;continue
        ds.append(transformed(letters[char],(1,0,0,1,x,0)));x+=78
    return ''.join(ds)
# Counter contours already run opposite to their outer contours.
c=fitted(industrial('JT'),24,32,208,192)
cw=industrial('JOEL TRACKS')
save('c-cutline','Cutline',c,fitted(cw,32,56,1024,144),1088)

# D: script outlines with deliberate spacing and a custom asymmetric underline.
d=outline(OUT/'sources/Yellowtail.ttf','JT',tracking=-12,pairs={'JT':-65})
d=fitted(d,28,28,200,180)
d+='M38 222C86 199 144 197 218 181C171 202 101 208 38 228Z'
dw=outline(OUT/'sources/Yellowtail.ttf','Joel Tracks',tracking=-2,pairs={'Jo':-15,'Tr':-35})
dw=fitted(dw,32,32,896,168)
dw+='M96 222C272 192 588 209 854 180C666 214 326 211 96 228Z'
save('d-signed','Signed',transformed(d,(1,0,0,1,0,-10.25)),dw,960)

# E: lower-case j/t, rounded terminals and a deliberately generous counter.
e='M84 44A20 20 0 1 1 44 44A20 20 0 1 1 84 44ZM44 84H84V168C84 203.35 55.35 232 20 232V192C33.25 192 44 181.25 44 168ZM136 24H176V84H216V120H176V164C176 177.25 186.75 188 200 188H216V228H200C164.65 228 136 199.35 136 164V120H108V84H136Z'
ew=outline(ROOT/'assets/fonts/bricolage-grotesque-latin.woff2','joeltracks',{'wght':650,'wdth':100,'opsz':72},tracking=-12,pairs={'jo':-10,'lt':-8,'tr':-15,'ra':-10,'ck':-8})
save('e-pocket','Pocket',transformed(e,(1,0,0,1,10,0)),fitted(ew,32,48,896,160),960)

concepts=[
 {'key':'a-counterpoint','name':'Counterpoint','style':'Geometric monogram','idea':'A shared bar connects J and T into one compact signature.','risk':'The most restrained direction; less expressive than the script.'},
 {'key':'b-imprint','name':'Imprint','style':'Editorial serif','idea':'Contrasting serif lettering gives JT an independent record-label character.','risk':'Fine serif details need a simplified cut for tiny icons.'},
 {'key':'c-cutline','name':'Cutline','style':'Industrial custom lettering','idea':'A drawn, chamfered alphabet creates a bold nameplate for the catalog.','risk':'The hardest-edged option may feel less intimate for R&B.'},
 {'key':'d-signed','name':'Signed','style':'Script signature','idea':'Flowing lettering and one original sweep put the producer behind the name.','risk':'The full signature needs more width at small sizes.'},
 {'key':'e-pocket','name':'Pocket','style':'Rounded lowercase','idea':'A rounded j/t pairing gives the store a warm, approachable rhythm.','risk':'Its softer character is less severe than the industrial option.'}
]
(OUT/'concepts.json').write_text(json.dumps(concepts,indent=2),encoding='utf-8')
(OUT/'BRIEF.md').write_text('''# Joel Tracks — five logo directions

November 18, 2026. Concept exploration for review, not an applied rebrand.

Name: JT, short for Joel Tracks. Audience: artists shopping for R&B, Afro and Trap beats. Uses: storefront header, mobile header, footer, seller dashboard and social avatars. The request is five distinctly styled, professional choices. Assumptions: keep the exact name; demonstrate monochrome first; all directions must work with the current mint/black interface. The current logo remains live until the seller chooses.

Avoid category clichés: headphones around initials, generic equalizer bars, music notes, waveform circles, crowns and stock play triangles. No source brand mark was traced. Library research informed construction only.

## Concept longlist

1. Shared J/T cap with an open bowl — selected A.
2. Serif J/T with a bracketed T — selected B.
3. A consistent chamfered display alphabet — selected C.
4. A producer's script and asymmetric underline — selected D.
5. Rounded lowercase j/t with a generous opening — selected E.
6. Radial vinyl grooves — rejected as category cliché.
7. Joined playback chevrons — rejected as generic media UI.
8. A staggered music staff — rejected as too explanatory.
9. Repeated track bars — rejected as equalizer cliché.
10. A tape-spool emblem — rejected as too detailed for the header.

Selected directions span monogram, serif combination, custom wordmark, script and rounded lettermark. Selection favored clear readings, different characters, simple silhouettes, relevance and small-size potential. A is recommended for everyday header legibility; B is the strongest alternative for a more editorial identity.

## Type sources

A: Space Grotesk 620, existing local source, SIL OFL. Custom symbol and optical spacing.
B: Fraunces 600 / optical size 72 / SOFT 0 / WONK 0, SIL OFL. Original serif symbol and optical spacing.
C: original geometric alphabet drawn in this project, no font dependency.
D: Yellowtail by Astigmatic, Apache 2.0. Outlined with optical spacing and custom underline contours.
E: Bricolage Grotesque 650, existing local source, SIL OFL. Original rounded lettermark and optical spacing.

All logo lettering is outlined. No font installation or runtime font loading is required. Added fonts and licenses are retained in sources/. Official source licenses checked November 18, 2026:
- https://raw.githubusercontent.com/google/fonts/main/ofl/fraunces/OFL.txt
- https://raw.githubusercontent.com/google/fonts/main/apache/yellowtail/LICENSE.txt
- https://raw.githubusercontent.com/google/fonts/main/apache/yellowtail/METADATA.pb

These are original concept drawings, not a claim of trademark clearance. The selected direction should receive a professional clearance search before public launch. Final geometry, small-size cuts, color variants and a usage kit follow the seller's selection.
''',encoding='utf-8')
print('Created five symbol/wordmark pairs in',OUT)
