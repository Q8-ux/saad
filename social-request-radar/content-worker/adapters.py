"""Production adapters. All service addresses and executables belong to the operator, never a job."""
from pathlib import Path
import importlib.util,json,os,shutil,subprocess,sys,time,urllib.request,urllib.parse,http.cookiejar
from html.parser import HTMLParser

TOOLS={'deep-research','flux','kokoro','ace-step','shorts','podcastfy'}
ROOT=Path(os.environ.get('RASED_UPSTREAM_ROOT',Path(__file__).parent/'upstreams')).resolve()
MAX_FILE=20*1024*1024

def http(url,data=None,opener=None,headers=None):
    request=urllib.request.Request(url,data=json.dumps(data).encode() if data is not None else None,headers={'Content-Type':'application/json',**(headers or {})})
    with (opener or urllib.request.build_opener()).open(request,timeout=30) as response:
        content=response.read(400001)
        if len(content)>400000:raise RuntimeError('SERVICE_RESULT_TOO_LARGE')
        return json.loads(content)

def endpoint(name):
    value=os.environ.get(name,'').rstrip('/')
    if urllib.parse.urlsplit(value).scheme not in ('http','https'):raise RuntimeError('SERVICE_NOT_CONFIGURED')
    return value

def check(tool):
    if tool=='deep-research':return all(os.environ.get(k) for k in ['RASED_LDR_URL','RASED_LDR_USERNAME','RASED_LDR_PASSWORD'])
    if tool=='ace-step':return bool(os.environ.get('RASED_ACE_URL'))
    if tool=='flux':return bool(importlib.util.find_spec('diffusers')) and bool(os.environ.get('RASED_FLUX_MODEL_DIR')) and Path(os.environ['RASED_FLUX_MODEL_DIR']).is_dir()
    if tool=='kokoro':return bool(importlib.util.find_spec('kokoro')) and (os.environ.get('RASED_ALLOW_MODEL_DOWNLOADS')=='1' or bool(os.environ.get('RASED_KOKORO_CACHED')=='1'))
    if tool=='shorts':return (ROOT/'shorts'/'main.py').is_file() and bool(shutil.which('ffmpeg')) and bool(os.environ.get('GEMINI_API_KEY'))
    if tool=='podcastfy':return bool(importlib.util.find_spec('podcastfy')) and os.environ.get('RASED_PODCAST_READY')=='1'
    return False

def deep_research(c,out):
    base=endpoint('RASED_LDR_URL');cookies=http.cookiejar.CookieJar();opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cookies))
    class CSRF(HTMLParser):
        value=''
        def handle_starttag(self,tag,attrs):
            a=dict(attrs)
            if tag=='input' and a.get('name')=='csrf_token':self.value=a.get('value','')
    with opener.open(base+'/auth/login',timeout=20) as response:page=response.read(100000).decode()
    parser=CSRF();parser.feed(page)
    form=urllib.parse.urlencode({'username':os.environ['RASED_LDR_USERNAME'],'password':os.environ['RASED_LDR_PASSWORD'],'csrf_token':parser.value}).encode()
    with opener.open(urllib.request.Request(base+'/auth/login',data=form,headers={'Content-Type':'application/x-www-form-urlencoded'}),timeout=20) as response:response.read(100000)
    csrf=http(base+'/auth/csrf-token',opener=opener)['csrf_token'];headers={'X-CSRF-Token':csrf}
    started=http(base+'/api/start_research',{'query':c['topic'],'mode':'detailed'},opener,headers)
    ident=str(started.get('research_id') or started.get('id') or '')
    if not ident or len(ident)>100:raise RuntimeError('LDR_START_FAILED')
    ident=urllib.parse.quote(ident,safe='');deadline=time.monotonic()+480
    while time.monotonic()<deadline:
        status=http(base+'/api/research/'+ident+'/status',opener=opener)
        state=status.get('status') or status.get('state')
        if state in ('failed','error','cancelled'):raise RuntimeError('LDR_RESEARCH_FAILED')
        if state in ('completed','complete','finished'):
            report=http(base+'/api/report/'+ident,opener=opener)
            text=report.get('content') or report.get('report') or report.get('summary') or json.dumps(report,ensure_ascii=False)
            if not isinstance(text,str):text=json.dumps(text,ensure_ascii=False)
            if len(text)>80000:raise RuntimeError('RESEARCH_REPORT_TOO_LARGE')
            return {'text':text,'engine':'Local Deep Research','artifacts':[]}
        time.sleep(4)
    # Cancel upstream work rather than silently leaving it running after our deadline.
    try:http(base+'/api/terminate/'+ident,{},opener,headers)
    except Exception:pass
    raise RuntimeError('RESEARCH_TIMEOUT')

def flux(c,out):
    import torch
    from diffusers import Flux2KleinPipeline
    if not torch.cuda.is_available():raise RuntimeError('GPU_REQUIRED')
    prompt=c.get('visualPrompt','').strip()
    if not prompt:raise RuntimeError('IMAGE_PROMPT_REQUIRED')
    pipe=Flux2KleinPipeline.from_pretrained(os.environ['RASED_FLUX_MODEL_DIR'],torch_dtype=torch.bfloat16,local_files_only=True)
    pipe.enable_model_cpu_offload()
    pipe(prompt=prompt,width=768,height=1024,num_inference_steps=4,guidance_scale=1.0).images[0].save(out/'cover.png')
    return {'engine':'FLUX.2 klein 4B'}

def kokoro(c,out):
    if os.environ.get('RASED_ALLOW_MODEL_DOWNLOADS')!='1':os.environ['HF_HUB_OFFLINE']='1'
    import numpy as np,soundfile as sf
    from kokoro import KPipeline
    voices={'en':('a','af_heart'),'es':('e','ef_dora'),'fr':('f','ff_siwis'),'hi':('h','hf_alpha'),'it':('i','if_sara'),'ja':('j','jf_alpha'),'pt':('p','pf_dora'),'zh':('z','zf_xiaobei')}
    language=c.get('language','').split('-')[0]
    if language not in voices:raise RuntimeError('LANGUAGE_UNSUPPORTED')
    text=c.get('script','').strip()
    if not text:raise RuntimeError('SCRIPT_REQUIRED')
    code,voice=voices[language];pipe=KPipeline(lang_code=code)
    chunks=[audio for _,_,audio in pipe(text[:12000],voice=voice)]
    if not chunks:raise RuntimeError('EMPTY_AUDIO')
    sf.write(out/'voice.wav',np.concatenate(chunks),24000)
    return {'engine':'Kokoro','language':language}

def ace(c,out):
    base=endpoint('RASED_ACE_URL');prompt=c.get('musicPrompt','').strip()
    if not prompt:raise RuntimeError('MUSIC_PROMPT_REQUIRED')
    started=http(base+'/release_task',{'prompt':prompt,'lyrics':'[Instrumental]','audio_duration':min(120,c.get('duration',60)),'inference_steps':8})
    ident=started.get('data',{}).get('task_id')
    if not ident:raise RuntimeError('MUSIC_START_FAILED')
    deadline=time.monotonic()+480
    while time.monotonic()<deadline:
        data=http(base+'/query_result',{'task_id_list':[ident]}).get('data',[])
        if data and data[0].get('status')==2:raise RuntimeError('MUSIC_GENERATION_FAILED')
        if data and data[0].get('status')==1:
            result=data[0].get('result','[]');items=json.loads(result) if isinstance(result,str) else result
            source=urllib.parse.urljoin(base+'/',items[0]['file']);a,b=urllib.parse.urlsplit(source),urllib.parse.urlsplit(base)
            if (a.scheme,a.netloc)!=(b.scheme,b.netloc):raise RuntimeError('ARTIFACT_ORIGIN_REJECTED')
            with urllib.request.urlopen(source,timeout=30) as response:audio=response.read(MAX_FILE+1)
            if len(audio)>MAX_FILE:raise RuntimeError('AUDIO_TOO_LARGE')
            (out/'music.wav').write_bytes(audio);return {'engine':'ACE-Step 1.5'}
        time.sleep(4)
    raise RuntimeError('MUSIC_TIMEOUT')

def shorts(c,out):
    url=urllib.parse.urlsplit(c.get('sourceUrl',''))
    if url.scheme!='https' or url.hostname not in {'youtube.com','www.youtube.com','m.youtube.com','youtu.be'} or url.username or url.password:raise RuntimeError('YOUTUBE_URL_REQUIRED')
    repo=ROOT/'shorts';env={**os.environ,'LOCAL_OUTPUT_DIR':str(out),'LLM_PROVIDER':'gemini'}
    result=subprocess.run([sys.executable,str(repo/'main.py'),url.geturl(),'--mode','local','--num-clips','2','--output-json',str(out/'clips.json')],cwd=repo,env=env,capture_output=True,timeout=540)
    if result.returncode:raise RuntimeError('SHORTS_GENERATION_FAILED')
    return {'engine':'AI YouTube Shorts Generator','text':'راجع القص العمودي والترجمة قبل اعتماد المقاطع.'}

def podcast(c,out):
    from podcastfy.client import generate_podcast
    text=c.get('script','').strip()
    if not text:raise RuntimeError('SCRIPT_REQUIRED')
    language='Arabic' if c.get('language','').startswith('ar') else 'English'
    path=Path(generate_podcast(text=text,conversation_config={'output_language':language,'word_count':min(800,max(100,len(text.split())))})).resolve()
    if not path.is_file() or path.stat().st_size>MAX_FILE:raise RuntimeError('PODCAST_OUTPUT_INVALID')
    suffix=path.suffix.lower()
    if suffix not in {'.wav','.mp3'}:raise RuntimeError('PODCAST_FORMAT_UNSUPPORTED')
    shutil.copyfile(path,out/('podcast'+suffix));return {'engine':'Podcastfy'}

def artifacts(out):
    types={'.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.wav':'audio/wav','.mp3':'audio/mpeg','.mp4':'video/mp4','.json':'application/json'}
    files=[]
    for path in sorted(out.rglob('*')):
        if path.is_symlink() or not path.is_file() or path.suffix not in types or path.stat().st_size==0:continue
        if path.name.startswith('source_') or path.suffix=='.json':continue
        if path.stat().st_size>MAX_FILE:raise RuntimeError('OUTPUT_EXCEEDS_20MB')
        # Flatten nested outputs into opaque names without exposing the worker filesystem.
        if path.parent!=out:
            target=out/('clip-'+str(len(files))+path.suffix);shutil.copyfile(path,target);path=target
        files.append({'id':path.name,'name':path.name,'mime':types[path.suffix],'size':path.stat().st_size})
        if len(files)>=10:break
    return files

def main():
    tool=sys.argv[1]
    if tool not in TOOLS:raise RuntimeError('UNKNOWN_TOOL')
    if len(sys.argv)>2 and sys.argv[2]=='--check':print(json.dumps({'ready':check(tool)}));return
    out=Path(sys.argv[2]).resolve();out.mkdir(parents=True,exist_ok=True);campaign=json.loads(sys.stdin.read(96000))
    if not check(tool):raise RuntimeError('ENGINE_NOT_READY')
    result={'deep-research':deep_research,'flux':flux,'kokoro':kokoro,'ace-step':ace,'shorts':shorts,'podcastfy':podcast}[tool](campaign,out)
    result['artifacts']=artifacts(out)
    if tool!='deep-research' and not result['artifacts']:raise RuntimeError('NO_OUTPUT_FILES')
    print(json.dumps(result,ensure_ascii=False))

if __name__=='__main__':
    try:main()
    except Exception as exc:
        # Upstream errors may include credentials, local paths or user content. Expose fixed codes only.
        code=str(exc) if isinstance(exc,RuntimeError) and str(exc).replace('_','').isalnum() else 'ENGINE_EXECUTION_FAILED'
        print(json.dumps({'error':code}),file=sys.stderr);sys.exit(1)
