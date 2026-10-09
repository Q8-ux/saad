"""Extract public textbook pages with source attribution. No student uploads."""
import argparse,datetime,json,pathlib,urllib.request,subprocess,tempfile
import pymupdf
ROOT=pathlib.Path(__file__).resolve().parents[1]
def extract(ids,ocr=False):
 catalog=json.loads((ROOT/'data/catalog.json').read_text());chunks=[];errors=[];selected=[]
 for book in catalog['items']:
  if book['id'] not in ids or book['kind']!='book':continue
  selected.append(book['id'])
  if not book['source'].startswith('https://elibrary.moe.edu.kw/api/File/preview/book/'):raise ValueError('Source not allowed')
  try:
   req=urllib.request.Request(book['source'],headers={'User-Agent':'SinadCurriculumIndex/1.0'})
   with urllib.request.urlopen(req,timeout=60) as r:data=r.read(50*1024*1024+1)
   if len(data)>50*1024*1024 or not data.startswith(b'%PDF'):raise ValueError('Invalid or oversized PDF')
   with pymupdf.open(stream=data,filetype='pdf') as pdf:
    for i,page in enumerate(pdf):
     text=page.get_text(sort=True).strip()
     arabic=sum(1 for char in text if '\u0600'<=char<='\u06ff')
     if len(text)<40 or (arabic/max(1,sum(c.isalpha() for c in text))<0.25 and any('\u0600'<=char<='\u06ff' for char in book['title'])):
      if not ocr:continue
      with tempfile.TemporaryDirectory() as folder:
       image=pathlib.Path(folder)/'page.png';page.get_pixmap(dpi=180).save(image)
       text=subprocess.check_output(['tesseract',str(image),'stdout','-l','ara','--psm','3'],text=True,timeout=90).strip()
      if len(text)<40:continue
     for start in range(0,len(text),1200):chunks.append({'bookId':book['id'],'title':book['title'],'page':i+1,'source':book['source'],'text':text[start:start+1400],'reviewed':False})
  except Exception as e:errors.append({'bookId':book['id'],'error':str(e)})
 if not chunks:raise SystemExit('No readable pages. OCR may be required; previous corpus retained.')
 oldpath=ROOT/'data/corpus.json';old=json.loads(oldpath.read_text()) if oldpath.exists() else {'chunks':[]}
 # Retain existing books where extraction failed; replace only books successfully extracted.
 successful={c['bookId'] for c in chunks};chunks=[c for c in old['chunks'] if c['bookId'] not in successful]+chunks
 result={'extractedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'method':'PyMuPDF page text; scan OCR not enabled','chunks':chunks,'errors':errors}
 temp=oldpath.with_suffix('.tmp');temp.write_text(json.dumps(result,ensure_ascii=False,separators=(',',':')));temp.replace(oldpath)
 print(json.dumps({'chunks':len(chunks),'books':len(successful),'errors':errors},ensure_ascii=False))
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('book_ids',nargs='+');parser.add_argument('--ocr',action='store_true');a=parser.parse_args();extract(a.book_ids,a.ocr)
