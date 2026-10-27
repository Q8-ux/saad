"""Overlay Ruya on a successful main-branch Pages artifact, preserving every other byte."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tarfile
import zipfile


def api(path):
    return json.loads(subprocess.check_output(["gh", "api", path], text=True))


def hashes(root):
    return {p.relative_to(root).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in root.rglob("*") if p.is_file() and p.relative_to(root).parts[0] != "ruya"}


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
        if (run["status"] == "completed" and run["conclusion"] == "success"
                and run["head_branch"] == "main"
                and run.get("head_repository", {}).get("full_name", "").casefold() == repository.casefold()
                and run["event"] in {"push", "workflow_dispatch", "workflow_run"}):
            chosen = artifact
            break
    if chosen is None:
        raise RuntimeError("No trusted successful Pages baseline; refusing to replace existing projects")
    prior = Path(".ruya-prior")
    prior.mkdir(exist_ok=True)
    archive = prior / "site.zip"
    with archive.open("wb") as output:
        subprocess.run(["gh", "api", f"repos/{repository}/actions/artifacts/{chosen['id']}/zip"], stdout=output, check=True)
    with zipfile.ZipFile(archive) as zipped:
        if set(zipped.namelist()) != {"artifact.tar"}:
            raise RuntimeError("Unexpected Pages artifact layout")
        zipped.extract("artifact.tar", prior)
    target = Path("_site")
    target.mkdir(exist_ok=True)
    with tarfile.open(prior / "artifact.tar") as tar:
        for member in tar.getmembers():
            if not (member.isfile() or member.isdir()):
                raise RuntimeError("Refusing special files or links in baseline")
        tar.extractall(target, filter="data")
    if not (target / "index.html").is_file():
        raise RuntimeError("Baseline lacks the existing root page")
    before = hashes(target)
    if len(before) < 100:
        raise RuntimeError("Unexpectedly small baseline; refusing replacement")
    destination = target / "ruya"
    if destination.exists():
        shutil.rmtree(destination)
    destination.mkdir()
    for name in ["index.html", "styles.css", "app.mjs", "engine.mjs", "corpus.json"]:
        shutil.copy2(Path("ruya") / name, destination / name)
    shutil.copytree("ruya/assets", destination / "assets")
    (destination / "release-version.txt").write_text(os.environ["GITHUB_SHA"] + "\n")
    if hashes(target) != before:
        raise RuntimeError("An unrelated project changed")
    page = (destination / "index.html").read_text()
    if 'id="dream-form"' not in page or "</html>" not in page:
        raise RuntimeError("Incomplete Ruya entry point")
    corpus = json.loads((destination / "corpus.json").read_text())
    if len(corpus["sources"]) < 40 or len(corpus["rules"]) < 25:
        raise RuntimeError("Incomplete reference corpus")
    print(f"Updated ruya only; preserved {len(before)} unrelated files from successful artifact {chosen['id']}.")


if __name__ == "__main__":
    main()
