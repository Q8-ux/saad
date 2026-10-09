"""Collect official standards catalogue metadata, without downloading PDFs."""
import datetime,json,pathlib,urllib.request
url='https://elibrary.moe.edu.kw/api/NationalStandards?searchText=&EducationStageID='
with urllib.request.urlopen(url,timeout=25) as response:rows=json.load(response)
assert isinstance(rows,list) and rows
now=datetime.datetime.now(datetime.timezone.utc).isoformat();records=[]
for row in rows:
 ident=int(row['id']);records.append({'id':str(ident),'title':row['description'],'stage':row['educationStage'],'sourceUrl':f'https://elibrary.moe.edu.kw/api/File/download/nationalstandard/{ident}','sourcePage':'https://elibrary.moe.edu.kw/NationalStandards','verifiedAt':now,'contentStatus':'metadata-only','edition':None})
p=pathlib.Path(__file__).resolve().parents[1]/'data/national-standards.json';p.write_text(json.dumps({'generatedAt':now,'sourceApi':url,'count':len(records),'records':records},ensure_ascii=False,separators=(',',':')));print('Official standards metadata:',len(records))
