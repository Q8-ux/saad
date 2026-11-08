import io
import json
import subprocess
import tempfile
import unittest
import wave
from pathlib import Path
from unittest.mock import AsyncMock, patch

import httpx

import youtube_service as service

VIDEO = "aqz-KE-bpKQ"
WATCH = f"https://www.youtube.com/watch?v={VIDEO}"
SIGNED_MEDIA = "https://rr1---sn-test.googlevideo.com/videoplayback?temporary=signed-value"


def public_info(**overrides):
    value = {
        "id": VIDEO, "title": "Public source", "channel": "Source channel",
        "duration": 200, "age_limit": 0, "availability": "public", "live_status": "not_live",
        "formats": [{"vcodec": "none", "acodec": "opus", "protocol": "https", "abr": 128, "url": SIGNED_MEDIA}],
    }
    value.update(overrides)
    return value


def silent_wav(seconds=10):
    target = io.BytesIO()
    with wave.open(target, "wb") as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(service.SAMPLE_RATE)
        audio.writeframes(b"\x00\x00" * service.SAMPLE_RATE * seconds)
    return target.getvalue()


class SourceValidationTests(unittest.TestCase):
    def test_known_url_shapes_become_same_canonical_id(self):
        values = [
            VIDEO, WATCH, f"https://youtu.be/{VIDEO}?si=tracking", f"https://m.youtube.com/watch?v={VIDEO}",
            f"https://www.youtube.com/shorts/{VIDEO}", f"https://www.youtube.com/embed/{VIDEO}",
            f"youtube.com/watch?v={VIDEO}", f"http://youtube.com/watch?v={VIDEO}",
        ]
        for value in values:
            with self.subTest(value=value):
                self.assertEqual(service.canonical_youtube_id(value), VIDEO)

    def test_ssrf_credentials_playlists_live_and_ambiguous_sources_rejected(self):
        values = [
            "https://127.0.0.1/watch?v=" + VIDEO,
            "http://169.254.169.254/latest/meta-data/",
            "file:///etc/passwd", "https://youtube.com.evil.test/watch?v=" + VIDEO,
            "https://evil.youtube.com/watch?v=" + VIDEO,
            "https://user:pass@youtube.com/watch?v=" + VIDEO,
            "https://youtube.com:443/watch?v=" + VIDEO,
            "https://youtube.com:bad/watch?v=" + VIDEO,
            "https://youtube.com./watch?v=" + VIDEO,
            "https://youtube.com\\@evil.test/watch?v=" + VIDEO,
            f"{WATCH}&list=PL-anything", "https://youtube.com/playlist?list=PL-test",
            f"https://youtube.com/live/{VIDEO}", f"{WATCH}&v={VIDEO}",
            f"https://youtu.be/{VIDEO}/extra", f"{WATCH}%0a", "ytsearch6:secret", "\x00" + WATCH,
        ]
        for value in values:
            with self.subTest(value=value), self.assertRaises(service.YouTubeServiceError):
                service.canonical_youtube_id(value)

    def test_sample_bounds_reject_invalid_timing(self):
        for start, end in [(-1, 10), (0, 9.99), (0, 30.01), (20, 10), (float("nan"), 20), (0, float("inf")), (True, 20), ("bad", 20), (7190, 7210)]:
            with self.subTest(start=start, end=end), self.assertRaises(service.YouTubeServiceError):
                service._clip_bounds(start, end)
        self.assertEqual(service._clip_bounds(2, 12, 15), (2.0, 12.0))
        with self.assertRaises(service.YouTubeServiceError):
            service._clip_bounds(2, 12, 11)

    def test_public_recording_rejects_restricted_live_unknown_and_long(self):
        for values in [
            {"_type": "playlist"}, {"entries": []}, {"id": "wrong-id"}, {"age_limit": 18},
            {"availability": "needs_auth"}, {"availability": "private"}, {"is_live": True},
            {"live_status": "was_live"}, {"live_status": "is_upcoming"}, {"duration": None},
            {"duration": 7200.01},
        ]:
            with self.subTest(values=values), self.assertRaises(service.YouTubeServiceError):
                service._assert_public_recording(public_info(**values), VIDEO)
        self.assertEqual(service._assert_public_recording(public_info(duration=7200), VIDEO), 7200)

    def test_only_direct_https_googlevideo_audio_can_reach_ffmpeg(self):
        invalid = ["https://googlevideo.com.evil.test/a", "https://127.0.0.1/a", "file:///a", "http://rr1.googlevideo.com/a", "https://u:p@rr1.googlevideo.com/a", "https://rr1.googlevideo.com:bad/a"]
        for value in invalid:
            info = public_info()
            info["formats"][0]["url"] = value
            with self.subTest(value=value), self.assertRaises(service.YouTubeServiceError):
                service._select_audio_url(info)
        self.assertEqual(service._select_audio_url(public_info()), SIGNED_MEDIA)


class ExtractionTests(unittest.TestCase):
    def test_blocked_extraction_stops_without_evasion_options(self):
        completed = subprocess.CompletedProcess([], 1, b"", b"ERROR: Sign in to confirm you're not a bot")
        with patch.object(service.subprocess, "run", return_value=completed) as run:
            with self.assertRaises(service.YouTubeServiceError) as error:
                service._run_ytdlp_json(WATCH)
        self.assertEqual(error.exception.code, "youtube_blocked")
        self.assertIn(service.FALLBACK, error.exception.message)
        args = run.call_args.args[0]
        self.assertIn("--ignore-config", args)
        self.assertIn("--no-cookies", args)
        self.assertNotIn("--cookies-from-browser", args)
        self.assertNotIn("--proxy", args)
        self.assertNotIn("--impersonate", args)
        self.assertEqual(run.call_args.kwargs["timeout"], service.YTDLP_TIMEOUT)

    def test_metadata_timeout_and_oversize_response_are_bounded(self):
        with patch.object(service.subprocess, "run", side_effect=subprocess.TimeoutExpired("yt-dlp", 25)):
            with self.assertRaises(service.YouTubeServiceError) as error:
                service._run_ytdlp_json(WATCH)
            self.assertEqual(error.exception.code, "youtube_timeout")
        complete = subprocess.CompletedProcess([], 0, b"x" * (service.MAX_METADATA_BYTES + 1), b"")
        with patch.object(service.subprocess, "run", return_value=complete):
            with self.assertRaises(service.YouTubeServiceError) as error:
                service._run_ytdlp_json(WATCH)
            self.assertEqual(error.exception.code, "youtube_metadata_too_large")

    def test_ffmpeg_output_is_validated_and_temporary_files_removed(self):
        destinations = []
        def render(args, **kwargs):
            destination = Path(args[-1])
            destinations.append(destination)
            destination.write_bytes(silent_wav())
            self.assertNotIn("shell", kwargs)
            self.assertEqual(args[args.index("-ac") + 1], "1")
            self.assertEqual(args[args.index("-ar") + 1], "24000")
            self.assertEqual(kwargs["timeout"], service.FFMPEG_TIMEOUT)
            return subprocess.CompletedProcess(args, 0, b"", b"")
        with patch.object(service, "_ffmpeg_executable", return_value="/fake/ffmpeg"), patch.object(service.subprocess, "run", side_effect=render):
            data, metadata = service._render_clip(SIGNED_MEDIA, 5, 15)
        self.assertTrue(data.startswith(b"RIFF"))
        self.assertEqual(metadata["sample_duration"], 10)
        self.assertEqual(metadata["channels"], 1)
        self.assertTrue(destinations)
        self.assertFalse(destinations[0].parent.exists())

    def test_failed_or_truncated_ffmpeg_output_is_cleaned_up(self):
        for outcome in ["timeout", "oversize", "short", "truncated", "error"]:
            destinations = []
            def render(args, **kwargs):
                destination = Path(args[-1])
                destinations.append(destination)
                if outcome == "timeout":
                    destination.write_bytes(b"partial")
                    raise subprocess.TimeoutExpired(args, 45)
                if outcome == "oversize":
                    destination.write_bytes(b"x" * (service.MAX_WAV_BYTES + 1))
                elif outcome == "truncated":
                    destination.write_bytes(silent_wav()[:100])
                else:
                    destination.write_bytes(silent_wav(seconds=1))
                return subprocess.CompletedProcess(args, 1 if outcome == "error" else 0, b"", b"blocked")
            with self.subTest(outcome=outcome), patch.object(service, "_ffmpeg_executable", return_value="/fake/ffmpeg"), patch.object(service.subprocess, "run", side_effect=render):
                with self.assertRaises(service.YouTubeServiceError):
                    service._render_clip(SIGNED_MEDIA, 0, 10)
            self.assertFalse(destinations[0].parent.exists())


class ServiceTests(unittest.IsolatedAsyncioTestCase):
    async def test_direct_inspection_retains_playback_metadata_when_youtube_blocks(self):
        blocked = service.YouTubeServiceError("youtube_blocked", "blocked", 503)
        with patch.object(service, "_oembed", AsyncMock(return_value={"title": "Known title", "channel": "Known channel"})), patch.object(service, "_extract_info", AsyncMock(side_effect=blocked)):
            result = await service.inspect_youtube(WATCH)
        self.assertEqual(result["title"], "Known title")
        self.assertEqual(result["status"], "metadata_only")
        self.assertFalse(result["import_available"])
        self.assertEqual(result["error_code"], "youtube_blocked")
        self.assertEqual(result["embed_url"], f"https://www.youtube-nocookie.com/embed/{VIDEO}")
        self.assertNotIn("googlevideo", json.dumps(result))

    async def test_search_filters_untrusted_entries_and_never_returns_stream_urls(self):
        info = {"entries": [
            public_info(), public_info(), public_info(id="bad-url", url="http://127.0.0.1/"),
            public_info(id="bbbbbbbbbbb", is_live=True), public_info(id="ccccccccccc", duration=99999),
            public_info(id="ddddddddddd"),
        ]}
        with patch.object(service, "_extract_info", AsyncMock(return_value=info)) as extract:
            results = await service.search_youtube("public sample", limit=6)
        extract.assert_awaited_once_with("ytsearch6:public sample", search=True)
        self.assertEqual([item["id"] for item in results], [VIDEO, "ddddddddddd"])
        self.assertNotIn("googlevideo", json.dumps(results))
        self.assertTrue(all(not item["import_available"] for item in results))

    async def test_import_returns_wav_and_safe_metadata_only(self):
        with patch.object(service, "_extract_info", AsyncMock(return_value=public_info())), patch.object(service, "_render_clip", return_value=(silent_wav(), {"sample_duration": 10, "sample_rate": 24000, "channels": 1, "size_bytes": 480044, "format": "wav", "mime_type": "audio/wav"})):
            data, metadata = await service.import_youtube_sample(WATCH, 10, 20)
        self.assertTrue(data.startswith(b"RIFF"))
        self.assertEqual(metadata["status"], "imported")
        self.assertEqual(metadata["start_seconds"], 10)
        self.assertEqual(metadata["end_seconds"], 20)
        self.assertNotIn(SIGNED_MEDIA, json.dumps(metadata))
        self.assertNotIn("formats", metadata)

    async def test_invalid_sources_never_start_extraction(self):
        with patch.object(service, "_extract_info", AsyncMock()) as extract:
            with self.assertRaises(service.YouTubeServiceError):
                await service.import_youtube_sample("http://169.254.169.254/", 0, 10)
            with self.assertRaises(service.YouTubeServiceError):
                await service.import_youtube_sample(WATCH, 0, 100)
            extract.assert_not_awaited()

    async def test_oembed_ignores_remote_html_and_urls(self):
        async def handler(request):
            self.assertEqual(request.url.host, "www.youtube.com")
            self.assertEqual(request.url.path, "/oembed")
            return httpx.Response(200, json={"title": "A title", "author_name": "An author", "html": "<script>bad</script>", "thumbnail_url": "http://127.0.0.1/private", "author_url": "http://evil.test"})
        client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
        with patch.object(service.httpx, "AsyncClient", return_value=client):
            result = await service._oembed(VIDEO)
        self.assertEqual(result, {"title": "A title", "channel": "An author"})

    async def test_oembed_transport_dependency_failure_has_safe_fallback(self):
        with patch.object(service.httpx, "AsyncClient", side_effect=ImportError("socks support missing")):
            self.assertIsNone(await service._oembed(VIDEO))


if __name__ == "__main__":
    unittest.main()
