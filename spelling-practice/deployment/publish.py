"""Publish the spelling workbook over the latest deployed Pages snapshot, preserving every other byte."""
import hashlib
import io
import json
import os
from pathlib import Path
import shutil
import tarfile
import time
import urllib.parse
import urllib.request
import zipfile

PROJECT = 'spelling-practice'
REPOSITORY = 'Q8-ux/saad'
SOURCE = Path(__file__).resolve().parents[1] / 'dist'
LIMIT = 256 * 1024 * 1024

class SafeRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if urllib.parse.urlsplit(newurl).scheme != 'https':
            raise RuntimeError('Non-HTTPS artifact redirect refused')
        result = super().redirect_request(req, fp, code, msg, headers, newurl)
        if urllib.parse.urlsplit(newurl).netloc != urllib.parse.urlsplit(req.full_url).netloc:
            result.remove_header('Authorization')
        return result

def request(url, token, binary=False):
    if urllib.parse.urlsplit(url).hostname != 'api.github.com':
        raise RuntimeError('Authenticated requests must use api.github.com')
    if binary:
        url += ('&' if '?' in url else '?') + 'fresh=' + str(time.time_ns())
    req = urllib.request.Request(url, headers={
        'Authorization': 'Bearer '+token,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'spelling-workbook-publisher',
        'X-GitHub-Api-Version': '2022-11-28',
        'Cache-Control': 'no-cache',
    })
    with urllib.request.build_opener(SafeRedirect()).open(req, timeout=60) as response:
        data = response.read(LIMIT+1)
    if len(data)>LIMIT:
        raise RuntimeError('Artifact exceeds extraction limit')
    return data if binary else json.loads(data)

def prior_artifact(token):
    api = 'https://api.github.com/repos/'+REPOSITORY
    runs = request(api+'/actions/runs?status=success&branch=main&per_page=80',token)['workflow_runs']
    for run in sorted(runs,key=lambda r:r.get('updated_at',''),reverse=True):
        if run.get('head_branch') != 'main':
            continue
        jobs = request(f'{api}/actions/runs/{run["id"]}/jobs?per_page=100',token)['jobs']
        deployed = any(step.get('conclusion')=='success' and (
            'actions/deploy-pages@' in step.get('name','') or step.get('name')=='Deploy')
            for job in jobs for step in job.get('steps',[]))
        if not deployed:
            continue
        artifacts = request(f'{api}/actions/runs/{run["id"]}/artifacts?per_page=100',token)['artifacts']
        artifact = next((a for a in artifacts if a['name']=='github-pages' and not a['expired']),None)
        if artifact is None:
            raise RuntimeError('Latest deployed Pages artifact is unavailable; refusing to restore an older site')
        return request(artifact['archive_download_url'],token,binary=True),run['id']
    raise RuntimeError('No successful deployment found; refusing to replace other sites')

def restore(data,destination):
    if destination.exists() and any(destination.iterdir()):
        raise RuntimeError('Staging must be empty')
    destination.mkdir(parents=True,exist_ok=True)
    with zipfile.ZipFile(io.BytesIO(data)) as envelope:
        entries = [entry for entry in envelope.infolist() if entry.filename.rsplit('/',1)[-1]=='artifact.tar']
        if len(entries)!=1 or entries[0].file_size>LIMIT:
            raise RuntimeError('Invalid Pages artifact envelope')
        payload = envelope.read(entries[0])
    with tarfile.open(fileobj=io.BytesIO(payload),mode='r:*') as archive:
        members = archive.getmembers()
        if sum(max(0,m.size) for m in members)>LIMIT:
            raise RuntimeError('Expanded archive exceeds extraction limit')
        root = destination.resolve()
        for member in members:
            target = (root/member.name).resolve()
            if not target.is_relative_to(root) or member.name.startswith('/') or not (member.isfile() or member.isdir()):
                raise RuntimeError('Unsafe Pages archive entry')
        archive.extractall(destination,members=members,filter='data')
    if not (destination/'index.html').is_file():
        raise RuntimeError('The existing Pages snapshot is incomplete')

def fingerprints(root):
    return {str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest()
            for p in root.rglob('*') if p.is_file() and p.relative_to(root).parts[0]!=PROJECT}

def overlay(destination,base_run):
    before=fingerprints(destination)
    target=destination/PROJECT
    if target.exists():
        shutil.rmtree(target)
    shutil.copytree(SOURCE,target)
    word_ids=json.loads((target/'audio/manifest.json').read_text())
    if not isinstance(word_ids,list) or not word_ids or not all(isinstance(word,str) and word.isascii() and word.isalpha() for word in word_ids) or len(set(word_ids))!=len(word_ids):
        raise RuntimeError('Invalid pronunciation manifest')
    picture_manifest=json.loads((target/'pictures/manifest.json').read_text())
    pictures=picture_manifest.get('pictures',[])
    if len(pictures)!=14 or len({p.get('id') for p in pictures})!=14:
        raise RuntimeError('The illustrated word set must contain all 14 separate drawings')
    for picture in pictures:
        word=picture.get('id','')
        if word not in word_ids or picture.get('file')!=word+'-v1.webp':
            raise RuntimeError('Invalid word-picture mapping')
    for name in ['index.html','style.css','core.js','i18n.js','app.js','motion.js','arabic-guides.js','avatar-v1.png','pictures/manifest.json']+[f'audio/{word}.mp3' for word in word_ids]+['pictures/'+p['file'] for p in pictures]:
        if not (target/name).is_file():
            raise RuntimeError('Spelling workbook package incomplete')
    (target/'deployment.json').write_text(json.dumps({
        'project':PROJECT,'commit':os.environ.get('GITHUB_SHA','local-fixture'),
        'baseRun':base_run,'preservedFiles':len(before),
    },indent=2)+'\n')
    if before!=fingerprints(destination):
        raise RuntimeError('Another published project changed; publication refused')
    print(f'Prepared {PROJECT}; {len(before)} unrelated published files are byte-identical')

def main():
    token=os.environ.get('GH_TOKEN')
    if not token:
        raise RuntimeError('GH_TOKEN is required')
    data,base_run=prior_artifact(token)
    destination=Path('_site')
    restore(data,destination)
    overlay(destination,base_run)

if __name__=='__main__':
    main()

