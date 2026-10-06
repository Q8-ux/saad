"""Publish Sabeq without rebuilding or changing any other deployed project."""
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import subprocess
import sys
import tarfile

WORKFLOW = ".github/workflows/deploy-pages.yml"

def command(*args):
    return subprocess.check_output(args, text=True).strip()

def api(path):
    return json.loads(command("gh", "api", path))

def digest(path):
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()

def protected_manifest(root):
    return {str(p.relative_to(root)): digest(p) for p in root.rglob("*")
            if p.is_file() and p.relative_to(root).parts[0] != "sabeq-legal"}

def extract_published(archive, destination):
    with tarfile.open(archive) as package:
        for item in package.getmembers():
            name = PurePosixPath(item.name)
            if name.is_absolute() or ".." in name.parts or not (item.isfile() or item.isdir()):
                raise RuntimeError("Unsafe Pages artifact entry")
        package.extractall(destination, filter="data")

def scope():
    before = os.environ.get("BEFORE_SHA", "")
    current = os.environ["GITHUB_SHA"]
    if command("git", "rev-parse", "HEAD") != current:
        raise RuntimeError("Checkout does not match the triggering commit")
    only = False
    if os.environ.get("GITHUB_EVENT_NAME") == "push" and re.fullmatch(r"[0-9a-f]{40}", before) and set(before) != {"0"}:
        subprocess.run(["git", "fetch", "--no-tags", "--depth=1", "origin", before], check=True)
        paths = command("git", "diff", "--name-only", before, current).splitlines()
        only = any(p.startswith("sabeq-legal/") for p in paths) and all(p.startswith("sabeq-legal/") or p == WORKFLOW for p in paths)
    with open(os.environ["GITHUB_OUTPUT"], "a") as f:
        f.write("sabeq_only=" + str(only).lower() + "\n")

def prepare():
    repo = os.environ["GITHUB_REPOSITORY"]
    if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repo):
        raise RuntimeError("Invalid repository")
    runs = api(f"repos/{repo}/actions/runs?status=success&per_page=100")["workflow_runs"]
    candidates = []
    for run in sorted(runs, key=lambda r: r["updated_at"], reverse=True):
        if run.get("head_branch") != "main":
            continue
        jobs = api(f"repos/{repo}/actions/runs/{int(run['id'])}/jobs")["jobs"]
        deployed = any(step.get("conclusion") == "success" and
                       ("actions/deploy-pages@" in step.get("name", "") or step.get("name") == "Deploy")
                       for job in jobs for step in job.get("steps", []))
        if deployed:
            candidates.append(run)
            break
    if not candidates:
        raise RuntimeError("No previously successful Pages deployment; refusing to rebuild unrelated projects")
    previous = max(candidates, key=lambda r: r["updated_at"])
    artifacts = api(f"repos/{repo}/actions/runs/{int(previous['id'])}/artifacts")["artifacts"]
    artifact = next((a for a in artifacts if a["name"] == "github-pages"), None)
    if not artifact or artifact["expired"]:
        raise RuntimeError("Latest published Pages artifact unavailable; refusing to restore an older deployment")
    destination = Path("_previous-pages")
    destination.mkdir(exist_ok=True)
    command("gh", "run", "download", str(previous["id"]), "--repo", repo, "--name", "github-pages", "--dir", str(destination))
    archive = destination / "artifact.tar"
    if not archive.is_file():
        raise RuntimeError("Published Pages tar missing")
    target = Path("_site")
    if target.exists():
        raise RuntimeError("Release staging must be empty")
    extract_published(archive, target)
    if not (target / "index.html").is_file():
        raise RuntimeError("Previous combined publication is incomplete")
    protected = protected_manifest(target)
    Path("_protected-pages.json").write_text(json.dumps(protected, sort_keys=True))
    source = Path("sabeq-legal")
    if not (source / "index.html").is_file() or not (source / "release.json").is_file():
        raise RuntimeError("Sabeq release incomplete")
    shutil.rmtree(target / "sabeq-legal", ignore_errors=True)
    shutil.copytree(source, target / "sabeq-legal", ignore=shutil.ignore_patterns("deployment"))
    release = json.loads((source / "release.json").read_text())
    proof = {"commit": os.environ["GITHUB_SHA"], "source": release["clientSource"], "baseRun": previous["id"],
             "protectedFiles": len(protected), "protectedManifestSha256": hashlib.sha256(json.dumps(protected, sort_keys=True).encode()).hexdigest()}
    (target / "sabeq-legal" / "deployment.json").write_text(json.dumps(proof, indent=2) + "\n")
    verify()

def verify():
    root = Path("_site")
    expected = json.loads(Path("_protected-pages.json").read_text())
    if protected_manifest(root) != expected:
        raise RuntimeError("An unrelated published file changed; deployment refused")
    page = (root / "sabeq-legal/index.html").read_text()
    scripts = re.findall(r'<script[^>]+src="([^"]+)"', page)
    if not scripts:
        raise RuntimeError("Sabeq client bundle missing")
    for src in scripts:
        if not src.startswith("/saad/sabeq-legal/assets/") or ".." in PurePosixPath(src).parts:
            raise RuntimeError("Unexpected client asset path")
        asset = root / src.removeprefix("/saad/")
        if not asset.is_file() or not asset.stat().st_size:
            raise RuntimeError("Sabeq referenced client asset missing")
    release = json.loads((root / "sabeq-legal/release.json").read_text())
    if not all(re.fullmatch(r"[a-f0-9]{40}", release.get(k, "")) for k in ("clientSource", "backendSource")):
        raise RuntimeError("Source provenance missing")
    print(f"Validated Sabeq release; {len(expected)} unrelated files are byte-identical")

if __name__ == "__main__":
    {"scope": scope, "prepare": prepare, "verify": verify}[sys.argv[1]]()
