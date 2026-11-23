from pathlib import Path
from html import escape
root=Path(__file__).resolve().parents[1]
out=root/'assets/branding/two-takes-v2'
out.mkdir(parents=True,exist_ok=True)
symbol='M32 32H224V68H68V152H32ZM224 104V224H32V188H188V104Z'
glyphs={
'J':('M0 0H64V60L44 80H16L0 64V48H14V58L22 66H38L50 54V14H0Z',64),
'O':('M14 0H50L64 14V66L50 80H14L0 66V14ZM20 14L14 20V60L20 66H44L50 60V20L44 14Z',64),
'E':('M0 0H56V14H14V33H48V47H14V66H56V80H0Z',56),
'L':('M0 0H14V66H56V80H0Z',56),
'T':('M0 0H64V14H39V80H25V14H0Z',64),
'R':('M0 0H46L64 18V36L50 50L66 80H50L34 52H14V80H0ZM14 14V38H42L50 30V22L42 14Z',66),
'A':('M0 80V18L18 0H46L64 18V80H50V52H14V80ZM14 38H50V24L40 14H24L14 24Z',64),
'C':('M14 0H64V14H20L14 20V60L20 66H64V80H14L0 66V14Z',64),
'K':('M0 0H14V32H22L46 0H64L33 40L66 80H48L22 48H14V80H0Z',66),
'S':('M14 0H64V14H20L14 20V28L20 34H48L64 50V66L50 80H0V66H44L50 60V54L44 48H16L0 32V14Z',64)
}
cursor=0;parts=[]
for letter in 'JOEL TRACKS':
    if letter==' ':cursor+=22;continue
    path,width=glyphs[letter]
    parts.append(f'<path transform="translate({cursor} 0)" d="{path}"/>')
    cursor+=width+8
word=''.join(parts)
width=round(288+(cursor-8)*1.04+32)
def svg(name,color):
    body=f'<path d="{symbol}"/><g transform="translate(288 64) scale(1.04 1.6)" fill-rule="evenodd">{word}</g>'
    (out/name).write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} 256" fill="{color}" role="img"><title>JT / Joel Tracks — Two Takes, custom wordmark</title>{body}</svg>\n',encoding='utf-8')
svg('jt-horizontal.svg','#edf7f8')
svg('jt-horizontal-dark.svg','#0c1720')
svg('jt-horizontal-mint.svg','#6ce4d4')
svg('jt-horizontal-black.svg','#000000')
svg('jt-horizontal-white.svg','#ffffff')
(out/'jt-symbol.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="#edf7f8"><title>JT Two Takes</title><path d="{symbol}"/></svg>',encoding='utf-8')
(out/'jt-symbol-small.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="#edf7f8"><title>JT small symbol</title><path d="M2 2H14V4H4V9.5H2ZM14 6.5V14H2V12H12V6.5Z"/></svg>',encoding='utf-8')
(root/'assets/jt-mark.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><title>JT</title><rect width="16" height="16" rx="3" fill="#0c1720"/><path fill="#6ce4d4" d="M2 2H14V4H4V9.5H2ZM14 6.5V14H2V12H12V6.5Z"/></svg>',encoding='utf-8')
preview=f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1400 650"><rect width="1400" height="650" fill="#0c1720"/><g transform="translate(125 115) scale(1.05)"><svg width="{width}" height="256" viewBox="0 0 {width} 256">{(out/'jt-horizontal.svg').read_text().split('<title>')[0].split('>')[0] if False else ''}</svg></g><text x="90" y="70" fill="#aec2cc" font-family="Arial" font-size="18">JT / JOEL TRACKS · REFINED WORDMARK</text><image href="jt-horizontal.svg" x="90" y="155" width="1220" height="260"/><rect x="90" y="505" width="48" height="6" fill="#6ce4d4"/><text x="90" y="555" fill="#aec2cc" font-family="Arial" font-size="20">Selected C symbol + custom cut-corner lettering</text></svg>'''
(out/'preview.svg').write_text(preview,encoding='utf-8')
(out/'USAGE.md').write_text('''# JT / Joel Tracks — refined Two Takes

The approved C symbol is retained. JOEL TRACKS now uses original outlined capital letters with clipped corners and open counters. The wordmark is constructed from filled paths and requires no font.

Primary background #0C1720, surface #12232E, text #EDF7F8, secondary text #AEC2CC, mint accent #6CE4D4. Use the primary light lockup on dark surfaces and jt-horizontal-dark.svg on light surfaces. Black, white and mint versions are included. Do not stretch or rotate the complete lockup. Keep one symbol-stem width of clear space around the visible artwork. Suggested minimum horizontal width is 170px; use the symbol alone below that.

This refinement supersedes the previous Bricolage lettered lockup. The earlier kit is preserved in the sibling folder. Commercial trademark clearance remains unverified; arrange a professional search before adoption.
''',encoding='utf-8')
print('Wordmark viewBox width:',width)
