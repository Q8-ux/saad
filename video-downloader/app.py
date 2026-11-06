"""Personal TikTok clip downloader; no private/unpermitted media or watermark stripping."""
from __future__ import annotations

import asyncio
import hmac
import os
import shutil
import tempfile
import time
from collections import defaultdict, deque
from pathlib import Path
from urllib.parse import urlsplit

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from pydantic import BaseModel, Field
from starlette.background import BackgroundTask
import yt_dlp
from yt_dlp.utils import DownloadError

APP_PASSWORD = os.getenv("APP_PASSWORD", "")
MAX_MB = int(os.getenv("MAX_DOWNLOAD_MB", "150"))
MAX_DURATION = int(os.getenv("MAX_DURATION_SECONDS", "1200"))
MAX_BYTES = MAX_MB * 1024 * 1024
ROOT = Path(__file__).resolve().parent
app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
slots = asyncio.Semaphore(2)
rate = defaultdict(deque)

class Clip(BaseModel):
    url: str = Field(min_length=12, max_length=500)
    kind: str = "video"

def validate(url: str) -> str:
    raw = url.strip()
    try:
        parsed = urlsplit(raw)
        host = (parsed.hostname or "").lower().rstrip(".")
        if (parsed.scheme != "https" or parsed.username or parsed.password or
                parsed.port not in (None, 443) or
                host not in {"tiktok.com", "www.tiktok.com", "m.tiktok.com",
                             "vm.tiktok.com", "vt.tiktok.com"} or
                not parsed.path.startswith("/") or
                any(c in raw for c in "\r\n\x00")):
            raise ValueError("invalid")
    except ValueError:
        raise HTTPException(400, "استخدم رابط فيديو TikTok عامًا يبدأ بـ https://")
    return raw

def authorize(request: Request):
    if not APP_PASSWORD:
        raise HTTPException(503, "لم تُضبط كلمة مرور الخدمة في إعدادات الخادم.")
    supplied = request.headers.get("x-download-key", "")
    if not hmac.compare_digest(supplied.encode(), APP_PASSWORD.encode()):
        raise HTTPException(401, "كلمة المرور غير صحيحة.")

def throttle(request: Request):
    # Conservative in-memory limit; per-process and reset at restart.
    address = request.client.host if request.client else "unknown"
    now = time.monotonic()
    bucket = rate[address]
    while bucket and now - bucket[0] > 900:
        bucket.popleft()
    if len(bucket) >= 24:
        raise HTTPException(429, "تم تجاوز عدد المحاولات مؤقتًا. حاول لاحقًا.")
    bucket.append(now)

def ytdlp_options(directory=None, audio=False):
    opts = {
        "quiet": True, "no_warnings": True, "noplaylist": True,
        "skip_download": directory is None,
        "socket_timeout": 15,
        "retries": 1, "fragment_retries": 1,
        "max_filesize": MAX_BYTES,
        "cachedir": False,
        "ignoreerrors": False,
        "extractor_retries": 1,
    }
    if directory:
        opts["paths"] = {"home": str(directory)}
        opts["outtmpl"] = "clip-%(id)s.%(ext)s"
        if audio:
            opts["format"] = "bestaudio/best"
            opts["postprocessors"] = [{
                "key": "FFmpegExtractAudio", "preferredcodec": "mp3",
                "preferredquality": "192"}]
        else:
            opts["format"] = "best[ext=mp4]/best"
            opts["merge_output_format"] = "mp4"
    return opts

def extract(url, directory=None, audio=False):
    with yt_dlp.YoutubeDL(ytdlp_options(directory, audio)) as dl:
        data = dl.extract_info(url, download=directory is not None)
    if not data or data.get("_type") == "playlist":
        raise ValueError("هذا الرابط لا يشير إلى مقطع فيديو منفرد.")
    duration = data.get("duration")
    if duration and duration > MAX_DURATION:
        raise ValueError("مدة الفيديو تتجاوز الحد المسموح.")
    return data

def safe_error(exc: Exception) -> str:
    if isinstance(exc, DownloadError):
        return "تعذّر الحصول على الفيديو من TikTok. قد يكون محذوفًا أو خاصًا أو غير متاح للخادم."
    if isinstance(exc, ValueError):
        return str(exc)
    return "حدث خطأ أثناء معالجة الفيديو. حاول مرة أخرى."

@app.middleware("http")
async def headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Frame-Options"] = "DENY"
    return response

@app.get("/", response_class=HTMLResponse)
def index():
    return HTMLResponse(ROOT.joinpath("index.html").read_text(encoding="utf-8"))

@app.get("/api/health")
def health():
    return {"status": "ok", "engine": "yt-dlp", "configured": bool(APP_PASSWORD)}

@app.post("/api/info")
async def info(clip: Clip, request: Request):
    authorize(request)
    throttle(request)
    url = validate(clip.url)
    async with slots:
        try:
            data = await asyncio.wait_for(asyncio.to_thread(extract, url), timeout=50)
            duration = data.get("duration") or 0
            if duration > MAX_DURATION:
                raise HTTPException(413, "مدة الفيديو طويلة جدًا.")
            return {
                "title": str(data.get("title") or "TikTok Video")[:140],
                "uploader": str(data.get("uploader") or data.get("creator") or "")[:80],
                "duration": duration,
                "thumbnail": data.get("thumbnail") or "",
                "id": str(data.get("id") or "")[:60],
                "watermark": "not_guaranteed",
            }
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(422, safe_error(exc)) from None

@app.post("/api/download")
async def download(clip: Clip, request: Request):
    authorize(request)
    throttle(request)
    url = validate(clip.url)
    if clip.kind not in ("video", "audio"):
        raise HTTPException(400, "صيغة غير مدعومة.")
    temp = Path(tempfile.mkdtemp(prefix="privateclip-"))
    try:
        async with slots:
            data = await asyncio.wait_for(
                asyncio.to_thread(extract, url, temp, clip.kind == "audio"), timeout=115)
        if (data.get("duration") or 0) > MAX_DURATION:
            raise HTTPException(413, "مدة الفيديو طويلة جدًا.")
        suffix = ".mp3" if clip.kind == "audio" else ".mp4"
        candidates = [p for p in temp.iterdir() if p.is_file() and p.suffix.lower() == suffix]
        if not candidates:
            raise ValueError("الصيغة المطلوبة غير متاحة لهذا الفيديو.")
        media = max(candidates, key=lambda p: p.stat().st_size)
        if media.stat().st_size > MAX_BYTES:
            raise HTTPException(413, "حجم الفيديو يتجاوز الحد المسموح.")
        video_id = str(data.get("id") or "tiktok")
        safe_id = "".join(c for c in video_id if c.isascii() and c.isalnum())[:35] or "tiktok"
        return FileResponse(
            media, media_type="audio/mpeg" if clip.kind == "audio" else "video/mp4",
            filename=f"clip-{safe_id}{suffix}",
            background=BackgroundTask(shutil.rmtree, temp, ignore_errors=True))
    except HTTPException:
        shutil.rmtree(temp, ignore_errors=True)
        raise
    except asyncio.TimeoutError:
        shutil.rmtree(temp, ignore_errors=True)
        raise HTTPException(504, "انتهت مهلة التحميل من TikTok.") from None
    except Exception as exc:
        shutil.rmtree(temp, ignore_errors=True)
        raise HTTPException(422, safe_error(exc)) from None
