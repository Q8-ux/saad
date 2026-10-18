"""One bounded GitHub Actions worker. OIDC identity; no stored cloud API key."""
import json,os,subprocess,sys,time,urllib.request
from pathlib import Path
from urllib.parse import urlencode
from radar_tools import smoke
BASE='https://wvzkpazvtnclcghjrjvv.supabase.co/functions/v1/radar-tools'

def token():
    target=os.environ['ACTIONS_ID_TOKEN_REQUEST_URL']+'&'+urlencode({'audience':'social-request-radar-tools'})
    request=urllib.request.Request(target,headers={'Authorization':'Bearer '+os.environ['ACTIONS_ID_TOKEN_REQUEST_TOKEN']})
    with urllib.request.urlopen(request,timeout=15) as response:return json.load(response)['value']

def call(body):
    request=urllib.request.Request(BASE+'/worker',data=json.dumps(body,ensure_ascii=False).encode(),headers={'Content-Type':'application/json','Authorization':'Bearer '+token()})
    with urllib.request.urlopen(request,timeout=20) as response:return json.load(response)

def main():
    report=smoke(heavy=True)
    Path('/tmp/radar-tools-runtime.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print(json.dumps({'state':'ready','tools':list(report['tools']),'syntheticModelTest':'passed'}),flush=True)
    deadline=time.monotonic()+max(1,min(20,int(os.environ.get('RADAR_WORKER_MINUTES','15'))))*60
    while time.monotonic()<deadline:
        call({'operation':'heartbeat','report':report['tools']})
        job=call({'operation':'claim'}).get('job')
        if job:
            try:
                process=subprocess.run([sys.executable,str(Path(__file__).with_name('radar_tools.py')),'execute'],input=json.dumps(job['payload']),capture_output=True,text=True,timeout=150,check=False)
                result=json.loads(process.stdout) if process.returncode==0 else {'ok':False,'errorCode':'WORKER_PROCESS_FAILED'}
            except subprocess.TimeoutExpired:result={'ok':False,'errorCode':'TIME_LIMIT'}
            except Exception:result={'ok':False,'errorCode':'WORKER_FAILED'}
            call({'operation':'complete','id':job['id'],'result':result})
            print(json.dumps({'job':job['id'],'ok':result.get('ok',False),'records':len(result.get('records',[])),'analysisCount':result.get('count')}),flush=True)
        else:time.sleep(15)
    print('Bounded worker finished. Start a new run from GitHub when needed.',flush=True)

if __name__=='__main__':main()
