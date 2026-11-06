"""Video Hub API: public-link metadata and short-lived media downloads.

Runs independently of SSSTik. Requires Python 3.11+, yt-dlp and FFmpeg.
Only download material for which you have the necessary rights.
"""
from __future__ import annotations

import asyncio
import json
import mimetypes
import re
import shutil
import subprocess
import sys
import tempfile
import time
from collections import defaultdict, deque
from pathlib import Path
from threading import Lock
from urllib.parse import urlsplit

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from starlette.background import BackgroundTask

APP_ROOT = Path(__file__).resolve().parent
WEB_ROOT = APP_ROOT.parent
MAX_BYTES = 180 * 1024 * 1024
MAX_URL_LENGTH = 2048
ALLOWED_HOSTS = {
    "tiktok.com", "www.tiktok.com", "m.tiktok.com",
    "vt.tiktok.com", "vm.tiktok.com",
    "instagram.com", "www.instagram.com", "m.instagram.com",
    "youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be",
    "x.com", "www.x.com", "twitter.com", "www.twitter.com", "mobile.twitter.com",
    "facebook.com", "www.facebook.com", "m.facebook.com", "fb.watch",
}
ORIGINS = ["https://q8-ux.github.io", "http://localhost:8000", "http://127.0.0.1:8000"]
app = FastAPI(title="Video Hub API", version="1.0.0", docs_url=None, redoc_url=None)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)
limits = defaultdict(deque)
limits_lock = Lock()
downloads = asyncio.Semaphore(2)


class URLRequest(BaseModel):
    url: str = Field(min_length=12, max_length=MAX_URL_LENGTH)


def check_url(value: str) -> tuple[str, str]:
    """Allow only direct public media page URLs from known platforms.

    Reject IPs, ports, credentials, non-HTTPS links and arbitrary hosts.
    yt-dlp must still be kept up to date: providers may themselves redirect.
    """
    if not isinstance(value, str) or len(value) > MAX_URL_LENGTH:
        raise HTTPException(400, "رابط غير صالح")
    try:
        u = urlsplit(value.strip())
        host = (u.hostname or "").lower().rstrip(".")
        if (u.scheme != "https" or host not in ALLOWED_HOSTS or u.port is not None
                or u.username or u.password or not u.path or u.path == '/'):
            raise ValueError()
    except (ValueError, TypeError):
        raise HTTPException(400, "استخدم رابط HTTPS عامًا من منصة مدعومة") from None
    return value.strip(), host


def client_limit(request: Request, bucket: str, count: int, per_seconds: int = 60):
    ip = request.client.host if request.client else "anonymous"
    now = time.monotonic()
    key = (ip, bucket)
    with limits_lock:
        q = limits[key]
        while q and q[0] < now - per_seconds:
            q.popleft()
        if len(q) >= count:
            raise HTTPException(429, "عدد الطلبات مرتفع؛ حاول مرة أخرى بعد دقيقة")
        q.append(now)


def ytdlp_command(url: str) -> list[str]:
    return [
        sys.executable, "-m", "yt_dlp",
        "--ignore-config", "--no-playlist", "--no-warnings",
        "--no-progress", "--no-cache-dir", "--socket-timeout", "15",
        "--retries", "1", "--fragment-retries", "1",
        url,
    ]


def extract_public_info(url: str):
    cmd = ytdlp_command(url)
    cmd.insert(-1, "--dump-single-json")
    cmd.insert(-1, "--skip-download")
    try:
        process = subprocess.run(cmd, text=True, capture_output=True, timeout=40, check=False)
    except subprocess.TimeoutExpired:
        raise HTTPException(504, "انتهت مهلة قراءة الفيديو") from None
    if process.returncode != 0:
        raise HTTPException(422, "تعذر قراءة الفيديو؛ قد يكون خاصًا أو محذوفًا أو محجوبًا من المنصة")
    try:
        data = json.loads(process.stdout)
    except json.JSONDecodeError:
        raise HTTPException(502, "تعذر تحليل بيانات الفيديو") from None
    if data.get("_type") == "playlist":
        entries = data.get("entries") or []
        if not entries:
            raise HTTPException(422, "الرابط لا يشير إلى فيديو قابل للتنزيل")
        data = entries[0] or {}
    if data.get("live_status") in ("is_live", "is_upcoming"):
        raise HTTPException(422, "البث المباشر غير مدعوم")
    formats = data.get("formats") or []
    playable = [f for f in formats if f.get("vcodec") not in (None, "none")]
    heights = [f.get("height") for f in playable if isinstance(f.get("height"), int)]
    thumbnail = data.get("thumbnail")
    if not isinstance(thumbnail, str) or not thumbnail.startswith("https://"):
        thumbnail = None
    return {
        "title": str(data.get("title") or "فيديو")[:250],
        "uploader": str(data.get("uploader") or data.get("channel") or "")[:120],
        "thumbnail": thumbnail,
        "platform": str(data.get("extractor_key") or "Video")[:60],
        "duration": data.get("duration") if isinstance(data.get("duration"), (float, int)) else None,
        "max_height": max(heights) if heights else None,
        "watermark_status": "source_dependent",
        "id": str(data.get("id") or "")[:100],
    }


def download_to_disk(url: str, kind: str, folder: Path) -> Path:
    # Formats marked "watermarked" are deprioritized; no removal or image editing
    # takes place. The origin may still serve a watermarked file.
    format_choice = (
        'best[format_note!*="watermarked"][ext=mp4]/best[ext=mp4]'
        if "tiktok.com" in urlsplit(url).hostname.lower()
        else "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best"
    )
    cmd = ytdlp_command(url)
    cmd[-1:-1] = [
        "--max-filesize", "180M",
        "--restrict-filenames",
        "-o", str(folder / "%(id).100s.%(ext)s"),
    ]
    if kind == "mp3":
        cmd[-1:-1] = ["-x", "--audio-format", "mp3", "--audio-quality", "3"]
    else:
        cmd[-1:-1] = ["-f", format_choice, "--merge-output-format", "mp4"]

    # imageio-ffmpeg provides a reproducible FFmpeg binary for hosted Python.
    try:
        import imageio_ffmpeg
        cmd[-1:-1] = ["--ffmpeg-location", imageio_ffmpeg.get_ffmpeg_exe()]
    except (ImportError, OSError):
        if kind == "mp3":
            raise HTTPException(503, "محرك FFmpeg غير متاح على الخادم") from None

    try:
        process = subprocess.run(cmd, capture_output=True, text=True, timeout=175, check=False)
    except subprocess.TimeoutExpired:
        raise HTTPException(504, "انتهت مهلة تجهيز الملف") from None
    if process.returncode:
        raise HTTPException(422, "تعذر تجهيز الملف؛ تحقق من توفره العام وصلاحية الرابط")
    extensions = {".mp3"} if kind == "mp3" else {".mp4", ".m4v", ".mkv", ".webm"}
    files = [p for p in folder.iterdir() if p.is_file() and p.suffix.lower() in extensions]
    if not files:
        raise HTTPException(422, "لم يتم إنتاج ملف بصيغة مدعومة")
    file = max(files, key=lambda p: p.stat().st_size)
    if file.stat().st_size > MAX_BYTES:
        raise HTTPException(413, "حجم الملف أكبر من الحد المسموح 180 ميغابايت")
    return file


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["X-Frame-Options"] = "DENY"
    return response


@app.get("/api/health")
def health():
    return {"status": "ok", "engine": "yt-dlp", "max_mb": 180}


@app.post("/api/info")
async def info(payload: URLRequest, request: Request):
    url, _ = check_url(payload.url)
    client_limit(request, "info", 12)
    return await asyncio.to_thread(extract_public_info, url)


@app.get("/api/download")
async def download(url: str, request: Request, kind: str = "mp4"):
    url, _ = check_url(url)
    if kind not in ("mp4", "mp3"):
        raise HTTPException(400, "صيغة غير مدعومة")
    client_limit(request, "download", 5)
    if downloads.locked():
        raise HTTPException(429, "خادم التنزيل مشغول؛ حاول مجددًا بعد قليل")
    async with downloads:
        folder = Path(tempfile.mkdtemp(prefix="video-hub-"))
        try:
            path = await asyncio.to_thread(download_to_disk, url, kind, folder)
            extension = path.suffix.lower()
            media_type = "audio/mpeg" if kind == "mp3" else (mimetypes.guess_type(path.name)[0] or "application/octet-stream")
            safe_id = re.sub(r"[^0-9A-Za-z_-]", "", path.stem)[:85] or "media"
            return FileResponse(
                path,
                media_type=media_type,
                filename="video-hub-" + safe_id + extension,
                background=BackgroundTask(shutil.rmtree, folder, True),
                headers={"Cache-Control": "no-store"},
            )
        except Exception:
            shutil.rmtree(folder, ignore_errors=True)
            raise


@app.get("/")
def index():
    return FileResponse(WEB_ROOT / "index.html")


@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    raise HTTPException(404)
