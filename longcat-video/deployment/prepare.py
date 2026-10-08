"""Preserve the most recent successfully deployed artifact and overlay one project."""
import io, json, os, pathlib, shutil, tarfile, urllib.request, zipfile, subprocess
root=pathlib.Path('_site'); root.mkdir(exist_ok=True)
base='https://api.github.com/repos/'+os.environ['GITHUB_REPOSITORY']
headers={'Authorization':'Bearer '+os.environ['GH_TOKEN'],'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'}
def fetch(url):
    with urllib.request.urlopen(urllib.request.Request(url,headers=headers),timeout=60) as response:return response.read()
artifacts=json.loads(fetch(base+'/actions/artifacts?name=github-pages&per_page=100'))['artifacts']
chosen=None
for artifact in sorted(artifacts,key=lambda a:a['created_at'],reverse=True):
    if artifact['expired']:continue
    run=json.loads(fetch(base+'/actions/runs/'+str(artifact['workflow_run']['id'])))
    if run['conclusion']!='success':continue
    jobs=json.loads(fetch(base+'/actions/runs/'+str(run['id'])+'/jobs?per_page=100'))['jobs']
    deployed=any(s.get('conclusion')=='success' and ('actions/deploy-pages@' in s.get('name','') or s.get('name')=='Deploy') for j in jobs for s in j.get('steps',[]))
    if deployed:chosen=artifact;break
if not chosen:raise SystemExit('No successfully deployed Pages artifact; refusing to overwrite other sites.')
with zipfile.ZipFile(io.BytesIO(subprocess.check_output(['gh','api','repos/'+os.environ['GITHUB_REPOSITORY']+'/actions/artifacts/'+str(chosen['id'])+'/zip']))) as archive:
    with tarfile.open(fileobj=io.BytesIO(archive.read('artifact.tar'))) as tar:tar.extractall(root,filter='data')
assert (root/'index.html').is_file()
dest=root/'longcat-video'
dest.mkdir(exist_ok=True)
for name in ('index.html','style.css','app.js'):
    shutil.copyfile('longcat-video/'+name,dest/name)
assert (dest/'index.html').stat().st_size>10000
assert (root/'tiktok-growth/fonts/Cairo-Variable.woff2').is_file()
(root/'.nojekyll').touch()
print('Preserved all published sites; added Saad Video Studio.')
