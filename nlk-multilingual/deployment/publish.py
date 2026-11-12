"""Atomic NLK-only GitHub Pages publication while preserving all other published sites.

This route is used by the shared Pages workflow ONLY when changed paths are
confined to nlk-multilingual/ and its deployment workflow. It restores the
previous successful Pages artifact, replaces only nlk-multilingual, and
refuses to deploy if it cannot prove an existing successful site is present.
"""
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import shutil
import subprocess
import tarfile

SITE = Path("_site")
PROJECT = "nlk-multilingual"


def command(*args):
    return subprocess.check_output(args, text=True, stderr=subprocess.STDOUT).strip()


def api(route):
    return json.loads(command("gh", "api", route))


def digest(path):
    check = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            check.update(chunk)
    return check.hexdigest()


def preserved(root):
    return {
        str(item.relative_to(root)): digest(item)
        for item in root.rglob("*")
        if item.is_file() and item.relative_to(root).parts[0] != PROJECT
    }


def locate_prior_artifact(repo):
    runs = api(f"repos/{repo}/actions/workflows/deploy-pages.yml/runs?status=success&per_page=80")["workflow_runs"]
    runs = sorted(runs, key=lambda row: row.get("updated_at", ""), reverse=True)
    for run in runs:
        if run.get("head_branch") != "main":
            continue
        if int(run.get("id")) == int(os.environ.get("GITHUB_RUN_ID", "0")):
            continue
        jobs = api(f"repos/{repo}/actions/runs/{int(run['id'])}/jobs")["jobs"]
        deployed = any(
            step.get("name") == "Deploy" and step.get("conclusion") == "success"
            for job in jobs for step in job.get("steps", [])
        )
        if not deployed:
            continue
        artifacts = api(f"repos/{repo}/actions/runs/{int(run['id'])}/artifacts")["artifacts"]
        artifact = next(
            (a for a in artifacts if a.get("name") == "github-pages" and not a.get("expired")),
            None,
        )
        if artifact:
            return int(run["id"])
        # A newer successful deployment with a missing artifact must not be
        # silently replaced by an older, potentially stale version.
        raise RuntimeError("Latest deployed GitHub Pages artifact has expired or is missing")
    raise RuntimeError("No previous successful GitHub Pages artifact found")


def extract_safely(archive, destination):
    with tarfile.open(archive) as tar:
        for member in tar.getmembers():
            path = PurePosixPath(member.name)
            if path.is_absolute() or ".." in path.parts:
                raise RuntimeError("Unsafe path in published artifact")
            if not (member.isdir() or member.isfile()):
                raise RuntimeError("Non-file entry in published artifact")
        tar.extractall(destination, filter="data")


def main():
    repo = os.environ["GITHUB_REPOSITORY"]
    if not (Path(PROJECT) / "index.html").is_file():
        raise RuntimeError("NLK site source is missing")
    if SITE.exists():
        raise RuntimeError("Pages staging directory must be empty")

    previous = locate_prior_artifact(repo)
    staging = Path("_prior_nlk")
    staging.mkdir(exist_ok=False)
    command("gh", "run", "download", str(previous), "--repo", repo,
            "--name", "github-pages", "--dir", str(staging))
    artifact = staging / "artifact.tar"
    if not artifact.is_file():
        raise RuntimeError("Previous published artifact was not downloaded")
    SITE.mkdir(exist_ok=False)
    extract_safely(artifact, SITE)
    if not (SITE / "index.html").is_file():
        raise RuntimeError("Previous combined site is incomplete: root index missing")
    old = preserved(SITE)

    destination = SITE / PROJECT
    if destination.exists():
        shutil.rmtree(destination)
    shutil.copytree(PROJECT, destination, ignore=shutil.ignore_patterns(
        "deployment", "__pycache__", "*.pyc"))
    for filename in ("index.html", "styles.css", "app.js", "verify.mjs"):
        file = destination / filename
        if not file.is_file() or file.stat().st_size < 100:
            raise RuntimeError(f"Missing or empty NLK artifact: {filename}")

    css = (destination / "styles.css").read_text(encoding="utf-8")
    if 'family=Cairo:wght@400;500;600;700;800' not in css:
        raise RuntimeError("Cairo Google Fonts import missing")
    if 'font-family: "Cairo"' not in css:
        raise RuntimeError("Cairo font-family rule missing")

    revision = os.environ["GITHUB_SHA"]
    (destination / "release-version.txt").write_text(revision + "\n", encoding="utf-8")
    (SITE / ".nojekyll").touch()
    now = preserved(SITE)
    if old != now:
        raise RuntimeError("Unrelated pages changed in staging: refusing deployment")
    print(f"NLK-only artifact prepared; preserved {len(old)} unrelated files, base run {previous}")


if __name__ == "__main__":
    main()
