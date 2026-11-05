"""Safely add Gulf Investment Compass and preserved Stocks screener to Pages.

This intentionally does NOT rebuild or overwrite unrelated sites.
"""
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

PROJECT = "stock-opportunity-radar"


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as fp:
        for chunk in iter(lambda: fp.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def snapshot(root):
    return {
        str(p.relative_to(root)): sha256(p)
        for p in root.rglob("*")
        if p.is_file() and p.relative_to(root).parts[0] != PROJECT
    }


def safe_extract(tar_data, root):
    with tarfile.open(fileobj=io.BytesIO(tar_data)) as archive:
        for member in archive.getmembers():
            path = PurePosixPath(member.name)
            if path.is_absolute() or ".." in path.parts or not (member.isfile() or member.isdir()):
                raise RuntimeError("Unsafe entry in preserved GitHub Pages artifact")
        archive.extractall(root, filter="data")


def prepare():
    repo = os.environ["GITHUB_REPOSITORY"]
    if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repo):
        raise RuntimeError("Unexpected repository identifier")
    expected = os.environ["GITHUB_SHA"]
    actual = subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip()
    if actual != expected:
        raise RuntimeError("Checkout does not match the triggering commit")
    source = Path(PROJECT)
    required = ("index.html", "guide.css", "guide.js", "guide-data.js", "assets/talking-path.js", "stocks/index.html", "README.md")
    for name in required:
        if not (source / name).is_file() or not (source / name).stat().st_size:
            raise RuntimeError("Missing Gulf Guide source: " + name)
    page = (source / "index.html").read_text(encoding="utf-8")
    for marker in ("Gulf Investment Compass", 'id="chatForm"', 'id="language"', 'id="lawCards"'):
        if marker not in page:
            raise RuntimeError("Gulf Guide HTML is incomplete: " + marker)
    stock_page = (source / "stocks/index.html").read_text(encoding="utf-8")
    for marker in ("STOCK OPPORTUNITY RADAR", 'id="csvFile"'):
        if marker not in stock_page:
            raise RuntimeError("Preserved stocks screener is incomplete: " + marker)

    def api(path):
        result = subprocess.check_output(["gh", "api", f"repos/{repo}/{path}"], text=True)
        return json.loads(result)

    run_id = None
    for deployment in api("deployments?environment=github-pages&per_page=100"):
        statuses = api(f"deployments/{int(deployment['id'])}/statuses")
        if not statuses or statuses[0]["state"] != "success":
            continue
        match = re.search(r"/actions/runs/(\d+)", statuses[0].get("log_url", ""))
        if not match:
            raise RuntimeError("Cannot identify the current successful Pages run")
        run_id = int(match.group(1))
        break
    if run_id is None:
        raise RuntimeError("No successful GitHub Pages baseline; refusing unsafe overwrite")

    run = api(f"actions/runs/{run_id}")
    if run["conclusion"] != "success":
        raise RuntimeError("Current published workflow is not successful")
    items = api(f"actions/runs/{run_id}/artifacts")["artifacts"]
    artifact = next((a for a in items if a["name"] == "github-pages" and not a["expired"]), None)
    if artifact is None:
        raise RuntimeError("Current published Pages artifact is unavailable")
    data = subprocess.check_output(
        ["gh", "api", f"repos/{repo}/actions/artifacts/{int(artifact['id'])}/zip"]
    )
    root = Path("_site")
    if root.exists():
        raise RuntimeError("Refusing to overwrite existing _site staging")
    with zipfile.ZipFile(io.BytesIO(data)) as bundle:
        safe_extract(bundle.read("artifact.tar"), root)
    if not (root / "index.html").is_file():
        raise RuntimeError("Baseline site index missing")

    protected = snapshot(root)
    shutil.rmtree(root / PROJECT, ignore_errors=True)
    shutil.copytree(source, root / PROJECT)
    if snapshot(root) != protected:
        raise RuntimeError("Unrelated deployed content changed; refusing deployment")
    for item in source.rglob("*"):
        if item.is_file():
            dest = root / item.relative_to(source.parent)
            if sha256(dest) != sha256(item):
                raise RuntimeError(f"Copy mismatch: {item}")
    print(f"Gulf Investment Compass staged with {len(protected)} unrelated files unchanged. Baseline run {run_id}")


if __name__ == "__main__":
    prepare()
