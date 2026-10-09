"""Index public Ministry metadata only; do not mirror textbooks or personal data."""
import concurrent.futures, datetime, json, pathlib, time, urllib.request
BASE='https://elibrary.moe.edu.kw'
ROOT=pathlib.Path(__file__).resolve().parents[1]
def request(path,payload=None):
 data=None if payload is None else json.dumps(payload).encode()
 req=urllib.request.Request(BASE+path,data=data,headers={'Content-Type':'application/json','User-Agent':'SinadCurriculumIndex/1.0'})
 for attempt in range(3):
  try:
   with urllib.request.urlopen(req,timeout=45) as r:return json.load(r)
  except Exception:
   if attempt==2:raise
   time.sleep(1+attempt)
def lookup(path):
 return {str(x['value']):(x['text'] or '').strip() for x in request('/api/LibraryLookups/'+path)['data']}
def sync():
 types=lookup('EducationTypes'); stages={}; grades={}; subjects={}; raw=[]
 # These wildcard filters were tested against the Ministry's own search service.
 for term in (1,2):
  result=request('/api/librarysearch',{'BooksFor':1,'MoeYear':2023,'EducationTypeID':0,'EducationStageID':0,'EducationGradeID':0,'EducationSubjectID':0,'Term':term})
  if not isinstance(result.get('books'),list):raise ValueError('Unexpected Ministry schema')
  for category,key,idkey in [('book','books','bookFileID'),('worksheet','examFiles','educationExamFileID'),('video','videos','educationVideoID')]:
   for b in result.get(key,[]):
    if b.get('isPublished') is False:continue
    raw.append((category,idkey,b))
 with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
  for d in pool.map(lambda k:lookup('EducationStages/'+k),types):stages.update(d)
  for d in pool.map(lambda k:lookup('EducationGrades/'+k),sorted({str(b['educationStageID']) for _,_,b in raw})):grades.update(d)
  for d in pool.map(lambda k:lookup('EducationSubjects/'+k),sorted({str(b['educationGradeID']) for _,_,b in raw})):subjects.update(d)
 items=[];seen=set()
 for category,idkey,b in raw:
  id=b.get(idkey)
  if category=='video':id=b.get('educationVideoID',b.get('videoID',b.get('videoUrl')))
  if id is None:continue
  key=f'{category}-{id}'
  if key in seen:continue
  seen.add(key)
  url=f'{BASE}/api/File/preview/book/{id}' if category=='book' else (f'{BASE}/api/File/download/examfile/{id}' if category=='worksheet' else 'https://www.youtube.com/watch?v='+str(b['videoUrl']))
  items.append({'id':key,'title':b.get('fileDescription',b.get('description','')).strip(),'kind':category,'type':types.get(str(b.get('educationTypeID')),''),'stage':stages.get(str(b.get('educationStageID')),''),'grade':grades.get(str(b.get('educationGradeID')),''),'subject':subjects.get(str(b.get('educationSubjectID')),''),'term':b.get('term'),'source':url,'sourceDate':b.get('createdDate'),'edition':None})
 if not any(x['kind']=='book' for x in items):raise ValueError('Empty catalog; retaining last successful snapshot')
 out={'syncedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'source':BASE+'/StudentsLibrary','sourceYearParameter':2023,'editionVerified':False,'items':items}
 p=ROOT/'data/catalog.json';temp=p.with_suffix('.tmp');temp.write_text(json.dumps(out,ensure_ascii=False,separators=(',',':')),encoding='utf-8');temp.replace(p)
 print(json.dumps({'items':len(items),'books':sum(x['kind']=='book' for x in items)},ensure_ascii=False))
if __name__=='__main__':sync()
