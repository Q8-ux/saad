import os, shutil, subprocess, json, tarfile
from pathlib import Path, PurePosixPath
def run(*args): return subprocess.check_output(args,text=True).strip()
repo=os.environ["GITHUB_REPOSITORY"]
runs=json.loads(run("gh","api",f"repos/{repo}/actions/workflows/deploy-pages.yml/runs?status=success&per_page=60"))["workflow_runs"]
for item in runs:
 if item.get("head_branch")!="main" or item.get("id")==int(os.environ.get("GITHUB_RUN_ID","0")):continue
 jobs=json.loads(run("gh","api",f"repos/{repo}/actions/runs/{item['id']}/jobs"))["jobs"]
 if not any(step.get("name")=="Deploy" and step.get("conclusion")=="success" for job in jobs for step in job.get("steps",[])):continue
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
for name in ("tamweenat/index.html","tamweenat/catalog-photos.json","tamweenat/storefront-v7.css","tamweenat/assistant-v1.js","tamweenat/meal-planner-v1.js","tamweenat-admin/index.html","zad-restaurants/login.html"):
 assert (Path("_site")/name).stat().st_size>200
(Path("_site")/".nojekyll").touch()
(Path("_site")/"tamweenat"/"release-version.txt").write_text(os.environ.get("GITHUB_SHA","unknown")+"\n")
html=(Path("_site")/"tamweenat"/"index.html").read_text(encoding="utf-8")
assert "السعر عند التأكيد" not in html, "Old price-on-confirmation text still in published artifact"
assert "catalog-photos.json" in html, "Old catalog reference in published artifact"
assert "storefront-v7.css" in html, "New design stylesheet missing"
print("Tamweenat updated; verified price labels, photos, and design; unrelated sites retained")
