"""Overlay this app on the last successful Pages artifact; preserve other sites."""
import argparse
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

PROJECT = 'family-online-studio'
WEB_APP = 'family-online-iphone'
OWNED_PROJECTS = {PROJECT, WEB_APP}
REPO = 'Q8-ux/saad'
SOURCE = Path(__file__).resolve().parents[1]
LIMIT = 256 * 1024 * 1024

class SafeRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if urllib.parse.urlsplit(newurl).scheme != 'https':
            raise RuntimeError('Refusing a non-HTTPS artifact redirect.')
        redirected = super().redirect_request(req, fp, code, msg, headers, newurl)
        if urllib.parse.urlsplit(newurl).netloc != urllib.parse.urlsplit(req.full_url).netloc:
            redirected.remove_header('Authorization')
        return redirected

def request(url, token, binary=False):
    if urllib.parse.urlsplit(url).hostname != 'api.github.com':
        raise RuntimeError('Authenticated requests must target the GitHub API.')
    if binary:
        url += ('&' if '?' in url else '?') + 'fresh=' + str(time.time_ns())
    req = urllib.request.Request(url, headers={
        'Authorization': f'Bearer {token}',
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'family-online-studio-publisher',
        'Cache-Control': 'no-cache',
    })
    opener = urllib.request.build_opener(SafeRedirect())
    with opener.open(req, timeout=90) as response:
        data = response.read(LIMIT + 1)
    if len(data) > LIMIT:
        raise RuntimeError('Pages archive exceeds the safe extraction limit.')
    return data if binary else json.loads(data)

def prior_artifact(token):
    url = f'https://api.github.com/repos/{REPO}/actions/runs?status=success&branch=main&per_page=60'
    runs = request(url, token).get('workflow_runs', [])
    runs.sort(key=lambda run: run.get('updated_at', ''), reverse=True)
    for run in runs:
        artifacts = request(f'https://api.github.com/repos/{REPO}/actions/runs/{run["id"]}/artifacts?per_page=100', token)
        for artifact in artifacts.get('artifacts', []):
            if artifact.get('name') == 'github-pages' and not artifact.get('expired'):
                data = request(artifact['archive_download_url'], token, binary=True)
                print(f'Restored successful Pages artifact from run {run["id"]}.')
                return data
    raise RuntimeError('No successful Pages artifact found. Refusing to replace existing sites.')

def restore(data, destination):
    if destination.exists():
        if any(destination.iterdir()):
            raise RuntimeError('Restore destination must be empty.')
    destination.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        candidates = [info for info in archive.infolist() if info.filename.rsplit('/', 1)[-1] == 'artifact.tar']
        if len(candidates) != 1 or candidates[0].file_size > LIMIT:
            raise RuntimeError('Invalid Pages artifact envelope.')
        payload = archive.read(candidates[0])
    with tarfile.open(fileobj=io.BytesIO(payload), mode='r:*') as archive:
        members = archive.getmembers()
        if sum(max(0, m.size) for m in members) > LIMIT:
            raise RuntimeError('Expanded Pages archive exceeds the safe limit.')
        root = destination.resolve()
        for member in members:
            target = (root / member.name).resolve()
            if not target.is_relative_to(root) or member.name.startswith('/') or member.issym() or member.islnk() or not (member.isfile() or member.isdir()):
                raise RuntimeError('Unsafe path in the Pages archive.')
        archive.extractall(destination, members=members, filter='data')
    if not (destination / 'index.html').is_file():
        raise RuntimeError('The prior Pages snapshot has no root index. Refusing publication.')

def fingerprints(destination):
    return {str(p.relative_to(destination)): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in destination.rglob('*') if p.is_file()
            and p.relative_to(destination).parts[0] not in OWNED_PROJECTS}

def overlay(destination):
    before = fingerprints(destination)
    target = destination / PROJECT
    if target.exists():
        shutil.rmtree(target)
    target.mkdir()
    shutil.copy2(SOURCE / 'index.html', target / 'index.html')
    shutil.copytree(SOURCE / 'assets', target / 'assets')
    if not (target / 'assets' / 'app.mjs').is_file():
        raise RuntimeError('Incomplete screenplay application.')
    web_source = SOURCE.parent / WEB_APP
    web_target = destination / WEB_APP
    if web_target.exists():
        shutil.rmtree(web_target)
    web_target.mkdir()
    for filename in ['index.html', 'manifest.webmanifest', 'install.css', 'launch.mjs']:
        shutil.copy2(web_source / filename, web_target / filename)
    shutil.copytree(web_source / 'icons', web_target / 'icons')
    if before != fingerprints(destination):
        raise RuntimeError('A site outside this application changed. Refusing publication.')
    print(f'Prepared {PROJECT} and {WEB_APP}; verified preservation of {len(before)} existing files.')

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--fixture', type=Path)
    parser.add_argument('--destination', type=Path, default=Path('_site'))
    args = parser.parse_args()
    token = os.environ.get('GH_TOKEN')
    if not args.fixture and not token:
        raise RuntimeError('GH_TOKEN is required for publication.')
    data = args.fixture.read_bytes() if args.fixture else prior_artifact(token)
    restore(data, args.destination)
    overlay(args.destination)

if __name__ == '__main__':
    main()

