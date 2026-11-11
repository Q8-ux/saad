"""Exercise the real Arabic cloning engines over the studio's private API."""

import io
import os
import subprocess
import tempfile
import time
import wave
from array import array
from pathlib import Path

import httpx


MODELS = {
    "moss_tts_nano": "moss-tts-nano-onnx",
    "habibi_tts": "habibi-tts-msa",
}
REFERENCE_TEXT = "هذا تسجيل تجريبي لفحص توليد الصوت باللغة العربية."
GENERATION_TEXT = "مَرْحَبًا بِكُمْ فِي هَذَا الاِخْتِبَارِ."


def wait_for_api(client):
    deadline = time.monotonic() + 100
    while time.monotonic() < deadline:
        try:
            client.get("/health").raise_for_status()
            return
        except (httpx.ConnectError, httpx.ReadError):
            time.sleep(2)
    raise RuntimeError("The engine API did not start")


def generate(client, profile_id, engine):
    job = client.post(
        "/generate",
        json={
            "profile_id": profile_id,
            "engine": engine,
            "language": "ar",
            "text": GENERATION_TEXT,
            "personality": False,
            "seed": 11,
        },
    ).raise_for_status().json()
    assert job["engine"] == engine
    job_id = job["id"]
    deadline = time.monotonic() + 17 * 60
    last_status = None
    while time.monotonic() < deadline:
        item = client.get(f"/history/{job_id}").raise_for_status().json()
        status = item["status"]
        if status != last_status:
            print(f"{engine}: {status}", flush=True)
            last_status = status
        if status == "completed":
            audio = client.get(f"/audio/{job_id}").raise_for_status().content
            with wave.open(io.BytesIO(audio)) as wav:
                frames = wav.getnframes()
                assert frames > wav.getframerate() / 4
                assert wav.getsampwidth() == 2
                assert wav.getnchannels() == 1
                samples = array("h", wav.readframes(frames))
                assert max(abs(sample) for sample in samples) > 100
                print(f"{engine}: {frames / wav.getframerate():.2f}s WAV", flush=True)
            return
        if status in {"failed", "cancelled", "canceled"}:
            raise RuntimeError(f"{engine} failed: {item.get('error') or item.get('error_message')}")
        time.sleep(3)
    raise TimeoutError(f"{engine} did not complete within the smoke test budget")


def main():
    base_url = os.environ.get(
        "STUDIO_SMOKE_URL", f"http://127.0.0.1:{os.environ.get('PORT', '8080')}/api/voicebox"
    )
    with httpx.Client(
        base_url=base_url,
        headers={"Authorization": f"Bearer {os.environ['STUDIO_API_TOKEN']}"},
        timeout=30,
    ) as client, tempfile.TemporaryDirectory() as temp:
        wait_for_api(client)
        reference = Path(temp) / "reference.wav"
        subprocess.run(
            ["espeak-ng", "-v", "ar", "-s", "125", "-w", str(reference), REFERENCE_TEXT],
            check=True,
        )
        profile = client.post(
            "/profiles",
            json={
                "name": "Arabic engine smoke test",
                "language": "ar",
                "voice_type": "cloned",
                "default_engine": "moss_tts_nano",
            },
        ).raise_for_status().json()
        profile_id = profile["id"]
        try:
            with reference.open("rb") as audio:
                client.post(
                    f"/profiles/{profile_id}/samples",
                    files={"file": ("reference.wav", audio, "audio/wav")},
                    data={"reference_text": REFERENCE_TEXT},
                ).raise_for_status()

            for engine, model_name in MODELS.items():
                generate(client, profile_id, engine)
                status = client.get("/models/status").raise_for_status().json()["models"]
                model = next(item for item in status if item["model_name"] == model_name)
                assert model["downloaded"] and model["loaded"]
                client.post("/models/unload", json={"model_name": model_name}).raise_for_status()
        finally:
            client.delete(f"/profiles/{profile_id}").raise_for_status()


if __name__ == "__main__":
    main()
