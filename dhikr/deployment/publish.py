"""Overlay this independent site on the latest successful Pages artifact."""
from pathlib import Path
import hashlib
import json
import os
import shutil
import subprocess
import tarfile
import zipfile

repo = Path.cwd()
site = repo / 'dhikr'
out = repo / '_site'
prior = repo / 'prior-dhikr'
prior.mkdir(exist_ok=True)

def api(path):
    return json.loads(subprocess.check_output(['gh', 'api', path], text=True))

def snapshot():
    return {
        str(p.relative_to(out)): hashlib.sha256(p.read_bytes()).hexdigest()
        for p in out.rglob('*') if p.is_file() and p.relative_to(out).parts[0] != 'dhikr'
    }

artifact = None
for page in range(1, 5):
    listing = api(f'repos/{os.environ["GITHUB_REPOSITORY"]}/actions/artifacts?name=github-pages&per_page=100&page={page}')['artifacts']
    for candidate in listing:
        if candidate.get('expired'):
            continue
        run = api(f'repos/{os.environ["GITHUB_REPOSITORY"]}/actions/runs/{candidate["workflow_run"]["id"]}')
        if run.get('conclusion') == 'success':
            artifact = candidate
            break
    if artifact or len(listing) < 100:
        break
if not artifact:
    raise SystemExit('No successful Pages artifact available; refusing to replace the other sites.')

archive = prior / 'site.zip'
with archive.open('wb') as stream:
    subprocess.run(['gh', 'api', f'repos/{os.environ["GITHUB_REPOSITORY"]}/actions/artifacts/{artifact["id"]}/zip'], stdout=stream, check=True)
with zipfile.ZipFile(archive) as zf:
    if 'artifact.tar' not in zf.namelist():
        raise SystemExit('Pages artifact does not contain artifact.tar')
    zf.extract('artifact.tar', prior)
out.mkdir(exist_ok=True)
with tarfile.open(prior / 'artifact.tar') as tf:
    tf.extractall(out, filter='data')
before = snapshot()
if not before or not (out / 'index.html').is_file():
    raise SystemExit('Existing site restoration is incomplete')

subprocess.run(['python', str(site / 'deployment/build.py')], check=True)
target = out / 'dhikr'
shutil.rmtree(target, ignore_errors=True)
shutil.copytree(site / 'dist', target)
(target / 'release.json').write_text(json.dumps({'version':'1.0.0','commit':os.environ['GITHUB_SHA'],'name':'للذاكرين والذاكرات'}, ensure_ascii=False)+'\n')
after = snapshot()
if before != after:
    raise SystemExit('Unrelated published files changed; publication blocked')
for name in ['index.html', 'app.mjs', 'library.mjs', 'i18n.mjs', 'data/quran.json', 'data/translations.json', 'assets/dua-7.mp3']:
    if not (target / name).is_file():
        raise SystemExit('Missing site asset: '+name)
print(f'Prepared Dhikr; preserved {len(before)} existing published files.')
