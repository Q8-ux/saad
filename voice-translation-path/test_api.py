"""Offline contract tests; no model download or network needed."""
import pytest
from fastapi.testclient import TestClient
import api

client = TestClient(api.app)


def test_youtube_only():
    api._youtube_only("https://www.youtube.com/watch?v=test123")
    api._youtube_only("https://youtu.be/test123")
    for url in (
        "http://www.youtube.com/watch?v=1",
        "https://youtube.com.evil.example/watch?v=1",
        "https://127.0.0.1/watch?v=1",
        "https://www.youtube.com/",
        "file:///etc/passwd",
    ):
        with pytest.raises(Exception):
            api._youtube_only(url)


def test_subtitle_formats():
    segments = [api.Segment(start=1.245, end=4.0, original="hello", translated="مرحبا")]
    srt = api._subtitles(segments)
    vtt = api._subtitles(segments, vtt=True)
    assert "00:00:01,245 --> 00:00:04,000" in srt
    assert "WEBVTT\n" in vtt
    assert "00:00:01.245 --> 00:00:04.000" in vtt
    assert "مرحبا" in vtt


def test_input_validation():
    assert client.post("/api/translate", data={}).status_code == 400
    response = client.post("/api/translate", files={"file": ("attack.exe", b"xxx")})
    assert response.status_code == 415


def test_translation_contract(monkeypatch):
    monkeypatch.setattr(api, "_duration", lambda path: 3.5)
    monkeypatch.setattr(api, "_transcribe", lambda path, source: (
        [(0.0, 1.25, "Hello"), (1.25, 3.5, "World")], "en"
    ))
    monkeypatch.setattr(api, "_translate", lambda lines, target: ["مرحبا", "بالعالم"])
    result = client.post(
        "/api/translate",
        files={"file": ("clip.mp4", b"fake bytes", "video/mp4")},
        data={"source_language": "auto", "target_language": "ar"},
    )
    assert result.status_code == 200, result.text
    data = result.json()
    assert data["translated_text"] == "مرحبا\nبالعالم"
    assert data["source_language"] == "en"
    assert data["duration_seconds"] == 3.5
    assert len(data["segments"]) == 2
    assert "WEBVTT" in data["vtt"]
    assert data["segments"][0]["original"] == "Hello"


def test_authenticated_api(monkeypatch):
    monkeypatch.setattr(api, "API_KEY", "test-secret")
    monkeypatch.setattr(api, "REQUIRE_KEY", True)
    assert client.post("/api/translate", data={}).status_code == 401
    assert client.post(
        "/api/translate", data={}, headers={"X-API-Key": "test-secret"}
    ).status_code == 400


def test_lock_returns_busy():
    api._job_lock.acquire()
    try:
        res = client.post(
            "/api/translate", files={"file": ("clip.mp4", b"fake")},
        )
        assert res.status_code == 429
    finally:
        api._job_lock.release()
