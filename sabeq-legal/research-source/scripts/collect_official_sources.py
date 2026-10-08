#!/usr/bin/env python3
"""Collect PUBLIC catalogues and linked PDFs. Never approve legal authority.
No case query, account credentials, private library, or model output is accepted.
"""
import argparse, datetime, hashlib, json, pathlib, urllib.request, urllib.parse
from html.parser import HTMLParser
ROOT=pathlib.Path(__file__).resolve().parents[1]
REGISTRY=json.loads((ROOT/'data/legal-sources/catalogues.json').read_text())
HOSTS={urllib.parse.urlsplit(s['url']).hostname for s in REGISTRY['sources']}|{'moj.gov.kw','kijls.moj.gov.kw','cbk.gov.kw'}
MAX_BYTES=20*1024*1024

def safe_url(value):
 p=urllib.parse.urlsplit(value)
 if p.scheme!='https' or p.hostname not in HOSTS or p.username or p.password or p.port not in (None,443): raise ValueError('unapproved_destination')
 return value
class Redirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,req,fp,code,msg,headers,newurl):
  safe_url(newurl);return super().redirect_request(req,fp,code,msg,headers,newurl)
class Links(HTMLParser):
 def __init__(self):super().__init__();self.urls=[]
 def handle_starttag(self,tag,attrs):
  if tag=='a':
   u=dict(attrs).get('href')
   if u:self.urls.append(u)

def fetch(url):
 opener=urllib.request.build_opener(Redirect())
 with opener.open(urllib.request.Request(safe_url(url),headers={'User-Agent':'Sabeq-Public-Source-Collector/1.0'}),timeout=15) as r:
  final=safe_url(r.geturl());content=r.read(MAX_BYTES+1);mime=r.headers.get('Content-Type','').lower()
 if len(content)>MAX_BYTES:raise ValueError('size_limit')
 return content,mime,final

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--pdf-limit',type=int,default=12);args=ap.parse_args()
 cache=ROOT/'.sites-runtime/official-catalogues';cache.mkdir(parents=True,exist_ok=True)
 result={'revision':REGISTRY['revision'],'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'automaticLegalApproval':False,'sources':[]}
 for source in REGISTRY['sources']:
  row={**source,'status':'unavailable','documents':[]}
  try:
   data,mime,final=fetch(source['url'])
   if 'html' not in mime:raise ValueError('catalogue_not_html')
   html=data.decode('utf-8',errors='replace')
   if any(x in html.lower() for x in ('cf-chl-','captcha','access denied','request rejected','just a moment')):raise ValueError('access_challenge')
   row.update(status='catalogue_fetched',finalUrl=final,sha256=hashlib.sha256(data).hexdigest())
   parser=Links();parser.feed(html);urls=[]
   for href in parser.urls:
    try:u=safe_url(urllib.parse.urljoin(final,href))
    except ValueError:continue
    if urllib.parse.urlsplit(u).path.lower().endswith('.pdf') and u not in urls:urls.append(u)
   row['discoveredPdfCount']=len(urls)
   for url in urls[:max(0,min(args.pdf_limit,30))]:
    doc={'url':url,'status':'unavailable','citable':False}
    try:
     data,mime,final=fetch(url)
     if not data.startswith(b'%PDF-'):raise ValueError('invalid_pdf')
     digest=hashlib.sha256(data).hexdigest();(cache/(digest+'.pdf')).write_bytes(data)
     doc.update(status='downloaded_pending_review',sha256=digest,finalUrl=final,bytes=len(data))
     try:
      import fitz
      pdf=fitz.open(stream=data,filetype='pdf')
      if len(pdf)>1500:raise ValueError('page_limit')
      pages=[{'page':i+1,'text':p.get_text()} for i,p in enumerate(pdf)]
      text='\n'.join(p['text'] for p in pages)
      doc.update(pageCount=len(pdf),textSha256=hashlib.sha256(text.encode()).hexdigest(),extractionStatus='text_extracted_pending_review' if len(text.strip())>50 else 'ocr_required')
      # Public source text stays a candidate and is never inserted in legal_chunks.
      (cache/(digest+'.json')).write_text(json.dumps({'url':url,'sha256':digest,'pages':pages,'citable':False},ensure_ascii=False))
     except ImportError:doc['extractionStatus']='pdf_parser_unavailable'
    except Exception as e:doc['error']=str(e) if isinstance(e,ValueError) else type(e).__name__
    row['documents'].append(doc)
  except Exception as e:row['error']=str(e) if isinstance(e,ValueError) else type(e).__name__
  result['sources'].append(row)
 out=ROOT/'data/legal-sources/catalogue-checks.json';out.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps({'cataloguesFetched':sum(s['status']=='catalogue_fetched' for s in result['sources']),'downloadedPdfs':sum(d['status']=='downloaded_pending_review' for s in result['sources'] for d in s['documents']),'approvedForCitation':0}))
if __name__=='__main__':main()
