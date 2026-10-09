"""Audit catalogue metadata; never infer book editions or analyse book text."""
import collections,json,pathlib,sqlite3,urllib.parse
ROOT=pathlib.Path(__file__).resolve().parents[1]
path=ROOT/'data/curricula.json';manifest=json.loads(path.read_text());records=manifest['records']
assert len({r['id'] for r in records})==len(records)
assert all(urllib.parse.urlparse(r['sourceUrl']).hostname.endswith('.moe.edu.kw') for r in records)
standards_path=ROOT/'data/national-standards.json';standards=json.loads(standards_path.read_text())['records'] if standards_path.exists() else []
coverage=[]
for stage,rows in sorted(((stage,[r for r in records if r['stage']==stage]) for stage in {r['stage'] for r in records})):
 coverage.append({'stage':stage,'records':len(rows),'subjects':len({r['subject'] for r in rows}),'grades':len({r['grade'] for r in rows}),'firstTerm':sum(r['term']=='الأول' for r in rows),'secondTerm':sum(r['term']=='الثاني' for r in rows)})
audit={'recordCount':len(records),'uniqueSourceFiles':len({r['sourceUrl'] for r in records}),'subjects':len({r['subject'] for r in records}),'grades':len({r['grade'] for r in records}),'unknownEditions':sum(not r.get('edition') for r in records),'currentYearVerified':0,'lookupYearParameter':manifest.get('lookupYearParameter'),'sourceErrors':len(manifest.get('errors',[])),'generatedAt':manifest['generatedAt'],'scope':manifest['scope'],'coverage':coverage,'contentAnalysis':'not-performed-metadata-only','standardsCount':len(standards),'standards':standards,'rightsSource':'https://www2.moe.edu.kw/news/GetNewsDetail?NewsId=910','standardsSource':'https://elibrary.moe.edu.kw/NationalStandards'}
manifest['audit']=audit
path.write_text(json.dumps(manifest,ensure_ascii=False,separators=(',',':')))
(ROOT/'data/curricula-audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2))
with sqlite3.connect(ROOT/'data/curricula.sqlite') as db:
 db.execute('CREATE TABLE IF NOT EXISTS catalogue_audit (id TEXT PRIMARY KEY,report_json TEXT NOT NULL)');db.execute('INSERT OR REPLACE INTO catalogue_audit VALUES (?,?)',('metadata-coverage',json.dumps(audit,ensure_ascii=False)))
 db.execute('CREATE TABLE IF NOT EXISTS curriculum_verification (curriculum_id TEXT PRIMARY KEY,source_status TEXT,edition_status TEXT,academic_year TEXT,content_status TEXT)');db.execute('DELETE FROM curriculum_verification');db.executemany('INSERT INTO curriculum_verification VALUES (?,?,?,?,?)',[(r['id'],'official-catalogue','unverified' if not r.get('edition') else 'provided',None,'metadata-only') for r in records])
 db.execute('CREATE TABLE IF NOT EXISTS national_standards (id TEXT PRIMARY KEY,title TEXT,stage TEXT,source_url TEXT,verified_at TEXT,content_status TEXT)');db.execute('DELETE FROM national_standards');db.executemany('INSERT INTO national_standards VALUES (?,?,?,?,?,?)',[(r['id'],r['title'],r['stage'],r['sourceUrl'],r['verifiedAt'],r['contentStatus']) for r in standards])
print(json.dumps({k:v for k,v in audit.items() if k not in {'coverage','standards'}},ensure_ascii=False))
