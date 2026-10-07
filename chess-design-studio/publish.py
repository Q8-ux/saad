"""Overlay the chess card studio on the last successful Pages publication."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'sabeq-legal/deployment'))
from release import extract_published


def api(path):
    return json.loads(subprocess.check_output(['gh', 'api', path], text=True))


def protected(root):
    return {str(p.relative_to(root)): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in root.rglob('*') if p.is_file()
            and p.relative_to(root).parts[0] != 'chess-design-studio'
            and str(p.relative_to(root)) != 'ai-chess-kuwait/index.html'}


def add_launcher(html):
    if 'id="chess-design-launcher"' in html:
        return html
    if '</head>' not in html or '</body>' not in html:
        raise ValueError('Chess wrapper is not a complete HTML page')
    css='<link rel="stylesheet" href="../chess-design-studio/studio-link.css">'
    link='<a id="chess-design-launcher" href="../chess-design-studio/" target="_blank" rel="noopener">♞ بطاقة الشطرنج</a>'
    return html.replace('</head>', css+'\n</head>').replace('</body>', link+'\n</body>')


def publish():
    repo=os.environ['GITHUB_REPOSITORY']
    runs=api(f'repos/{repo}/actions/runs?status=success&per_page=100')['workflow_runs']
    selected=None
    for run in sorted(runs,key=lambda x:x['updated_at'],reverse=True):
        if run.get('head_branch') != 'main':
            continue
        jobs=api(f'repos/{repo}/actions/runs/{run["id"]}/jobs')['jobs']
        if any(step.get('conclusion')=='success' and ('actions/deploy-pages@' in step.get('name','') or step.get('name')=='Deploy') for job in jobs for step in job.get('steps',[])):
            selected=run
            break
    if not selected:
        raise RuntimeError('No successful Pages publication to preserve')
    artifacts=api(f'repos/{repo}/actions/runs/{selected["id"]}/artifacts')['artifacts']
    artifact=next((a for a in artifacts if a['name']=='github-pages' and not a['expired']),None)
    if not artifact:
        raise RuntimeError('Latest deployed artifact unavailable')
    prior=Path('_chess-prior');prior.mkdir()
    subprocess.run(['gh','run','download',str(selected['id']),'--repo',repo,'--name','github-pages','--dir',str(prior)],check=True)
    root=Path('_site')
    extract_published(prior/'artifact.tar',root)
    before=protected(root)
    target=root/'chess-design-studio'
    shutil.rmtree(target,ignore_errors=True)
    shutil.copytree(Path(__file__).parent,target,ignore=shutil.ignore_patterns('tests','publish.py','__pycache__'))
    wrapper=root/'ai-chess-kuwait/index.html'
    if not wrapper.is_file():
        raise RuntimeError('Published chess wrapper is missing')
    wrapper.write_text(add_launcher(wrapper.read_text()))
    if before!=protected(root):
        raise RuntimeError('Unrelated publication changed')
    for name in ('index.html','style.css','app.mjs','core.mjs'):
        if not (target/name).is_file():
            raise RuntimeError('Studio asset missing')
    proof=dict(commit=os.environ['GITHUB_SHA'],base_run=selected['id'],protected_files=len(before))
    (target/'deployment.json').write_text(json.dumps(proof,indent=2)+'\n')
    print(f'Chess studio staged; {len(before)} unrelated files preserved')


if __name__=='__main__':
    publish()
