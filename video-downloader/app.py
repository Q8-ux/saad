"""Personal multi-platform downloader. Public media, allowlisted domains only."""
from __future__ import annotations

import asyncio
import hmac
import json
import os
import re
import shutil
import tempfile
import time
from collections import defaultdict, deque
from pathlib import Path
from urllib.parse import urlsplit

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from pydantic import BaseModel, Field
from starlette.background import BackgroundTask

ROOT = Path(__file__).resolve().parent
APP_PASSWORD = os.getenv("APP_PASSWORD", "")
MAX_MB = int(os.getenv("MAX_DOWNLOAD_MB", "150"))
MAX_DURATION = int(os.getenv("MAX_DURATION_SECONDS", "1200"))
MAX_BYTES = MAX_MB * 1024 * 1024
ORIGINS = [
    s.strip().rstrip("/") for s in os.getenv(
        "CORS_ORIGINS", "https://q8-ux.github.io"
    ).split(",") if s.strip()
]
# Explicit allowlist, not an arbitrary public URL fetcher.
PLATFORMS = {
    "TikTok": ("tiktok.com",),
    "YouTube": ("youtube.com", "youtu.be", "youtube-nocookie.com"),
    "Instagram": ("instagram.com",),
    "Facebook": ("facebook.com", "fb.watch"),
    "X": ("x.com", "twitter.com"),
    "Snapchat": ("snapchat.com",),
    "Pinterest": ("pinterest.com", "pin.it"),
    "Reddit": ("reddit.com", "redd.it"),
    "Vimeo": ("vimeo.com",),
    "Twitch": ("twitch.tv",),
    "Dailymotion": ("dailymotion.com", "dai.ly"),
    "SoundCloud": ("soundcloud.com", "on.soundcloud.com"),
    "Bluesky": ("bsky.app",),
    "Bilibili": ("bilibili.com", "b23.tv"),
    "Rumble": ("rumble.com",),
    "Streamable": ("streamable.com",),
    "VK": ("vk.com", "vkvideo.ru"),
    "LinkedIn": ("linkedin.com",),
    "Threads": ("threads.net",),
    "Telegram": ("t.me", "telegram.me"),
    "Kwai": ("kwai.com", "kuaishou.com"),
}
QUALITY = {"best", "1080", "720", "480", "360"}
app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
app.add_middleware(
    CORSMiddleware, allow_origins=ORIGINS, allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-Download-Key"],
)
slots = asyncio.Semaphore(2)
rate = defaultdict(deque)


class Clip(BaseModel):
    url: str = Field(min_length=12, max_length=800)
    kind: str = "video"
    quality: str = "best"


def platform_of(host: str) -> str | None:
    host = host.lower().rstrip(".")
    for platform, roots in PLATFORMS.items():
        if any(host == root or host.endswith("." + root) for root in roots):
            return platform
    return None


def validate(url: str) -> tuple[str, str]:
    raw = url.strip()
    try:
        parsed = urlsplit(raw)
        host = (parsed.hostname or "").lower().rstrip(".")
        platform = platform_of(host)
        if (
            parsed.scheme != "https" or
            parsed.username or parsed.password or
            parsed.port not in (None, 443) or
            not platform or
            parsed.path in ("", "/") or
            any(char in raw for char in "\r\n\x00")
        ):
            raise ValueError("invalid")
    except ValueError:
        raise HTTPException(
            400, "الرابط غير مدعوم. استخدم رابط HTTPS عامًا من إحدى المنصات المدرجة."
        ) from None
    return raw, platform


def authorize(request: Request):
    if not APP_PASSWORD:
        raise HTTPException(503, "لم تُضبط كلمة مرور الخادم.")
    supplied = request.headers.get("x-download-key", "")
    if not hmac.compare_digest(supplied.encode(), APP_PASSWORD.encode()):
        raise HTTPException(401, "كلمة مرور الخادم غير صحيحة.")


def throttle(request: Request):
    client = request.client.host if request.client else "unknown"
    now = time.monotonic()
    history = rate[client]
    while history and now - history[0] > 900:
        history.popleft()
    if len(history) >= 20:
        raise HTTPException(429, "تم تجاوز الحد المؤقت للطلبات. حاول لاحقًا.")
    history.append(now)


async def command(args: list[str], timeout: int) -> tuple[int, bytes, bytes]:
    process = await asyncio.create_subprocess_exec(
        "yt-dlp", "--ignore-config", "--no-cache-dir",
        "--no-playlist", "--no-warnings", "--socket-timeout", "15",
        "--retries", "1", "--fragment-retries", "1",
        *args, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
    )
    try:
        stdout, stderr = await asyncio.wait_for(process.communicate(), timeout)
        return process.returncode, stdout[:3_000_000], stderr[:500]
    except asyncio.TimeoutError:
        process.kill()
        await process.communicate()
        raise HTTPException(504, "انتهت مهلة استخلاص الفيديو.") from None


async def read_info(url: str) -> dict:
    code, stdout, _ = await command(
        ["--dump-single-json", "--skip-download", "--", url], 55
    )
    if code:
        raise HTTPException(
            422, "تعذّر تحليل المقطع. ربما يتطلب تسجيل دخول أو أن المنصة تمنع الوصول إليه."
        )
    try:
        data = json.loads(stdout)
    except (json.JSONDecodeError, UnicodeDecodeError):
        raise HTTPException(502, "لم يعُد محرك التحميل ببيانات فيديو صالحة.") from None
    if not isinstance(data, dict) or data.get("_type") in ("playlist", "multi_video"):
        raise HTTPException(422, "أدخل رابط فيديو مفرد، وليس قائمة تشغيل أو حسابًا.")
    if (data.get("duration") or 0) > MAX_DURATION:
        raise HTTPException(413, "مدة الفيديو تتجاوز الحد المسموح.")
    return data


def selected_format(quality: str) -> str:
    if quality not in QUALITY:
        raise HTTPException(400, "خيار جودة غير معروف.")
    if quality == "best":
        return "bv[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/bv+ba/b"
    limit = int(quality)
    return (
        f"bv[height<={limit}][ext=mp4]+ba[ext=m4a]/"
        f"b[height<={limit}][ext=mp4]/"
        f"bv[height<={limit}]+ba/b[height<={limit}]/b"
    )


@app.middleware("http")
async def security_headers(request: Request, call_next):
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
    return {
        "status": "ok", "engine": "yt-dlp", "configured": bool(APP_PASSWORD),
        "supported_platforms": list(PLATFORMS),
    }


@app.post("/api/info")
async def info(clip: Clip, request: Request):
    authorize(request)
    throttle(request)
    url, platform = validate(clip.url)
    async with slots:
        data = await read_info(url)
    heights = sorted(
        {
            f["height"] for f in data.get("formats", [])
            if isinstance(f, dict) and isinstance(f.get("height"), int)
        },
        reverse=True,
    )[:15]
    return {
        "title": str(data.get("title") or "Video")[:160],
        "uploader": str(data.get("uploader") or data.get("creator") or "")[:80],
        "duration": data.get("duration") or 0,
        "thumbnail": str(data.get("thumbnail") or "")[:1500],
        "id": str(data.get("id") or "")[:60],
        "platform": platform,
        "available_heights": heights,
        "watermark": "not_guaranteed",
    }


@app.post("/api/download")
async def download(clip: Clip, request: Request):
    authorize(request)
    throttle(request)
    url, platform = validate(clip.url)
    if clip.kind not in ("video", "audio"):
        raise HTTPException(400, "صيغة غير مدعومة.")
    chosen = selected_format(clip.quality)
    folder = Path(tempfile.mkdtemp(prefix="video-hub-"))
    try:
        async with slots:
            data = await read_info(url)
            video_id = re.sub(
                r"[^a-zA-Z0-9_-]", "", str(data.get("id") or "")
            )[:40] or "video"
            args = [
                "--max-filesize", f"{MAX_MB}M",
                "--restrict-filenames", "--no-write-thumbnail",
                "-o", str(folder / "clip-%(id)s.%(ext)s"),
            ]
            if clip.kind == "audio":
                args += [
                    "-f", "bestaudio/best", "-x", "--audio-format", "mp3",
                    "--audio-quality", "192K"
                ]
            else:
                args += [
                    "-f", chosen, "--merge-output-format", "mp4",
                    "--recode-video", "mp4"
                ]
            code, _, _ = await command(args + ["--", url], 160)
            if code:
                raise HTTPException(
                    422, "تعذر تنزيل الفيديو بهذه الجودة. جرّب جودة أخرى أو مقطعًا عامًا."
                )
        extension = ".mp3" if clip.kind == "audio" else ".mp4"
        candidates = [
            p for p in folder.iterdir()
            if p.is_file() and not p.is_symlink() and p.suffix.lower() == extension
        ]
        if not candidates:
            raise HTTPException(422, "لم ينتج المحرك ملفًا بالصيغة المطلوبة.")
        media = max(candidates, key=lambda p: p.stat().st_size)
        if not 0 < media.stat().st_size <= MAX_BYTES:
            raise HTTPException(413, "حجم الملف أكبر من الحد المسموح.")
        return FileResponse(
            media,
            media_type="audio/mpeg" if clip.kind == "audio" else "video/mp4",
            filename=f"{platform.lower()}-{video_id}{extension}",
            background=BackgroundTask(shutil.rmtree, folder, ignore_errors=True),
        )
    except Exception:
        shutil.rmtree(folder, ignore_errors=True)
        raise
