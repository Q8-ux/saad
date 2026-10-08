"""Single-owner GPU connector. One process, one GPU job at a time."""
import asyncio, hashlib, hmac, json, os, shutil, subprocess, uuid
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from fastapi import FastAPI, Depends, Form, File, UploadFile, HTTPException
from fastapi.responses import FileResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image

ROOT = Path(os.environ.get("LONGCAT_DATA", "./video-jobs")).resolve()
ROOT.mkdir(parents=True, exist_ok=True)
REPO = Path(os.environ.get("LONGCAT_REPO", "./LongCat-Video")).resolve()
WEIGHTS = Path(os.environ.get("LONGCAT_WEIGHTS", str(REPO/"weights/LongCat-Video"))).resolve()
ACCESS = os.environ.get("LONGCAT_API_TOKEN", "")
if len(ACCESS) < 24:
    raise RuntimeError("Set LONGCAT_API_TOKEN to a random token of at least 24 characters.")
ORIGIN = os.environ.get("LONGCAT_ALLOWED_ORIGIN", "https://q8-ux.github.io")
app = FastAPI(title="Saad Video Studio", docs_url=None, redoc_url=None)
app.add_middleware(CORSMiddleware, allow_origins=[ORIGIN],
                   allow_methods=["GET","POST"], allow_headers=["Authorization","Content-Type"])
auth_scheme = HTTPBearer()
executor = ThreadPoolExecutor(max_workers=1)
jobs = {}
for path in ROOT.glob("*/status.json"):
    try:
        job = json.loads(path.read_text())
        if job["status"] in ("queued","processing"):
            job.update(status="failed", error="Server restarted; resubmit the scene.")
            path.write_text(json.dumps(job))
        jobs[job["id"]] = job
    except (OSError, ValueError, KeyError):
        pass

def auth(credential: HTTPAuthorizationCredentials = Depends(auth_scheme)):
    if not hmac.compare_digest(credential.credentials, ACCESS):
        raise HTTPException(401, "Invalid access token")

def ready():
    if not shutil.which("torchrun") or not (REPO/"longcat_video").is_dir():
        return False
    return all((WEIGHTS/p).exists() for p in ["dit","text_encoder","vae","tokenizer","scheduler","lora/cfg_step_lora.safetensors"])

def save(job):
    (ROOT/job["id"]/"status.json").write_text(json.dumps(job))

def run(job):
    job["status"] = "processing"
    save(job)
    folder = ROOT/job["id"]
    try:
        env = dict(os.environ, PYTHONPATH=str(REPO)+os.pathsep+os.environ.get("PYTHONPATH",""))
        command = ["torchrun","--standalone","--nnodes=1","--nproc_per_node=1",
                   str(Path(__file__).with_name("worker.py")), "--job",str(folder/"input.json"),
                   "--weights",str(WEIGHTS)]
        with (folder/"worker.log").open("w") as log:
            subprocess.run(command, env=env, stdout=log, stderr=log, check=True, timeout=7200)
        if not (folder/"video.mp4").is_file():
            raise RuntimeError("No output")
        job["status"] = "completed"
    except Exception:
        job.update(status="failed", error="GPU generation failed. Check the server worker.log for this job.")
    finally:
        (folder/"image.png").unlink(missing_ok=True)
        save(job)

@app.get("/health", dependencies=[Depends(auth)])
def health():
    return {"engine":"LongCat-Video", "ready":ready(), "modes":["text","image"], "resolution":"480p"}

@app.post("/jobs", dependencies=[Depends(auth)], status_code=202)
async def create_job(prompt: str = Form(...), mode: str = Form(...),
                     seed: int = Form(42), image: UploadFile | None = File(None)):
    if not ready():
        raise HTTPException(503, "Install the upstream model and weights before generating.")
    if mode not in ("text","image") or not 0 <= seed <= 2147483647 or not 1 <= len(prompt.strip()) <= 2600:
        raise HTTPException(422, "Invalid scene settings")
    if any(j["status"] in ("queued","processing") for j in jobs.values()):
        raise HTTPException(429, "The GPU is busy. Try again after the current job.")
    if len(jobs) >= 100:
        raise HTTPException(507, "Archive limit reached. Remove older server job directories and restart.")
    if mode == "image" and image is None:
        raise HTTPException(422, "A reference image is required")
    job_id = uuid.uuid4().hex
    folder = ROOT/job_id
    folder.mkdir()
    payload = {"mode":mode, "prompt":prompt.strip(), "seed":seed, "output":str(folder/"video.mp4")}
    job = {"id":job_id, "status":"queued"}
    jobs[job_id] = job
    try:
        if mode == "image":
            data = await image.read(10*1024*1024+1)
            if len(data) > 10*1024*1024:
                raise HTTPException(413, "Image exceeds 10 MB")
            path = folder/"image.png"
            path.write_bytes(data)
            try:
                with Image.open(path) as img:
                    if img.format not in ("JPEG","PNG","WEBP") or img.width*img.height > 20000000:
                        raise ValueError("Invalid image")
                    img.verify()
            except Exception:
                raise HTTPException(422, "Invalid image; use JPG, PNG or WEBP up to 20 megapixels")
            payload["image_path"] = str(path)
        (folder/"input.json").write_text(json.dumps(payload))
        job = {"id":job_id, "status":"queued"}
        jobs[job_id] = job
        save(job)
        executor.submit(run, job)
        return job
    except Exception:
        shutil.rmtree(folder, ignore_errors=True)
        jobs.pop(job_id, None)
        raise

@app.get("/jobs/{job_id}", dependencies=[Depends(auth)])
def get_job(job_id: str):
    if job_id not in jobs:
        raise HTTPException(404, "Unknown job")
    return jobs[job_id]

@app.get("/jobs/{job_id}/video", dependencies=[Depends(auth)])
def get_video(job_id: str):
    job = get_job(job_id)
    if job["status"] != "completed":
        raise HTTPException(409, "Video is not ready")
    return FileResponse(ROOT/job_id/"video.mp4", media_type="video/mp4", filename="saad-video.mp4")
