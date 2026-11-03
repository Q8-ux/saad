"""Fast, safe GitHub Pages release for Waqaya V2."""
import json, os, re, shutil, subprocess, tarfile
from pathlib import Path, PurePosixPath

TARGET = "waqaya-v2"

def cmd(*args):
    return subprocess.check_output(args, text=True).strip()

def api(path):
    return json.loads(cmd("gh","api",path))

def extract(archive, dest):
    with tarfile.open(archive) as tf:
        for item in tf.getmembers():
            p = PurePosixPath(item.name)
            if p.is_absolute() or ".." in p.parts:
                raise RuntimeError("Unsafe Pages artifact")
        tf.extractall(dest, filter="data")

def latest_successful_pages_run():
    repo=os.environ["GITHUB_REPOSITORY"]
    runs=api(f"repos/{repo}/actions/runs?status=success&per_page=100")["workflow_runs"]
    for run in sorted(runs,key=lambda r:r["updated_at"],reverse=True):
        if run.get("head_branch")!="main":
            continue
        arts=api(f"repos/{repo}/actions/runs/{int(run['id'])}/artifacts")["artifacts"]
        art=next((a for a in arts if a["name"]=="github-pages" and not a["expired"]),None)
        if art:
            return run, art
    raise RuntimeError("No usable successful Pages artifact found")

def prepare():
    repo=os.environ["GITHUB_REPOSITORY"]
    run,_=latest_successful_pages_run()
    tmp=Path("_previous-pages")
    shutil.rmtree(tmp,ignore_errors=True); tmp.mkdir()
    cmd("gh","run","download",str(run["id"]),"--repo",repo,"--name","github-pages","--dir",str(tmp))
    archive=tmp/"artifact.tar"
    if not archive.is_file():
        raise RuntimeError("github-pages artifact.tar missing")
    out=Path("_site")
    shutil.rmtree(out,ignore_errors=True)
    extract(archive,out)
    src=Path(TARGET)
    if not (src/"index.html").is_file() or not (src/"app.js").is_file() or not (src/"styles.css").is_file():
        raise RuntimeError("Waqaya V2 source incomplete")
    shutil.rmtree(out/TARGET,ignore_errors=True)
    shutil.copytree(src,out/TARGET)
    (out/".nojekyll").touch()
    verify()
    print(json.dumps({"baseRun":run["id"],"target":TARGET,"commit":os.environ["GITHUB_SHA"]}))

def verify():
    out=Path("_site")/TARGET
    for name in ("index.html","app.js","styles.css"):
        p=out/name
        if not p.is_file() or p.stat().st_size==0:
            raise RuntimeError(f"Missing published Waqaya file: {name}")
    html=(out/"index.html").read_text(encoding="utf-8")
    if 'src="./app.js"' not in html or 'href="./styles.css"' not in html:
        raise RuntimeError("Waqaya entrypoint references are invalid")
    print("Waqaya V2 publication verified")

if __name__=="__main__":
    {"prepare":prepare,"verify":verify}[__import__("sys").argv[1]]()
