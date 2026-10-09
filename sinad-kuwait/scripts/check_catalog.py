import json,pathlib
p=pathlib.Path(__file__).resolve().parents[1];c=json.loads((p/'data/catalog.json').read_text());items=c['items']
assert items and c['source']=='https://elibrary.moe.edu.kw/StudentsLibrary'
assert len({x['id'] for x in items})==len(items)
for x in items:
 assert x['title'] and x['kind'] in ['book','worksheet','video']
 assert x['source'].startswith('https://elibrary.moe.edu.kw/') or (x['kind']=='video' and x['source'].startswith('https://www.youtube.com/watch?v='))
assert any(x['kind']=='book' and x['term']==1 for x in items)
assert any(x['kind']=='book' and x['term']==2 for x in items)
print('Catalog source, IDs, types and both terms verified:',len(items))
