from pathlib import Path
import json
p=Path('design.js');s=p.read_text(encoding='utf-8')
for name,next_name,body in [('showStore','renderCatalog','renderReferenceStore();'),('licenseCards','showLicenses',"return referenceLicenseCards(id);"),('showLicenses','showDialog','renderReferenceLicenses();')]:
    start=s.index('function '+name+'(');end=s.index('function '+next_name+'(',start)
    args="id=''" if name=='licenseCards' else ''
    s=s[:start]+'function '+name+'('+args+') { '+body+' }\n'+s[end:]
t='''<span class="cart-total">'+cash(total())+'</span>'''
while t+t in s:s=s.replace(t+t,t)
if t not in s:s=s.replace('<span class="cart-label">Cart</span>','<span class="cart-label">Cart</span>'+t)
p.write_text(s,encoding='utf-8')
icons={key:Path('assets/graphics/icons/'+name+'.svg').read_text(encoding='utf-8').strip() for key,name in [('listen','listen'),('licenseDocument','license-document'),('reviewAgreement','review-agreement')]}
icons.update({key:Path('assets/graphics/footer/'+name+'.svg').read_text(encoding='utf-8').strip() for key,name in [('footerAudio','streaming-disc'),('footerVideo','release-video'),('footerLive','stage-microphone')]})
Path('graphics.js').write_text('// Original icons, measured and reviewed with draw-svg.\nconst jtGraphics = '+json.dumps(icons,indent=2)+';\n',encoding='utf-8')
p=Path('storefront.js');s=p.read_text(encoding='utf-8')
s=s.replace('A sound for your next record.', 'Find your next beat.')
s=s.replace("+' '+(inCart?'Remove from cart':'Choose license')+'</button>", "+'<span class=\"spotlight-buy-label\">'+(inCart?'Remove from cart':'Choose license')+'</span></button>")
p.write_text(s,encoding='utf-8')
