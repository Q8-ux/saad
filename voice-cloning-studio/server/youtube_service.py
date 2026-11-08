"""Bounded public YouTube metadata and reference-clip preparation.

This module never returns signed media URLs, reads browser cookies, configures
proxies, or attempts to bypass a YouTube restriction. The API route must verify
the caller's rights confirmation before calling ``import_youtube_sample``.
"""

from __future__ import annotations

import asyncio
import io
import json
import math
import re
import subprocess
import sys
import tempfile
import wave
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlsplit

import httpx

VIDEO_ID = re.compile(r"^[A-Za-z0-9_-]{11}$")
YOUTUBE_HOSTS = {"youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com"}
SHORT_HOSTS = {"youtu.be", "www.youtu.be"}
YTDLP_TIMEOUT = 25
FFMPEG_TIMEOUT = 45
MAX_METADATA_BYTES = 6 * 1024 * 1024
MAX_WAV_BYTES = 2 * 1024 * 1024
MAX_VIDEO_SECONDS = 2 * 60 * 60
MAX_SOURCE_AUDIO_BYTES = 256 * 1024 * 1024
SAMPLE_RATE = 24000
FALLBACK = "ارفع التسجيل الأصلي أو مقطعًا تملك حق استخدام صوته."


class YouTubeServiceError(RuntimeError):
    def __init__(self, code: str, message: str, status_code: int = 400) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code

    def as_dict(self) -> dict[str, str]:
        return {"code": self.code, "detail": self.message, "fallback": FALLBACK}


def canonical_youtube_id(value: str) -> str:
    """Validate before network access; fetch only a reconstructed canonical URL."""
    if not isinstance(value, str) or not value.strip() or len(value) > 2048:
        raise YouTubeServiceError("invalid_youtube_url", "أدخل رابط فيديو يوتيوب صحيحًا أو معرّفه.")
    value = value.strip()
    if any(ord(character) < 32 or ord(character) == 127 for character in value) or "\\" in value:
        raise YouTubeServiceError("invalid_youtube_url", "رابط يوتيوب غير صالح.")
    if VIDEO_ID.fullmatch(value):
        return value
    if value.startswith(tuple(host + "/" for host in YOUTUBE_HOSTS | SHORT_HOSTS)):
        value = "https://" + value
    try:
        parsed = urlsplit(value)
        hostname = parsed.hostname
        port = parsed.port
    except ValueError as exc:
        raise YouTubeServiceError("invalid_youtube_url", "رابط يوتيوب غير صالح.") from exc
    if (
        parsed.scheme not in {"https", "http"}
        or parsed.username is not None
        or parsed.password is not None
        or port is not None
        or hostname not in YOUTUBE_HOSTS | SHORT_HOSTS
    ):
        raise YouTubeServiceError("invalid_youtube_url", "يُقبل رابط مباشر من youtube.com أو youtu.be فقط.")
    query = parse_qs(parsed.query, keep_blank_values=True)
    if any(key.lower() in {"list", "playlist", "listtype"} for key in query):
        raise YouTubeServiceError("playlist_not_allowed", "اختر فيديو منفردًا؛ قوائم التشغيل غير مدعومة.")
    path = parsed.path.rstrip("/")
    if path.startswith("/live") or path == "/playlist":
        raise YouTubeServiceError("live_or_playlist_not_allowed", "اختر فيديو مسجّلًا منفردًا.")
    if hostname in SHORT_HOSTS:
        candidate = path.removeprefix("/")
    elif path == "/watch":
        candidates = query.get("v", [])
        candidate = candidates[0] if len(candidates) == 1 else ""
    elif path.startswith("/shorts/") or path.startswith("/embed/"):
        candidate = path.split("/")[-1] if len(path.split("/")) == 3 else ""
    else:
        candidate = ""
    if not VIDEO_ID.fullmatch(candidate):
        raise YouTubeServiceError("invalid_youtube_url", "لم يُعثر على معرّف فيديو يوتيوب صالح في الرابط.")
    return candidate


def _base_metadata(video_id: str) -> dict[str, Any]:
    return {
        "id": video_id,
        "video_id": video_id,
        "url": f"https://www.youtube.com/watch?v={video_id}",
        "embed_url": f"https://www.youtube-nocookie.com/embed/{video_id}",
        "thumbnail_url": f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg",
        "title": "",
        "channel": "",
        "duration": None,
        "import_available": False,
    }


def _error_from_extractor(stderr: str) -> YouTubeServiceError:
    text = stderr.lower()
    if "no module named yt_dlp" in text:
        return YouTubeServiceError("youtube_dependency_missing", "خدمة استيراد يوتيوب غير مثبتة على الخادم. " + FALLBACK, 503)
    if any(word in text for word in ("age-restricted", "age restricted", "confirm your age", "private video", "members-only", "members only", "login required", "not available in your country", "sign in to confirm your age")):
        return YouTubeServiceError("youtube_restricted", "الفيديو يتطلب صلاحية أو تسجيل دخول، ولا يمكن استيراده. " + FALLBACK, 422)
    if any(word in text for word in ("not a bot", "captcha", "too many requests", "http error 429", "http error 403", "sign in", "login", "cookies")):
        return YouTubeServiceError("youtube_blocked", "يوتيوب منع الوصول من الخادم؛ لن نحاول تجاوز المنع. " + FALLBACK, 503)
    return YouTubeServiceError("youtube_unavailable", "تعذّر قراءة الفيديو من يوتيوب حاليًا. " + FALLBACK, 502)


def _run_ytdlp_json(target: str, *, search: bool = False) -> dict[str, Any]:
    # --ignore-config prevents ambient cookies, custom extractors and proxy
    # settings from a yt-dlp config being silently added to this service.
    args = [
        sys.executable, "-m", "yt_dlp", "--ignore-config", "--no-plugin-dirs",
        "--no-cookies", "--no-cache-dir", "--no-playlist", "--skip-download",
        "--no-warnings", "--no-progress", "--socket-timeout", "10",
        "--retries", "0", "--extractor-retries", "0", "--dump-single-json",
    ]
    if search:
        args.extend(["--flat-playlist", "--lazy-playlist"])
    else:
        args.append("--no-check-formats")
    args.extend(["--", target])
    try:
        result = subprocess.run(args, stdin=subprocess.DEVNULL, capture_output=True, timeout=YTDLP_TIMEOUT, check=False)
    except subprocess.TimeoutExpired as exc:
        raise YouTubeServiceError("youtube_timeout", "انتهت مهلة الاتصال بيوتيوب. " + FALLBACK, 504) from exc
    except OSError as exc:
        raise YouTubeServiceError("youtube_dependency_missing", "خدمة يوتيوب غير متاحة على الخادم. " + FALLBACK, 503) from exc
    if result.returncode:
        raise _error_from_extractor(result.stderr.decode("utf-8", errors="replace")[:16000])
    if len(result.stdout) > MAX_METADATA_BYTES:
        raise YouTubeServiceError("youtube_metadata_too_large", "بيانات الفيديو تتجاوز الحد المسموح.", 422)
    try:
        info = json.loads(result.stdout)
    except (ValueError, UnicodeError) as exc:
        raise YouTubeServiceError("youtube_invalid_response", "وردت استجابة غير صالحة من خدمة يوتيوب.", 502) from exc
    if not isinstance(info, dict):
        raise YouTubeServiceError("youtube_invalid_response", "وردت استجابة غير صالحة من خدمة يوتيوب.", 502)
    return info


async def _extract_info(target: str, *, search: bool = False) -> dict[str, Any]:
    # The child process itself times out first and is reaped by subprocess.run.
    # The outer bound protects the async API without leaving an extraction thread
    # that could continue writing an import after the route has timed out.
    try:
        return await asyncio.wait_for(asyncio.to_thread(_run_ytdlp_json, target, search=search), timeout=YTDLP_TIMEOUT + 3)
    except asyncio.TimeoutError as exc:
        raise YouTubeServiceError("youtube_timeout", "انتهت مهلة خدمة يوتيوب. " + FALLBACK, 504) from exc


def _duration(info: dict[str, Any]) -> float | None:
    value = info.get("duration")
    if isinstance(value, bool):
        return None
    try:
        value = float(value)
    except (ValueError, TypeError):
        return None
    return value if math.isfinite(value) and value > 0 else None


def _assert_public_recording(info: dict[str, Any], expected_id: str) -> float:
    if info.get("_type") in {"playlist", "multi_video", "url", "url_transparent"} or info.get("entries") is not None:
        raise YouTubeServiceError("playlist_not_allowed", "اختر فيديو مسجّلًا منفردًا.", 422)
    if info.get("id") != expected_id:
        raise YouTubeServiceError("youtube_invalid_response", "معرّف الفيديو في الاستجابة غير مطابق للرابط.", 502)
    live_status = info.get("live_status")
    if info.get("is_live") or live_status in {"is_live", "is_upcoming", "post_live", "was_live"}:
        raise YouTubeServiceError("live_not_allowed", "البث المباشر وتسجيلاته غير مدعومة للاستيراد. " + FALLBACK, 422)
    try:
        age_limit = int(info.get("age_limit") or 0)
    except (TypeError, ValueError):
        age_limit = 18
    if age_limit >= 18 or info.get("availability") not in {None, "public", "unlisted"} or info.get("is_private"):
        raise YouTubeServiceError("youtube_restricted", "الفيديو مقيّد أو يتطلب تسجيل دخول. " + FALLBACK, 422)
    duration = _duration(info)
    if duration is None:
        raise YouTubeServiceError("youtube_duration_unknown", "تعذّر التحقق من مدة الفيديو. " + FALLBACK, 422)
    if duration > MAX_VIDEO_SECONDS:
        raise YouTubeServiceError("video_too_long", "الحد الأقصى لمدة الفيديو ساعتان.", 422)
    return duration


def _safe_metadata(info: dict[str, Any], video_id: str) -> dict[str, Any]:
    result = _base_metadata(video_id)
    result.update({
        "title": str(info.get("title") or "")[:400],
        "channel": str(info.get("channel") or info.get("uploader") or "")[:200],
        "duration": _duration(info),
    })
    return result


async def _oembed(video_id: str) -> dict[str, Any] | None:
    try:
        async with httpx.AsyncClient(timeout=8, follow_redirects=False) as client:
            response = await client.get("https://www.youtube.com/oembed", params={"url": f"https://www.youtube.com/watch?v={video_id}", "format": "json"})
            if response.status_code != 200 or len(response.content) > 128 * 1024:
                return None
            data = response.json()
            if not isinstance(data, dict):
                return None
            # Deliberately discard remote HTML, thumbnail/author URLs and other
            # fields. All URLs returned by this module are locally constructed.
            return {"title": str(data.get("title") or "")[:400], "channel": str(data.get("author_name") or "")[:200]}
    except (httpx.HTTPError, ValueError, ImportError):
        return None


async def search_youtube(query: str, limit: int = 6) -> list[dict[str, Any]]:
    if not isinstance(query, str) or not 2 <= len(query.strip()) <= 160 or any(ord(c) < 32 for c in query):
        raise YouTubeServiceError("invalid_search_query", "اكتب عبارة بحث من حرفين إلى 160 حرفًا.")
    if isinstance(limit, bool) or not isinstance(limit, int) or not 1 <= limit <= 6:
        raise YouTubeServiceError("invalid_search_limit", "الحد الأقصى ست نتائج بحث.")
    info = await _extract_info(f"ytsearch{limit}:{query.strip()}", search=True)
    entries = info.get("entries")
    if not isinstance(entries, list):
        raise YouTubeServiceError("youtube_invalid_response", "تعذّر قراءة نتائج يوتيوب.", 502)
    results: list[dict[str, Any]] = []
    seen = set()
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        video_id = entry.get("id", "")
        if not isinstance(video_id, str) or not VIDEO_ID.fullmatch(video_id) or video_id in seen:
            continue
        if entry.get("_type") in {"playlist", "multi_video"} or entry.get("is_live") or entry.get("live_status") in {"is_live", "is_upcoming", "post_live", "was_live"}:
            continue
        if entry.get("availability") not in {None, "public", "unlisted"}:
            continue
        try:
            if int(entry.get("age_limit") or 0) >= 18:
                continue
        except (ValueError, TypeError):
            continue
        duration = _duration(entry)
        if duration is not None and duration > MAX_VIDEO_SECONDS:
            continue
        metadata = _safe_metadata(entry, video_id)
        metadata["status"] = "search_result"
        results.append(metadata)
        seen.add(video_id)
        if len(results) == limit:
            break
    return results


async def inspect_youtube(value: str) -> dict[str, Any]:
    video_id = canonical_youtube_id(value)
    result = _base_metadata(video_id)
    public_metadata = await _oembed(video_id)
    if public_metadata:
        result.update(public_metadata)
    try:
        info = await _extract_info(result["url"])
        _assert_public_recording(info, video_id)
        result.update(_safe_metadata(info, video_id))
        # Import still verifies that the requested interval and an audio stream
        # are usable; metadata inspection alone never downloads media.
        _select_audio_url(info)
        result.update({"status": "available", "import_available": True})
    except YouTubeServiceError as exc:
        result.update({
            "status": "metadata_only" if public_metadata else "blocked",
            "import_available": False,
            "error_code": exc.code,
            "message": exc.message,
            "fallback": FALLBACK,
        })
    return result


def _clip_bounds(start: float, end: float, duration: float | None = None) -> tuple[float, float]:
    if isinstance(start, bool) or isinstance(end, bool):
        raise YouTubeServiceError("invalid_clip_bounds", "حدّد بداية ونهاية مقطع من 10 إلى 30 ثانية.")
    try:
        start, end = float(start), float(end)
    except (TypeError, ValueError) as exc:
        raise YouTubeServiceError("invalid_clip_bounds", "وقت بداية المقطع ونهايته غير صالح.") from exc
    if not math.isfinite(start) or not math.isfinite(end) or start < 0 or not 10 <= end - start <= 30 or end > MAX_VIDEO_SECONDS:
        raise YouTubeServiceError("invalid_clip_bounds", "يجب أن تكون العينة من 10 إلى 30 ثانية وفي حدود الفيديو.")
    if duration is not None and end > duration:
        raise YouTubeServiceError("clip_out_of_range", "نهاية المقطع تتجاوز مدة الفيديو.", 422)
    return start, end


def _select_audio_url(info: dict[str, Any]) -> str:
    formats = info.get("formats") or []
    candidates = []
    for item in formats:
        if not isinstance(item, dict) or item.get("vcodec") != "none" or item.get("acodec") in {None, "none"} or item.get("has_drm"):
            continue
        if item.get("protocol") != "https":
            continue
        value = item.get("url")
        if not isinstance(value, str) or len(value) > 16000:
            continue
        try:
            parsed = urlsplit(value)
            hostname = parsed.hostname or ""
            safe_origin = parsed.scheme == "https" and hostname.endswith(".googlevideo.com") and not parsed.username and not parsed.password and parsed.port is None
        except ValueError:
            safe_origin = False
        if not safe_origin:
            continue
        size = item.get("filesize") or item.get("filesize_approx")
        if isinstance(size, (int, float)) and size > MAX_SOURCE_AUDIO_BYTES:
            continue
        bitrate = item.get("abr") or item.get("tbr") or 0
        if not isinstance(bitrate, (int, float)) or not math.isfinite(bitrate):
            bitrate = 0
        candidates.append((0 < bitrate <= 160, bitrate, value))
    if not candidates:
        raise YouTubeServiceError("youtube_audio_unavailable", "لا يتوفر مسار صوت عام قابل للاستيراد من هذا الفيديو. " + FALLBACK, 422)
    return max(candidates, key=lambda item: (item[0], item[1]))[2]


def _ffmpeg_executable() -> str:
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except (ImportError, RuntimeError) as exc:
        raise YouTubeServiceError("ffmpeg_unavailable", "أداة تجهيز الصوت غير متاحة على الخادم. " + FALLBACK, 503) from exc


def _render_clip(media_url: str, start: float, end: float) -> tuple[bytes, dict[str, Any]]:
    ffmpeg = _ffmpeg_executable()
    with tempfile.TemporaryDirectory(prefix="voice-youtube-") as directory:
        destination = Path(directory) / "sample.wav"
        args = [
            ffmpeg, "-nostdin", "-hide_banner", "-loglevel", "error",
            "-rw_timeout", "15000000", "-protocol_whitelist", "https,tls,tcp,crypto",
            "-ss", f"{start:.3f}", "-i", media_url, "-t", f"{end - start:.3f}",
            "-map", "0:a:0", "-vn", "-sn", "-dn", "-ac", "1", "-ar", str(SAMPLE_RATE),
            "-c:a", "pcm_s16le", "-map_metadata", "-1", "-fs", str(MAX_WAV_BYTES),
            "-f", "wav", "-y", str(destination),
        ]
        try:
            result = subprocess.run(args, stdin=subprocess.DEVNULL, capture_output=True, timeout=FFMPEG_TIMEOUT, check=False)
        except subprocess.TimeoutExpired as exc:
            raise YouTubeServiceError("youtube_import_timeout", "انتهت مهلة تجهيز المقطع من يوتيوب. " + FALLBACK, 504) from exc
        except OSError as exc:
            raise YouTubeServiceError("ffmpeg_unavailable", "تعذّر تشغيل أداة تجهيز الصوت. " + FALLBACK, 503) from exc
        if result.returncode:
            raise YouTubeServiceError("youtube_import_blocked", "تعذّر جلب صوت الفيديو؛ قد يكون يوتيوب قد منع الاستيراد. " + FALLBACK, 502)
        if not destination.is_file() or not 44 <= destination.stat().st_size <= MAX_WAV_BYTES:
            raise YouTubeServiceError("invalid_audio_output", "لم يُنتج الاستيراد ملف صوت صالحًا.", 502)
        data = destination.read_bytes()
        try:
            with wave.open(io.BytesIO(data), "rb") as sample:
                actual_duration = sample.getnframes() / sample.getframerate()
                if sample.getnchannels() != 1 or sample.getframerate() != SAMPLE_RATE or sample.getsampwidth() != 2 or abs(actual_duration - (end - start)) > 0.35:
                    raise ValueError("Unexpected sample format or duration")
                if len(sample.readframes(sample.getnframes())) != sample.getnframes() * 2:
                    raise ValueError("Truncated PCM data")
        except (wave.Error, EOFError, ValueError, ZeroDivisionError) as exc:
            raise YouTubeServiceError("invalid_audio_output", "الصوت الناتج لا يطابق مدة العينة المطلوبة.", 502) from exc
        return data, {"sample_duration": actual_duration, "sample_rate": SAMPLE_RATE, "channels": 1, "size_bytes": len(data), "format": "wav", "mime_type": "audio/wav"}


async def import_youtube_sample(value: str, start: float, end: float) -> tuple[bytes, dict[str, Any]]:
    video_id = canonical_youtube_id(value)
    start, end = _clip_bounds(start, end)
    info = await _extract_info(f"https://www.youtube.com/watch?v={video_id}")
    duration = _assert_public_recording(info, video_id)
    _clip_bounds(start, end, duration)
    media_url = _select_audio_url(info)
    try:
        data, technical = await asyncio.wait_for(asyncio.to_thread(_render_clip, media_url, start, end), timeout=FFMPEG_TIMEOUT + 3)
    except asyncio.TimeoutError as exc:
        raise YouTubeServiceError("youtube_import_timeout", "انتهت مهلة تجهيز العينة. " + FALLBACK, 504) from exc
    metadata = _safe_metadata(info, video_id)
    metadata.update(technical)
    metadata.update({"status": "imported", "start_seconds": start, "end_seconds": end, "filename": f"youtube-{video_id}-{int(start * 1000)}.wav"})
    return data, metadata
