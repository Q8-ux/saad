"""Overlay this page on the latest successfully published Pages artifact."""
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
    return {str(file.relative_to(root)): hashlib.sha256(file.read_bytes()).hexdigest()
            for file in root.rglob("*") if file.is_file() and file.relative_to(root).parts[0] != "phone-track"}

def prepare():
    repository = os.environ["GITHUB_REPOSITORY"]
    runs = api(f"repos/{repository}/actions/runs?status=success&per_page=100")["workflow_runs"]
    previous = None
    for run in sorted(runs, key=lambda item: item["updated_at"], reverse=True):
        if run.get("head_branch") != "main":
            continue
        jobs = api(f"repos/{repository}/actions/runs/{int(run['id'])}/jobs?per_page=100")["jobs"]
        if any(step.get("conclusion") == "success" and
               ("actions/deploy-pages@" in step.get("name", "") or step.get("name") == "Deploy")
               for job in jobs for step in job.get("steps", [])):
            previous = run
            break
    if not previous:
        raise RuntimeError("No successful Pages publication is available")
    artifacts = api(f"repos/{repository}/actions/runs/{int(previous['id'])}/artifacts")["artifacts"]
    artifact = next((item for item in artifacts if item["name"] == "github-pages"), None)
    if not artifact or artifact["expired"]:
        raise RuntimeError("Latest published artifact unavailable; cannot preserve existing sites")
    download = Path("_previous-phone-pages")
    download.mkdir()
    subprocess.run(["gh", "run", "download", str(previous["id"]), "--repo", repository, "--name", "github-pages", "--dir", str(download)], check=True)
    root = Path("_site")
    if root.exists():
        raise RuntimeError("Release staging must start empty")
    with tarfile.open(download / "artifact.tar") as archive:
        for item in archive.getmembers():
            name = PurePosixPath(item.name)
            if name.is_absolute() or ".." in name.parts or not (item.isfile() or item.isdir()):
                raise RuntimeError("Unexpected entry in the published artifact")
        archive.extractall(root, filter="data")
    if not (root / "index.html").is_file():
        raise RuntimeError("Previous publication is incomplete")
    protected = protected_manifest(root)
    source = Path("phone-track/public")
    for filename in ["index.html", "assets/app.js", "assets/styles.css", "assets/Cairo-Variable.woff2", "data/965.json"]:
        if not (source / filename).is_file():
            raise RuntimeError(f"Missing phone page asset: {filename}")
    shutil.rmtree(root / "phone-track", ignore_errors=True)
    shutil.copytree(source, root / "phone-track")
    if protected_manifest(root) != protected:
        raise RuntimeError("An unrelated published file changed")
    proof = {"commit": os.environ["GITHUB_SHA"], "baseRun": previous["id"], "preservedFiles": len(protected), "numberLookup": "browser-local", "metadataVersion": "9.0.41"}
    (root / "phone-track/deployment.json").write_text(json.dumps(proof, indent=2) + "\n")
    print(f"Prepared phone page; {len(protected)} other published files are unchanged.")

if __name__ == "__main__":
    prepare()
