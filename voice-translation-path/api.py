"""Voice Translation Path: local/private media transcription and subtitle translation.

Uses independent components also featured in Voice-Pro. No upstream Voice-Pro
code is copied or imported. Full voice dubbing remains a separate Voice-Pro app.
"""
from __future__ import annotations

import hmac
import json
import os
import re
import subprocess
import tempfile
import threading
from pathlib import Path
from urllib.parse import urlparse

from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel

ROOT = Path(__file__).resolve().parent
MAX_MB = int(os.getenv("MAX_UPLOAD_MB", "150"))
MAX_BYTES = MAX_MB * 1024 * 1024
MAX_SECONDS = int(os.getenv("MAX_MEDIA_SECONDS", "1800"))
MODEL_SIZE = os.getenv("WHISPER_MODEL", "small")
DEVICE = os.getenv("WHISPER_DEVICE", "cpu")
COMPUTE_TYPE = os.getenv("WHISPER_COMPUTE_TYPE", "int8")
API_KEY = os.getenv("TRANSLATION_API_KEY", "")
REQUIRE_KEY = os.getenv("REQUIRE_API_KEY", "0") == "1"
ALLOWED_EXT = {".mp3", ".mp4", ".m4a", ".wav", ".mov", ".webm", ".ogg", ".flac", ".mkv"}
ALLOWED_TARGETS = {"ar", "en", "fr", "es", "de", "tr", "ur", "hi", "ja", "ko", "zh-CN", "fa"}
_model = None
_model_lock = threading.Lock()
_job_lock = threading.Lock()
app = FastAPI(title="مسار الترجمة الذكية", version="1.0.0", docs_url=None, redoc_url=None)


class Segment(BaseModel):
    start: float
    end: float
    original: str
    translated: str


class Result(BaseModel):
    source_language: str
    target_language: str
    duration_seconds: float
    original_text: str
    translated_text: str
    segments: list[Segment]
    srt: str
    vtt: str


@app.on_event("startup")
def check_security() -> None:
    if REQUIRE_KEY and not API_KEY:
        raise RuntimeError("Set TRANSLATION_API_KEY before starting a public service.")


@app.get("/")
def home():
    return FileResponse(ROOT / "index.html")


@app.get("/api/health")
def health():
    return {"status": "ok", "model": MODEL_SIZE, "backend": "self-hosted", "public_auth_configured": bool(API_KEY)}


def _authenticate(token: str | None) -> None:
    if (API_KEY or REQUIRE_KEY) and not (token and hmac.compare_digest(token, API_KEY)):
        raise HTTPException(status_code=401, detail="مفتاح الوصول غير صحيح أو غير موجود")


def _youtube_only(url: str) -> None:
    parsed = urlparse(url.strip())
    host = (parsed.hostname or "").lower()
    if parsed.scheme != "https" or host not in {
        "youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be",
        "www.youtu.be", "youtube-nocookie.com", "www.youtube-nocookie.com"
    } or parsed.username or parsed.password or parsed.port not in (None, 443):
        raise HTTPException(status_code=400, detail="يُقبل رابط يوتيوب HTTPS فقط")
    if not parsed.path or parsed.path == "/":
        raise HTTPException(status_code=400, detail="رابط فيديو يوتيوب غير مكتمل")


def _save_upload(media: UploadFile, folder: Path) -> Path:
    extension = Path(media.filename or "").suffix.lower()
    if extension not in ALLOWED_EXT:
        raise HTTPException(status_code=415, detail="صيغة الملف غير مدعومة")
    target = folder / ("uploaded" + extension)
    size = 0
    with target.open("wb") as output:
        while chunk := media.file.read(1024 * 1024):
            size += len(chunk)
            if size > MAX_BYTES:
                raise HTTPException(status_code=413, detail=f"الحد الأقصى {MAX_MB} ميغابايت")
            output.write(chunk)
    if not size:
        raise HTTPException(status_code=400, detail="ملف فارغ")
    return target


def _download_youtube(url: str, folder: Path) -> Path:
    _youtube_only(url)
    try:
        from yt_dlp import YoutubeDL
        options = {
            "format": "bestaudio/best", "noplaylist": True, "quiet": True,
            "no_warnings": True, "max_filesize": MAX_BYTES,
            "outtmpl": str(folder / "youtube.%(ext)s"),
            "restrictfilenames": True, "socket_timeout": 20,
            "retries": 1, "fragment_retries": 1,
        }
        with YoutubeDL(options) as ydl:
            info = ydl.extract_info(url, download=False)
            if isinstance(info, dict) and info.get("duration") and float(info["duration"]) > MAX_SECONDS:
                raise HTTPException(status_code=413, detail="الفيديو أطول من المدة المسموحة")
            ydl.download([url])
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=422, detail=f"تعذر تنزيل فيديو يوتيوب: {type(error).__name__}") from error
    candidates = [p for p in folder.iterdir() if p.is_file() and p.name.startswith("youtube.")]
    if len(candidates) != 1 or candidates[0].stat().st_size > MAX_BYTES:
        raise HTTPException(status_code=422, detail="تعذر الحصول على ملف صوت صالح")
    return candidates[0]


def _duration(path: Path) -> float:
    try:
        process = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
            text=True, capture_output=True, timeout=20, check=True
        )
        seconds = float(process.stdout.strip())
    except (OSError, ValueError, subprocess.CalledProcessError, subprocess.TimeoutExpired) as error:
        raise HTTPException(status_code=422, detail="تعذر قراءة الوسائط. تأكد من وجود ffmpeg/ffprobe وسلامة الملف") from error
    if seconds <= 0 or seconds > MAX_SECONDS:
        raise HTTPException(status_code=413, detail=f"المدة القصوى {MAX_SECONDS // 60} دقيقة")
    return seconds


def _whisper():
    global _model
    if _model is None:
        from faster_whisper import WhisperModel
        _model = WhisperModel(MODEL_SIZE, device=DEVICE, compute_type=COMPUTE_TYPE)
    return _model


def _transcribe(path: Path, source: str) -> tuple[list[tuple[float, float, str]], str]:
    with _model_lock:
        model = _whisper()
        chunks, info = model.transcribe(
            str(path), language=None if source == "auto" else source,
            beam_size=5, vad_filter=True, condition_on_previous_text=False,
        )
        parts = [(float(s.start), float(s.end), s.text.strip()) for s in chunks if s.text.strip()]
    return parts, info.language or source


def _translate(lines: list[str], target: str) -> list[str]:
    if target == "none":
        return lines[:]
    from deep_translator import GoogleTranslator
    translator = GoogleTranslator(source="auto", target=target)
    result = []
    for line in lines:
        if not line.strip():
            result.append("")
        else:
            result.append(str(translator.translate(line)))
    return result


def _stamp(seconds: float, decimal: str = ",") -> str:
    millis = max(0, round(seconds * 1000))
    hour, remainder = divmod(millis, 3600000)
    minute, remainder = divmod(remainder, 60000)
    second, milli = divmod(remainder, 1000)
    return f"{hour:02}:{minute:02}:{second:02}{decimal}{milli:03}"


def _subtitles(segments: list[Segment], vtt: bool = False) -> str:
    lines = ["WEBVTT", ""] if vtt else []
    for index, seg in enumerate(segments, 1):
        lines.extend([
            str(index),
            f"{_stamp(seg.start, '.' if vtt else ',')} --> {_stamp(seg.end, '.' if vtt else ',')}",
            seg.translated,
            ""
        ])
    return "\n".join(lines)


@app.post("/api/translate", response_model=Result)
def translate(
    file: UploadFile | None = File(default=None),
    youtube_url: str | None = Form(default=None),
    source_language: str = Form(default="auto"),
    target_language: str = Form(default="ar"),
    x_api_key: str | None = Header(default=None),
):
    _authenticate(x_api_key)
    if bool(file) == bool(youtube_url and youtube_url.strip()):
        raise HTTPException(status_code=400, detail="ارفع ملفاً أو أدخل رابط يوتيوب، وليس الاثنين")
    if target_language not in ALLOWED_TARGETS | {"none"}:
        raise HTTPException(status_code=400, detail="لغة الترجمة غير مدعومة")
    if source_language != "auto" and not re.fullmatch(r"[a-z]{2,3}", source_language):
        raise HTTPException(status_code=400, detail="رمز لغة المصدر غير صحيح")
    # Serialize heavy model jobs to avoid OOM on a small server.
    if not _job_lock.acquire(blocking=False):
        raise HTTPException(status_code=429, detail="عملية أخرى قيد التنفيذ. أعد المحاولة لاحقاً")
    try:
        with tempfile.TemporaryDirectory(prefix="translation-") as temp:
            folder = Path(temp)
            path = _save_upload(file, folder) if file is not None else _download_youtube(youtube_url or "", folder)
            seconds = _duration(path)
            parts, detected = _transcribe(path, source_language)
            if not parts:
                raise HTTPException(status_code=422, detail="لم يتم العثور على كلام واضح في المقطع")
            try:
                translated = _translate([text for _, _, text in parts], target_language)
            except Exception as error:
                raise HTTPException(
                    status_code=502,
                    detail="فشلت خدمة الترجمة الخارجية؛ لم نُنشئ ترجمة تخمينية"
                ) from error
            if len(translated) != len(parts):
                raise HTTPException(status_code=502, detail="فشل تطابق مقاطع الترجمة")
            segments = [
                Segment(start=start, end=end, original=original, translated=translated[i])
                for i, (start, end, original) in enumerate(parts)
            ]
            return Result(
                source_language=detected, target_language=target_language,
                duration_seconds=seconds,
                original_text="\n".join(s.original for s in segments),
                translated_text="\n".join(s.translated for s in segments),
                segments=segments, srt=_subtitles(segments), vtt=_subtitles(segments, vtt=True),
            )
    except HTTPException:
        raise
    except Exception as error:
        # No raw paths, media data or private transcript in errors.
        raise HTTPException(status_code=500, detail=f"تعذر معالجة المقطع: {type(error).__name__}") from error
    finally:
        _job_lock.release()
