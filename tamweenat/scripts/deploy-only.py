import os, shutil, subprocess, json, tarfile
from pathlib import Path, PurePosixPath
def run(*args): return subprocess.check_output(args,text=True).strip()
repo=os.environ["GITHUB_REPOSITORY"]
runs=json.loads(run("gh","api",f"repos/{repo}/actions/runs?status=success&per_page=60"))["workflow_runs"]
for item in runs:
 if item.get("head_branch")!="main":continue
 artifacts=json.loads(run("gh","api",f"repos/{repo}/actions/runs/{item['id']}/artifacts"))["artifacts"]
 if any(a["name"]=="github-pages" and not a["expired"] for a in artifacts):
  run("gh","run","download",str(item["id"]),"--repo",repo,"--name","github-pages","--dir","_prior");break
else: raise RuntimeError("No prior successful Pages artifact: refusing destructive deployment")
with tarfile.open("_prior/artifact.tar") as tf:
 for m in tf.getmembers():
  p=PurePosixPath(m.name)
  if p.is_absolute() or ".." in p.parts or not (m.isfile() or m.isdir()):raise RuntimeError("Unsafe archive")
 tf.extractall("_site",filter="data")
for name in ("tamweenat","tamweenat-admin","zad-restaurants"):
 target=Path("_site")/name
 if target.exists():shutil.rmtree(target)
 shutil.copytree(name,target)
for name in ("tamweenat/index.html","tamweenat-admin/index.html","zad-restaurants/login.html"):
 assert (Path("_site")/name).stat().st_size>200
print("Tamweenat updated; unrelated published sites retained")
