"""Overlay this public editor onto a successful published Pages artifact."""
import io, json, os, pathlib, shutil, tarfile, urllib.request, zipfile, subprocess
root=pathlib.Path('_site'); root.mkdir(exist_ok=True)
base='https://api.github.com/repos/'+os.environ['GITHUB_REPOSITORY']
headers={'Authorization':'Bearer '+os.environ['GH_TOKEN'],'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'}
def fetch(url):
    with urllib.request.urlopen(urllib.request.Request(url,headers=headers),timeout=90) as response:return response.read()
artifacts=json.loads(fetch(base+'/actions/artifacts?name=github-pages&per_page=100'))['artifacts']
chosen=None
for artifact in sorted(artifacts,key=lambda a:a['created_at'],reverse=True):
    if artifact['expired']:continue
    run=json.loads(fetch(base+'/actions/runs/'+str(artifact['workflow_run']['id'])))
    if run['conclusion']=='success':chosen=artifact;break
if not chosen:raise SystemExit('No successful Pages artifact; refusing to overwrite other sites.')
with zipfile.ZipFile(io.BytesIO(subprocess.check_output(['gh','api','repos/'+os.environ['GITHUB_REPOSITORY']+'/actions/artifacts/'+str(chosen['id'])+'/zip']))) as archive:
    with tarfile.open(fileobj=io.BytesIO(archive.read('artifact.tar'))) as tar:tar.extractall(root,filter='data')
shutil.copytree('saad-studio/public',root/'saad-studio',dirs_exist_ok=True)
assert (root/'index.html').is_file()
assert (root/'saad-studio/index.html').is_file()
print('Preserved published sites; updated only saad-studio public files.')
