"""Publish Dr Hamad preview while preserving the current Pages artifact."""
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

FILES = tuple(str(p) for p in Path("dr-hamad-instagram-demo").rglob("*") if p.is_file())

def digest(path):
    result = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            result.update(block)
    return result.hexdigest()

def manifest(root):
    return {
        str(path.relative_to(root)): digest(path)
        for path in root.rglob("*")
        if path.is_file() and str(path.relative_to(root)) not in FILES
    }

def extract(archive, root):
    with tarfile.open(fileobj=io.BytesIO(archive)) as package:
        for item in package.getmembers():
            name = PurePosixPath(item.name)
            if name.is_absolute() or ".." in name.parts or not (item.isfile() or item.isdir()):
                raise RuntimeError("Unsafe published artifact entry")
        package.extractall(root, filter="data")

def overlay(root, source):
    if not (root / "index.html").is_file():
        raise RuntimeError("The existing combined site is incomplete")
    for name in FILES:
        if not (source / name).is_file() or not (source / name).stat().st_size:
            raise RuntimeError(f"Platform source file missing: {name}")
    protected = manifest(root)
    for name in FILES:
        (root / name).parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source / name, root / name)
    if manifest(root) != protected:
        raise RuntimeError("An unrelated published file changed; refusing deployment")
    if any(digest(root / name) != digest(source / name) for name in FILES):
        raise RuntimeError("Published text does not match the source")
    page = (root / "dr-hamad-instagram-demo/index.html").read_text()
    for reference in re.findall(r'(?:src|href)="(\./[^"]+)"', page):
        relative = PurePosixPath(reference.split("?", 1)[0])
        if ".." in relative.parts or not (root / "dr-hamad-instagram-demo" / relative).is_file():
            raise RuntimeError(f"Referenced platform asset missing: {reference}")
    return len(protected)

def prepare():
    repo = os.environ["GITHUB_REPOSITORY"]
    if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repo):
        raise RuntimeError("Invalid repository")
    if subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip() != os.environ["GITHUB_SHA"]:
        raise RuntimeError("Checkout does not match the triggering commit")

    def api(path):
        return json.loads(subprocess.check_output(["gh", "api", f"repos/{repo}/{path}"], text=True))

    run_id = None
    for deployment in api("deployments?environment=github-pages&per_page=100"):
        statuses = api(f"deployments/{int(deployment['id'])}/statuses")
        if not statuses or statuses[0]["state"] != "success":
            continue
        match = re.search(r"/actions/runs/(\d+)", statuses[0].get("log_url", ""))
        if not match:
            raise RuntimeError("Cannot resolve the current successful Pages deployment")
        run_id = int(match.group(1))
        break
    if run_id is None:
        raise RuntimeError("No successful Pages baseline is available")
    run = api(f"actions/runs/{run_id}")
    if run["conclusion"] != "success":
        raise RuntimeError("The published workflow has not finished successfully")
    artifacts = api(f"actions/runs/{run_id}/artifacts")["artifacts"]
    artifact = next((item for item in artifacts if item["name"] == "github-pages" and not item["expired"]), None)
    if artifact is None:
        raise RuntimeError("The currently published Pages artifact is unavailable")
    zipped = subprocess.check_output(["gh", "api", f"repos/{repo}/actions/artifacts/{int(artifact['id'])}/zip"])
    root = Path("_site")
    if root.exists():
        raise RuntimeError("Release staging must be empty")
    with zipfile.ZipFile(io.BytesIO(zipped)) as archive:
        extract(archive.read("artifact.tar"), root)
    count = overlay(root, Path("."))
    print(f"Published Dr Hamad preview; {count} other files remain byte-identical. Base run: {run_id}")

if __name__ == "__main__":
    prepare()
