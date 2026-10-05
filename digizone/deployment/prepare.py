"""Overlay Digizone onto the last successful Pages deployment without rebuilding other sites."""
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

TARGET = "digizone"


def manifest(root):
    return {
        str(path.relative_to(root)): hashlib.sha256(path.read_bytes()).hexdigest()
        for path in root.rglob("*")
        if path.is_file() and path.relative_to(root).parts[0] != TARGET
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
    for name in ("index.html", "styles.css", "app.js", "config.js", "assets/digital-orbit.webp"):
        if not (source / name).is_file() or not (source / name).stat().st_size:
            raise RuntimeError(f"Digizone release is incomplete: {name}")
    if (source / "assets/Cairo-Variable.woff2").read_bytes()[:4] != b"wOF2":
        raise RuntimeError("Cairo font is invalid")
    if not (source / "assets/Cairo-OFL.txt").is_file():
        raise RuntimeError("Cairo font license is missing")
    protected = manifest(root)
    if (root / TARGET).exists():
        shutil.rmtree(root / TARGET)
    shutil.copytree(source, root / TARGET, ignore=shutil.ignore_patterns("deployment", "__pycache__"))
    if manifest(root) != protected:
        raise RuntimeError("An unrelated published file changed; refusing deployment")
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
    deployments = api("deployments?environment=github-pages&per_page=100")
    for deployment in deployments:
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
    count = overlay(root, Path(TARGET))
    print(f"Updated Digizone; {count} unrelated published files remain byte-identical. Base run: {run_id}")


if __name__ == "__main__":
    prepare()
