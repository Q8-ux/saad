"""Authenticated, bounded content worker. Run behind an HTTPS reverse proxy; never serve upstream roots."""
import concurrent.futures,hashlib,hmac,json,os,re,shutil,signal,subprocess,sys,threading,time
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from adapters import TOOLS,ROOT

DATA=Path(os.environ.get('RASED_CONTENT_DATA',Path(__file__).parent/'runtime')).resolve()
KEY=os.environ.get('RASED_CONTENT_KEY','')
JOBS={};LOCK=threading.Lock();POOL=concurrent.futures.ThreadPoolExecutor(max_workers=1)
UUID=re.compile(r'^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$')
ERRORS={'LANGUAGE_UNSUPPORTED':'لغة الحملة غير مدعومة في هذا المحرك.','GPU_REQUIRED':'محرك الصور يحتاج GPU متاحاً.','IMAGE_PROMPT_REQUIRED':'أضف وصف الصورة أولاً.','MUSIC_PROMPT_REQUIRED':'أضف وصف الموسيقى أولاً.','SCRIPT_REQUIRED':'احفظ السكربت قبل إنتاج الصوت.','YOUTUBE_URL_REQUIRED':'أضف رابط YouTube أصلياً للحملة.','OUTPUT_EXCEEDS_20MB':'الملف الناتج أكبر من حد النقل ٢٠ ميجابايت.','ENGINE_NOT_READY':'المحرك غير مجهز في العامل.','RESEARCH_TIMEOUT':'انتهت مهلة البحث.','MUSIC_TIMEOUT':'انتهت مهلة الموسيقى؛ تحقق من خدمة ACE-Step قبل تكرارها.'}

def python(tool):
    configured=ROOT/tool/'.venv'/('Scripts/python.exe' if os.name=='nt' else 'bin/python')
    return str(configured) if configured.is_file() else sys.executable

def capabilities():
    result=[]
    for tool in sorted(TOOLS):
        try:
            process=subprocess.run([python(tool),str(Path(__file__).with_name('adapters.py')),tool,'--check'],capture_output=True,text=True,timeout=5)
            if process.returncode==0 and json.loads(process.stdout).get('ready'):result.append(tool)
        except Exception:pass
    return result

def purge():
    for ident,job in list(JOBS.items()):
        if time.time()-job['at']>3600 and job['state'] not in {'queued','running'}:
            shutil.rmtree(DATA/ident,ignore_errors=True);del JOBS[ident]

def execute(ident):
    with LOCK:job=JOBS[ident];job['state']='running';payload=job.pop('payload')
    out=DATA/ident;out.mkdir(parents=True,exist_ok=True)
    try:
        process=subprocess.Popen([python(job['tool']),str(Path(__file__).with_name('adapters.py')),job['tool'],str(out)],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,start_new_session=True)
        try:
            stdout,stderr=process.communicate(json.dumps(payload,ensure_ascii=False),timeout=600)
        except subprocess.TimeoutExpired:
            if os.name=='posix':os.killpg(process.pid,signal.SIGKILL)
            else:process.kill()
            process.communicate();raise
        if process.returncode:
            try:code=json.loads(stderr.splitlines()[-1]).get('error')
            except Exception:code=None
            raise RuntimeError(ERRORS.get(code,'تعذر تنفيذ المحرك. راجع إعداده على عامل الإنتاج.'))
        result=json.loads(stdout.splitlines()[-1])
        if not isinstance(result.get('artifacts'),list) or not (result.get('text') or result['artifacts']):raise RuntimeError('لم يُنتج المحرك نتيجة قابلة للمراجعة.')
        # Validate every artifact against the job root before making any of them readable.
        for a in result['artifacts']:
            path=(out/a['id']).resolve()
            if not re.fullmatch(r'[A-Za-z0-9_.-]{1,100}',a['id']) or path.parent!=out or not path.is_file() or path.is_symlink() or path.stat().st_size>20*1024*1024:raise RuntimeError('تعذر التحقق من الملف الناتج.')
        with LOCK:job.update(state='completed',result=result)
    except subprocess.TimeoutExpired:
        with LOCK:job.update(state='failed',error='تجاوزت المهمة مهلة الإنتاج. راجع الخدمة قبل إرسال مهمة أخرى.')
    except Exception as exc:
        message=str(exc) if isinstance(exc,RuntimeError) else 'تعذر تنفيذ مهمة الإنتاج.'
        with LOCK:job.update(state='failed',error=message)

class Handler(BaseHTTPRequestHandler):
    protocol_version='HTTP/1.1'
    def log_message(self,*args):pass
    def send_json(self,status,data):
        value=json.dumps(data,ensure_ascii=False).encode();self.send_response(status);self.send_header('Content-Type','application/json');self.send_header('Cache-Control','no-store');self.send_header('Content-Length',str(len(value)));self.end_headers();self.wfile.write(value)
    def authenticated(self):
        supplied=self.headers.get('Authorization','')
        if not KEY or not hmac.compare_digest(supplied,'Bearer '+KEY):self.send_json(401,{'error':'Unauthorized'});return False
        return True
    def do_GET(self):
        if not self.authenticated():return
        if self.path=='/health':self.send_json(200,{'ok':True,'service':'rased-content-worker','capabilities':capabilities(),'checks':'installed-and-configured; output-verified-per-job','retentionMinutes':60});return
        parts=self.path.split('/')
        if len(parts) not in (3,5) or parts[1]!='jobs' or not UUID.fullmatch(parts[2]):self.send_json(404,{'error':'Not found'});return
        ident=parts[2]
        with LOCK:purge();job=JOBS.get(ident);snapshot={k:job[k] for k in ('state','result','error') if k in job} if job else None
        if not job:self.send_json(200,{'id':ident,'state':'expired'});return
        if len(parts)==3:self.send_json(200,{'id':ident,**snapshot});return
        artifact=next((a for a in snapshot.get('result',{}).get('artifacts',[]) if a['id']==parts[4]),None)
        if parts[3]!='artifacts' or snapshot.get('state')!='completed' or not artifact:self.send_json(404,{'error':'Not found'});return
        path=(DATA/ident/artifact['id']).resolve()
        if path.parent!=DATA/ident or not path.is_file() or path.stat().st_size>20*1024*1024:self.send_json(410,{'error':'Artifact unavailable'});return
        value=path.read_bytes();self.send_response(200);self.send_header('Content-Type',artifact['mime']);self.send_header('Content-Length',str(len(value)));self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(value)
    def do_POST(self):
        if not self.authenticated():return
        if self.path!='/jobs':self.send_json(404,{'error':'Not found'});return
        try:
            size=int(self.headers.get('Content-Length','0'))
            if not 0<size<=96000:self.send_json(413,{'error':'Payload too large'});return
            body=json.loads(self.rfile.read(size));ident=body.get('id','');tool=body.get('tool');campaign=body.get('campaign')
            if not UUID.fullmatch(ident) or tool not in TOOLS or not isinstance(campaign,dict) or not isinstance(campaign.get('topic'),str):raise ValueError()
            if tool not in capabilities():self.send_json(424,{'error':'Engine not ready'});return
            fingerprint=hashlib.sha256(json.dumps(body,sort_keys=True).encode()).hexdigest()
            with LOCK:
                purge()
                if ident in JOBS:
                    if JOBS[ident]['fingerprint']!=fingerprint:self.send_json(409,{'error':'Job changed'});return
                    self.send_json(200,{'id':ident,'state':'queued'});return
                if len(JOBS)>=6 or sum(j['state'] in {'queued','running'} for j in JOBS.values())>=2:self.send_json(429,{'error':'Queue limit'});return
                JOBS[ident]={'tool':tool,'payload':campaign,'state':'queued','at':time.time(),'fingerprint':fingerprint}
                POOL.submit(execute,ident)
            self.send_json(202,{'id':ident,'state':'queued'})
        except (ValueError,TypeError,KeyError):self.send_json(400,{'error':'Invalid job'})

def cleanup_loop():
    while True:
        time.sleep(60)
        with LOCK:
            purge()
            for path in DATA.iterdir():
                if path.is_dir() and UUID.fullmatch(path.name) and path.name not in JOBS and time.time()-path.stat().st_mtime>3600:shutil.rmtree(path,ignore_errors=True)

if __name__=='__main__':
    if len(KEY)<32:raise SystemExit('Set RASED_CONTENT_KEY to at least 32 random characters.')
    DATA.mkdir(parents=True,exist_ok=True)
    threading.Thread(target=cleanup_loop,daemon=True).start()
    server=ThreadingHTTPServer((os.environ.get('RASED_CONTENT_HOST','127.0.0.1'),int(os.environ.get('RASED_CONTENT_PORT','8092'))),Handler)
    server.serve_forever()
