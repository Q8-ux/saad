"""Update only Noura in the latest successfully published GitHub Pages artifact."""
from pathlib import Path
import hashlib
import json
import os
import shutil
import subprocess
import tarfile
import zipfile


def api(path):
    return json.loads(subprocess.check_output(["gh", "api", path], text=True))


def hashes(root):
    return {
        p.relative_to(root).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest()
        for p in root.rglob("*")
        if p.is_file() and p.relative_to(root).parts[0] != "noura-alattal"
    }


def main():
    repository = os.environ["GITHUB_REPOSITORY"]
    current_run = int(os.environ["GITHUB_RUN_ID"])
    artifacts = api(f"repos/{repository}/actions/artifacts?name=github-pages&per_page=100")["artifacts"]
    chosen = None
    for artifact in sorted(artifacts, key=lambda a: a["created_at"], reverse=True):
        run_id = artifact.get("workflow_run", {}).get("id")
        if artifact["expired"] or not run_id or run_id == current_run:
            continue
        run = api(f"repos/{repository}/actions/runs/{run_id}")
        if run["status"] == "completed" and run["conclusion"] == "success":
            chosen = artifact
            break
    if not chosen:
        raise RuntimeError("No successful published Pages artifact; refusing to replace other projects")
    prior = Path(".noura-release-prior")
    prior.mkdir(exist_ok=True)
    archive = prior / "site.zip"
    with archive.open("wb") as output:
        subprocess.run(["gh", "api", f"repos/{repository}/actions/artifacts/{chosen['id']}/zip"], stdout=output, check=True)
    with zipfile.ZipFile(archive) as zipped:
        for member in zipped.infolist():
            if Path(member.filename).is_absolute() or ".." in Path(member.filename).parts:
                raise RuntimeError("Invalid artifact archive path")
        zipped.extractall(prior)
    target = Path("_site")
    target.mkdir(exist_ok=True)
    with tarfile.open(prior / "artifact.tar") as tar:
        tar.extractall(target, filter="data")
    before = hashes(target)
    if not before:
        raise RuntimeError("Empty published baseline; refusing a destructive replacement")
    noura_target = target / "noura-alattal"
    if noura_target.exists():
        shutil.rmtree(noura_target)
    shutil.copytree("noura-alattal", noura_target)
    page = (target / "noura-alattal/index.html").read_text()
    if 'id="courses"' not in page or "20261004-courses-v2" not in page or "</html>" not in page:
        raise RuntimeError("Noura release is incomplete")
    for name in ["navigation.js", "admin-reference.js"]:
        if not (target / "noura-alattal/assets" / name).is_file():
            raise RuntimeError(f"Missing required asset: {name}")
    for html in noura_target.rglob("*.html"):
        content = html.read_text()
        if "#videos" in content or 'id="videos"' in content or "video-library." in content or "video-core.js" in content:
            raise RuntimeError(f"Removed video library is still referenced: {html}")
    if hashes(target) != before:
        raise RuntimeError("An unrelated published file changed")
    print(f"Updated Noura; preserved {len(before)} unrelated published files from artifact {chosen['id']}.")


if __name__ == "__main__":
    main()

