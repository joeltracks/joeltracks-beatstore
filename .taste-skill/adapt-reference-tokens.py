from pathlib import Path
import json
p=Path('design-system/roles.json')
r=json.loads(p.read_text(encoding='utf-8'))
archive=Path('design-system/source/measured-roles.json')
if not archive.exists():archive.write_text(json.dumps(r,indent=2),encoding='utf-8')
r['name']='JT — reference-inspired storefront'
r['$comment']='Measured from Ear2ThaBeat on 2026-11-18; JT adaptations are documented in DESIGN.md. Raw measurements remain in source/measured-roles.json.'
r['colors'].update({'background':'#000000','surface':'#131313','surface-raised':'#1e1e1e','surface-inverse':'#f9fafa','text':'#dadada','heading':'#ffffff','text-muted':'#a5a5a5','border':'#343434','primary':'#6ce4d4','primary-foreground':'#092629','link':'#6ce4d4','focus':'#6ce4d4','canvas-text':'#15191c','canvas-muted':'#52606a','canvas-border':'#d8dfe2','canvas-hover':'#edf4f3','canvas-tag':'#e8eeef','canvas-accent':'#14685e','proposal':'#ffd39a','proposal-background':'#332719'})
r['chart']=['#6ce4d4','#ffc48a','#bba9ef']
r['container']={'page':1140,'wide':1280,'narrow':800}
r['text']['body'].update(size=16,weight='400',lh=1.65)
r['text']['body-lg'].update(size=18,weight='400',lh=1.65)
r['text']['body-lg'].pop('transform',None)
r['text']['h1'].update(size=36,phone=28,weight='600')
r['text']['h2'].update(lh=1.3)
r['text']['h4'].update(lh=1.4)
r['text']['caption']={'size':14,'lh':1.5,'weight':'400','font':'sans'}
r['text']['small']={'size':12,'lh':1.5,'weight':'500','font':'sans'}
r['text']['mobile-title']={'size':28,'lh':1.2,'weight':'600','font':'sans'}
r['space']['scale']=[5,10,15,20,25,30,40,50,60,80]
r['radius']={'sm':3,'md':5,'lg':10,'panel':16}
r['fonts']['sans']['source']='Locally hosted Google Fonts WOFF2, with SIL OFL license'
r['fonts']['sans']['note']='Measured Poppins retained. Body weight raised from 300 to 400 and 14px to 16px for JT readability.'
r['components']['buttons']=[{'variant':'primary','label':'Browse beats','bg':'primary','fg':'primary-foreground','border':None,'radius':5,'padding':[15,25],'height':48,'font':{'size':15,'weight':600},'hover':{'bg':'primary','fg':'primary-foreground'}},{'variant':'outline','label':'Compare licenses','bg':None,'fg':'heading','border':{'width':1,'style':'solid','color':'border'},'radius':5,'padding':[15,20],'height':48,'font':{'size':14,'weight':500}}]
r['components']['input'].update(bg='surface-raised',fg='heading',placeholder='text-muted',border={'width':1,'style':'solid','color':'border'},radius=5,height=48,font={'size':16,'weight':400})
r['components']['nav'].update(bg='background',position='sticky',height=80)
p.write_text(json.dumps(r,indent=2),encoding='utf-8')
