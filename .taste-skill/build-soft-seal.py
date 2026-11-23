"""Production web assets from the selected full-name Soft Seal concept."""
from pathlib import Path
from shutil import copyfile
import xml.etree.ElementTree as ET

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/branding/soft-seal'
OUT.mkdir(parents=True,exist_ok=True)
source=ROOT/'assets/branding/framed-wordmarks-20261118/b-soft-seal-v2.svg'
tree=ET.parse(source);ns={'s':'http://www.w3.org/2000/svg'}
contour=tree.getroot().find('s:path',ns).get('d')
def svg(title,viewbox,content):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{viewbox}" role="img" aria-labelledby="title"><title id="title">{title}</title>{content}</svg>\n'
for name,color in [('joel-tracks.svg','#edf7f8'),('joel-tracks-black.svg','#151515'),('joel-tracks-mint.svg','#6ce4d4')]:
    (OUT/name).write_text(svg('Joel Tracks — Soft Seal','12 20 936 216',f'<path fill="{color}" d="{contour}"/>'),encoding='utf-8')

# The approved capsule's simplified perimeter, not a replacement lettermark.
# Wider counters and thicker walls survive 16px; no initials or illegible tiny words.
small='M64 80H192A48 48 0 0 1 240 128A48 48 0 0 1 192 176H64A48 48 0 0 1 16 128A48 48 0 0 1 64 80ZM64 104A24 24 0 0 0 40 128A24 24 0 0 0 64 152H192A24 24 0 0 0 216 128A24 24 0 0 0 192 104Z'
(OUT/'capsule.svg').write_text(svg('Joel Tracks capsule','0 0 256 256',f'<path fill="#edf7f8" fill-rule="evenodd" d="{small}"/>'),encoding='utf-8')
tile='<rect width="256" height="256" rx="56" fill="#151515"/>'+f'<path fill="#edf7f8" fill-rule="evenodd" d="{small}"/>'
(OUT/'favicon.svg').write_text(svg('Joel Tracks','0 0 256 256',tile),encoding='utf-8')
copyfile(ROOT/'assets/branding/exploration-20261118/sources/Fraunces-OFL.txt',OUT/'Fraunces-OFL.txt')
print('Built Soft Seal web masters and capsule small-size cut in',OUT)
