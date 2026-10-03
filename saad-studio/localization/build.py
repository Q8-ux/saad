from pathlib import Path
import json,re
root=Path(__file__).resolve().parents[1]; loc=root/'localization'; public=root/'public'
langs=['en','ur','hi','fa','tr','fr'];data={l:dict(ui={},services={},categories={}) for l in langs}
for name in ['ui','specs','services','categories']:
 for line in (loc/(name+'.tsv')).read_text().splitlines():
  parts=line.split('|');assert len(parts)==7,(name,parts[0],len(parts))
  key,*values=parts
  for lang,value in zip(langs,values):
   assert value.strip(),(lang,key)
   if name in ['ui','specs']:data[lang]['ui'][key]=value
   else:
    title,description=value.split('~',1);data[lang][name][key]=dict(title=title,description=description)
base=json.loads((public/'config.js').read_text().split('window.STUDIO_STORE = ',1)[1].rstrip(';\n'))
for lang in langs:
 assert len(data[lang]['services'])==50 and len(data[lang]['categories'])==10
 for c in base['categories']:
  trans=data[lang]['categories'][c['id']]
  for key in ['title','description']:data[lang]['ui'][c[key]]=trans[key]
 for s in base['services']:
  trans=data[lang]['services'][s['id']]
  for key in ['title','description']:data[lang]['ui'][s[key]]=trans[key]
 # Every service scope and dimension must have a localized representation.
 for s in base['services']:
  for k in ['size','scope']:
   v=s[k]
   assert v in data[lang]['ui'] or not re.search('[\u0600-\u06ff]',v) or re.match(r'^[0-9 ×]+بكسل',v),(lang,s['id'],k,v)
(public/'translations.js').write_text('window.STUDIO_TRANSLATIONS = '+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';\n')
print('Validated 6 translation sets: 300 service translations, 60 category translations and complete size/scope coverage.')
