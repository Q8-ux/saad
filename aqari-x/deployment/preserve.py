"""Publish Aqari X while preserving every other previously deployed file."""
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import shutil
import subprocess
import tarfile

def api(path):
    return json.loads(subprocess.check_output(["gh", "api", path], text=True))

def protected_manifest(root):
    return {str(p.relative_to(root)): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in root.rglob("*") if p.is_file() and p.relative_to(root).parts[0] != "aqari-x"}

def prepare():
    repository = os.environ["GITHUB_REPOSITORY"]
    runs = api(f"repos/{repository}/actions/runs?status=success&per_page=100")["workflow_runs"]
    previous = None
    for run in sorted(runs, key=lambda x: x["updated_at"], reverse=True):
        if run.get("head_branch") != "main":
            continue
        jobs = api(f"repos/{repository}/actions/runs/{int(run['id'])}/jobs?per_page=100")["jobs"]
        if any(step.get("conclusion") == "success" and
               ("actions/deploy-pages@" in step.get("name", "") or step.get("name") == "Deploy")
               for job in jobs for step in job.get("steps", [])):
            previous = run
            break
    if previous is None:
        raise RuntimeError("No previous successful publication; refusing to replace other projects")
    artifacts = api(f"repos/{repository}/actions/runs/{int(previous['id'])}/artifacts")["artifacts"]
    artifact = next((a for a in artifacts if a["name"] == "github-pages"), None)
    if not artifact or artifact["expired"]:
        raise RuntimeError("Latest published artifact is unavailable; no deployment performed")
    download = Path("_previous-aqari-pages")
    download.mkdir()
    subprocess.run(["gh", "run", "download", str(previous["id"]), "--repo", repository,
                    "--name", "github-pages", "--dir", str(download)], check=True)
    root = Path("_site")
    if root.exists():
        raise RuntimeError("Release directory must start empty")
    with tarfile.open(download / "artifact.tar") as archive:
        for item in archive.getmembers():
            name = PurePosixPath(item.name)
            if name.is_absolute() or ".." in name.parts or not (item.isfile() or item.isdir()):
                raise RuntimeError("Unsafe published archive entry")
        archive.extractall(root, filter="data")
    if not (root / "index.html").is_file():
        raise RuntimeError("The previous publication is incomplete")
    preserved = protected_manifest(root)
    source = Path("aqari-x/public")
    required = ["index.html", "app.mjs", "core.mjs", "style.css", "config.mjs",
                "admin/index.html", "admin/admin.mjs", "assets/fonts/al-mohanad.woff"]
    for name in required:
        if not (source / name).is_file():
            raise RuntimeError(f"Missing Aqari X public file: {name}")
    if not (source / "config.mjs").read_text().count("https://"):
        raise RuntimeError("A real backend URL is required")
    shutil.rmtree(root / "aqari-x", ignore_errors=True)
    shutil.copytree(source, root / "aqari-x", ignore=shutil.ignore_patterns("__qa-*"))
    if protected_manifest(root) != preserved:
        raise RuntimeError("An unrelated project's published content changed")
    proof = {"version":"1.0.0", "commit":os.environ["GITHUB_SHA"], "baseRun":previous["id"],
             "preservedFiles":len(preserved), "data":"server-persisted", "admin":"server-authorized"}
    (root / "aqari-x/deployment.json").write_text(json.dumps(proof, indent=2) + "\n")
    print(f"Prepared Aqari X; {len(preserved)} unrelated published files are unchanged.")

if __name__ == "__main__":
    prepare()
