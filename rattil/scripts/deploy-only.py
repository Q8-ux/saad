import os, shutil, subprocess, json, tarfile
from pathlib import Path, PurePosixPath

def run(*args):
    return subprocess.check_output(args, text=True).strip()

repo = os.environ["GITHUB_REPOSITORY"]
runs = json.loads(run("gh", "api", f"repos/{repo}/actions/runs?status=success&per_page=60"))["workflow_runs"]

for item in runs:
    if item.get("head_branch") != "main":
        continue
    artifacts = json.loads(run("gh", "api", f"repos/{repo}/actions/runs/{item['id']}/artifacts"))["artifacts"]
    if any(a["name"] == "github-pages" and not a["expired"] for a in artifacts):
        run("gh", "run", "download", str(item["id"]), "--repo", repo, "--name", "github-pages", "--dir", "_prior")
        break
else:
    raise RuntimeError("No prior successful Pages artifact: refusing destructive deployment")

with tarfile.open("_prior/artifact.tar") as tf:
    for member in tf.getmembers():
        path = PurePosixPath(member.name)
        if path.is_absolute() or ".." in path.parts or not (member.isfile() or member.isdir()):
            raise RuntimeError("Unsafe archive")
    tf.extractall("_site", filter="data")

target = Path("_site") / "rattil"
if target.exists():
    shutil.rmtree(target)
shutil.copytree("rattil", target)

required = [
    "rattil/index.html",
    "rattil/assets/app.js",
    "rattil/assets/app.css",
    "rattil/assets/quran-safe.css",
]
for name in required:
    path = Path("_site") / name
    assert path.exists() and path.stat().st_size > 100, f"Missing or empty: {name}"

print("Rattil updated; unrelated published sites retained")
