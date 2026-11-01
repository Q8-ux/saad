"""Publish only the public Fiqh runtime over the currently deployed Pages artifact."""
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import subprocess
import sys
import tarfile
import zipfile

SLUG = "kuwait-fiqh"
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))
from build import build


def api(repository, path):
    return json.loads(subprocess.check_output(["gh", "api", f"repos/{repository}/{path}"], text=True))


def hashes(root):
    return {p.relative_to(root).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in root.rglob("*") if p.is_file() and p.relative_to(root).parts[0] != SLUG}


def main():
    repository = os.environ["GITHUB_REPOSITORY"]
    if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repository):
        raise RuntimeError("Invalid repository")
    if subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip() != os.environ["GITHUB_SHA"]:
        raise RuntimeError("Source checkout differs from requested release")
    run_id = None
    for deployment in api(repository, "deployments?environment=github-pages&per_page=100"):
        statuses = api(repository, f"deployments/{int(deployment['id'])}/statuses")
        if not statuses or statuses[0]["state"] != "success":
            continue
        match = re.search(r"/actions/runs/(\d+)", statuses[0].get("log_url", ""))
        if not match:
            raise RuntimeError("Cannot resolve the active successful Pages deployment")
        run_id = int(match.group(1))
        break
    if run_id is None:
        raise RuntimeError("No deployed baseline; refusing to replace other projects")
    run = api(repository, f"actions/runs/{run_id}")
    if run["conclusion"] != "success" or run["head_branch"] != "main":
        raise RuntimeError("Deployed baseline is not a successful main release")
    artifacts = api(repository, f"actions/runs/{run_id}/artifacts")["artifacts"]
    artifact = next((a for a in artifacts if a["name"] == "github-pages" and not a["expired"]), None)
    if artifact is None:
        raise RuntimeError("The active Pages artifact has expired")
    zipped = subprocess.check_output(["gh", "api", f"repos/{repository}/actions/artifacts/{int(artifact['id'])}/zip"])
    root = Path("_site")
    if root.exists():
        raise RuntimeError("Release staging must be empty")
    with zipfile.ZipFile(io.BytesIO(zipped)) as archive:
        with tarfile.open(fileobj=io.BytesIO(archive.read("artifact.tar"))) as package:
            for member in package.getmembers():
                path = PurePosixPath(member.name)
                if path.is_absolute() or ".." in path.parts or not (member.isfile() or member.isdir()):
                    raise RuntimeError("Unsafe baseline archive entry")
            package.extractall(root, filter="data")
    if not (root / "index.html").is_file():
        raise RuntimeError("The existing combined website is incomplete")
    before = hashes(root)
    if len(before) < 100:
        raise RuntimeError("Unexpectedly small published baseline")
    build(root / SLUG)
    (root / SLUG / "release-version.txt").write_text(os.environ["GITHUB_SHA"] + "\n")
    if hashes(root) != before:
        raise RuntimeError("An unrelated published file changed")
    print(f"Published {SLUG}; {len(before)} unrelated files remain byte-identical. Baseline run {run_id}.")


if __name__ == "__main__":
    main()
