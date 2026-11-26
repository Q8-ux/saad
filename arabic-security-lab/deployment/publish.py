"""Publish only Misbar, preserving every unrelated file in the current Pages artifact."""
import argparse
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import subprocess
import tarfile
import zipfile

TARGET = 'arabic-security-lab'


def manifest(root):
    return {str(p.relative_to(root)): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in root.rglob('*') if p.is_file() and p.relative_to(root).parts[0] != TARGET}


def extract(payload, root):
    with tarfile.open(fileobj=io.BytesIO(payload)) as archive:
        for item in archive.getmembers():
            name = PurePosixPath(item.name)
            if name.is_absolute() or '..' in name.parts or not (item.isfile() or item.isdir()):
                raise RuntimeError('Unsafe published artifact member')
        archive.extractall(root, filter='data')


def overlay(root, source):
    if not (root / 'index.html').is_file():
        raise RuntimeError('The existing combined Pages artifact is incomplete')
    for name in ('index.html', 'app.mjs', 'analysis.mjs', 'styles.css', 'catalog.json', 'assets/fonts.css'):
        if not (source / name).is_file():
            raise RuntimeError('Misbar web assets are incomplete: ' + name)
    if len(json.loads((source / 'catalog.json').read_text())['tools']) != 52:
        raise RuntimeError('Misbar catalog is incomplete')
    protected = manifest(root)
    target = root / TARGET
    if target.exists():
        shutil.rmtree(target)
    shutil.copytree(source, target)
    (target / 'release-version.txt').write_text(os.environ.get('GITHUB_SHA', 'local') + '\n')
    if manifest(root) != protected:
        raise RuntimeError('An unrelated published file changed; refusing publication')
    return len(protected)


def prepare(add_to_build=False):
    root, source = Path('_site'), Path(TARGET) / 'web'
    if add_to_build:
        print('Misbar included; unrelated files preserved:', overlay(root, source))
        return
    repo = os.environ['GITHUB_REPOSITORY']
    if not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+', repo):
        raise RuntimeError('Invalid repository')
    if subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip() != os.environ['GITHUB_SHA']:
        raise RuntimeError('Checkout does not match the triggering revision')
    def api(path):
        return json.loads(subprocess.check_output(['gh', 'api', f'repos/{repo}/{path}'], text=True))
    current = None
    for deployment in api('deployments?environment=github-pages&per_page=100'):
        statuses = api(f"deployments/{int(deployment['id'])}/statuses")
        if statuses and statuses[0]['state'] == 'success':
            match = re.search(r'/actions/runs/(\d+)', statuses[0].get('log_url', ''))
            if not match:
                raise RuntimeError('Cannot resolve the successful deployment run')
            current = int(match.group(1))
            break
    if current is None:
        raise RuntimeError('No successful deployment; refusing an unrelated rebuild')
    run = api(f'actions/runs/{current}')
    if run['conclusion'] != 'success':
        raise RuntimeError('Current deployment workflow is not complete')
    artifact = next((x for x in api(f'actions/runs/{current}/artifacts')['artifacts']
                     if x['name'] == 'github-pages' and not x['expired']), None)
    if not artifact:
        raise RuntimeError('Current published artifact is unavailable')
    payload = subprocess.check_output(['gh', 'api', f"repos/{repo}/actions/artifacts/{int(artifact['id'])}/zip"])
    if root.exists():
        raise RuntimeError('Publication staging must be empty')
    with zipfile.ZipFile(io.BytesIO(payload)) as zipped:
        extract(zipped.read('artifact.tar'), root)
    count = overlay(root, source)
    print(f'Misbar updated; {count} unrelated files byte-identical. Base run: {current}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--add-to-build', action='store_true')
    prepare(parser.parse_args().add_to_build)
