"""Read the Ministry's public catalogue. Publish metadata only, never book text."""
import concurrent.futures, datetime, hashlib, json, pathlib, re, sqlite3, sys, time, urllib.parse, urllib.request
BASE='https://elibrary.moe.edu.kw'
NOW=datetime.datetime.now(datetime.timezone.utc).isoformat()
OUT=pathlib.Path(__file__).resolve().parents[1]/'data';OUT.mkdir(exist_ok=True)
errors=[]
def request(path,payload=None):
    url=urllib.parse.urljoin(BASE,path)
    if urllib.parse.urlparse(url).hostname not in {'elibrary.moe.edu.kw','hasobgpt.moe.edu.kw'}:raise ValueError('Unapproved source')
    body=json.dumps(payload).encode() if payload else None
    req=urllib.request.Request(url,data=body,headers={'User-Agent':'Manhaj-Curriculum-Catalog/1.0','Content-Type':'application/json','Accept':'application/json,text/html'})
    with urllib.request.urlopen(req,timeout=25) as response:return response.read().decode('utf-8-sig')
def lookup(path):
    data=json.loads(request(path))['data']
    return [{'value':int(r['value']),'text':str(r['text']).strip()} for r in data]
def parallel(fn,jobs):
    results=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        future_map={pool.submit(fn,j):j for j in jobs}
        for f in concurrent.futures.as_completed(future_map):
            try:results.extend(f.result())
            except Exception as e:errors.append({'stage':str(future_map[f])[:150],'error':str(e)[:150]})
    return results
def hasob():
    html=request('https://hasobgpt.moe.edu.kw/pages/library?type=student')
    try:
        from scrapling.parser import Selector
        dom=Selector(html);row_nodes=dom.css('tbody tr');engine='Scrapling'
        parsed=[]
        for row in row_nodes:
            cells=row.css('td');parsed.append(([c.css('::text').getall() for c in cells],[a.attrib.get('href') for a in row.css('a')]))
    except ImportError:
        from lxml import html as lh
        dom=lh.fromstring(html);engine='lxml (local bootstrap)';parsed=[]
        for row in dom.xpath('//tbody/tr'):parsed.append(([c.xpath('.//text()') for c in row.xpath('./td')],row.xpath('.//a/@href')))
    result=[]
    for cells,links in parsed:
        texts=[' '.join(' '.join(c).split()) for c in cells]
        if len(texts)<4:continue
        main=next((h for h in links if 'part=main' in h),'')
        if not main:continue
        ident=urllib.parse.parse_qs(urllib.parse.urlparse(main).query).get('id',[''])[0]
        result.append({'id':'hasob-'+ident,'title':texts[0],'stage':texts[1],'grade':texts[2].replace('الثانب','الثاني'),'subject':'الحاسوب','term':texts[3],'sourceUrl':urllib.parse.urljoin('https://hasobgpt.moe.edu.kw',main),'sourcePage':'https://hasobgpt.moe.edu.kw/pages/library?type=student','uploadedAt':None,'edition':None,'verifiedAt':NOW,'contentStatus':'metadata-only'})
    if not result:raise ValueError('No computer catalogue records parsed')
    return result,engine
def main():
    records,engine=hasob();print('Computer catalogue:',len(records),flush=True)
    types=lookup('/api/LibraryLookups/EducationTypes')
    general=next(r for r in types if re.sub(r'\s+',' ',r['text'])=='التعليم العام')
    stages=lookup('/api/LibraryLookups/EducationStages/'+str(general['value']))
    script=request('/app/app_studentslibrary.js?ver=5')
    match=re.search(r'MoeYear\s*:\s*(\d+)',script)
    if not match:raise ValueError('Official search parameter changed; review required')
    lookup_year=int(match.group(1))
    def get_grades(stage):return [(stage,g) for g in lookup('/api/LibraryLookups/EducationGrades/'+str(stage['value']))]
    grades=parallel(get_grades,stages);print('Grade contexts:',len(grades),flush=True)
    def get_subjects(context):
        stage,grade=context
        return [(stage,grade,subject) for subject in lookup('/api/LibraryLookups/EducationSubjects/'+str(grade['value']))]
    subjects=parallel(get_subjects,grades);print('Subject contexts:',len(subjects),flush=True)
    jobs=[(stage,grade,subject,term) for stage,grade,subject in subjects for term in ([1] if 'مسارات' in stage['text'] else [1,2])]
    def search(context):
        stage,grade,subject,term=context
        payload={'BooksFor':1,'MoeYear':lookup_year,'EducationTypeID':general['value'],'EducationStageID':stage['value'],'EducationGradeID':grade['value'],'EducationSubjectID':subject['value'],'Term':term}
        response=json.loads(request('/api/librarysearch',payload));rows=[]
        for b in response.get('books',[]):
            ident=str(b['bookFileID'])
            if not re.fullmatch(r'[A-Za-z0-9-]+',ident):raise ValueError('Invalid book identifier')
            rows.append({'id':f"moe-{ident}-{grade['value']}-{subject['value']}-{term}",'title':b['fileDescription'],'stage':stage['text'],'grade':grade['text'],'subject':subject['text'],'term':'الأول' if term==1 else 'الثاني','sourceUrl':BASE+'/api/File/preview/book/'+ident,'sourcePage':BASE+'/StudentsLibrary','uploadedAt':b.get('createdDate'),'edition':None,'verifiedAt':NOW,'contentStatus':'metadata-only'})
        return rows
    records.extend(parallel(search,jobs))
    records=list({r['id']:r for r in records}.values());records.sort(key=lambda r:(r['stage'],r['grade'],r['subject'],r['term'],r['title']))
    old_path=OUT/'curricula.json'
    # An incomplete source response must not erase previously verified records.
    if errors and old_path.exists():
        previous=json.loads(old_path.read_text()).get('records',[]);current={r['id']:r for r in previous};current.update({r['id']:r for r in records});records=list(current.values())
    manifest={'schemaVersion':1,'generatedAt':NOW,'collector':engine,'scope':'public-general-education-and-computer-catalogue','lookupYearParameter':lookup_year,'editionPolicy':'unknown-until-verified-from-file','complete':not errors,'errors':errors,'count':len(records),'uniqueSourceFiles':len({r['sourceUrl'] for r in records}),'records':records}
    path=OUT/'curricula.json';tmp=path.with_suffix('.tmp');tmp.write_text(json.dumps(manifest,ensure_ascii=False,separators=(',',':')));tmp.replace(path)
    dbpath=OUT/'curricula.sqlite';dbpath.unlink(missing_ok=True)
    with sqlite3.connect(dbpath) as db:
        db.execute('CREATE TABLE curricula (id TEXT PRIMARY KEY,title TEXT,stage TEXT,grade TEXT,subject TEXT,term TEXT,source_url TEXT,source_page TEXT,uploaded_at TEXT,edition TEXT,verified_at TEXT,content_status TEXT)')
        db.executemany('INSERT INTO curricula VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',[(r['id'],r['title'],r['stage'],r['grade'],r['subject'],r['term'],r['sourceUrl'],r['sourcePage'],r['uploadedAt'],r['edition'],r['verifiedAt'],r['contentStatus']) for r in records])
        db.execute('CREATE INDEX filter_curricula ON curricula(stage,grade,subject,term)')
        db.execute('CREATE VIRTUAL TABLE curriculum_search USING fts5(id UNINDEXED,title,stage,grade,subject,term)')
        db.execute('INSERT INTO curriculum_search SELECT id,title,stage,grade,subject,term FROM curricula')
    print(json.dumps({'count':len(records),'unique_files':manifest['uniqueSourceFiles'],'source_errors':len(errors),'collector':engine},ensure_ascii=False),flush=True)
if __name__=='__main__':main()
