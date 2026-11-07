import unittest
from collections import defaultdict, deque
from unittest.mock import AsyncMock, patch
from fastapi import HTTPException
from starlette.requests import Request
import app as video


def req(path, ip="192.0.2.44"):
    return Request({
        "type": "http", "path": path, "method": "POST",
        "scheme": "https", "root_path": "",
        "query_string": b"", "headers": [],
        "client": (ip, 8080), "server": ("testserver", 443)
    })


class PasswordlessPublicTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        video.public_rate.clear()
        video.public_global_rate.clear()

    async def test_disabled_mode_refuses_anonymous_request(self):
        with patch.object(video, "PUBLIC_APP_MODE", False):
            with self.assertRaises(HTTPException) as ex:
                await video.info(
                    video.Clip(url="https://youtu.be/jNQXAC9IVRw"),
                    req("/api/public/info"))
            self.assertEqual(ex.exception.status_code, 503)

    async def test_public_info_does_not_request_password(self):
        sample = {
            "id": "jNQXAC9IVRw", "title": "test video",
            "duration": 14, "formats": [{"height": 360}]
        }
        with patch.object(video, "PUBLIC_APP_MODE", True),              patch.object(video, "authorize", side_effect=AssertionError("auth called")),              patch.object(video, "read_info", new_callable=AsyncMock) as extractor:
            extractor.return_value = sample
            result = await video.info(
                video.Clip(url="https://youtu.be/jNQXAC9IVRw"),
                req("/api/public/info"))
            self.assertEqual(result["platform"], "YouTube")
            self.assertEqual(result["title"], "test video")
            self.assertEqual(result["available_heights"], [360])

    async def test_public_rejects_long_video(self):
        with patch.object(video, "PUBLIC_APP_MODE", True),              patch.object(video, "read_info", new_callable=AsyncMock) as extractor:
            extractor.return_value = {"duration": 601, "formats": []}
            with self.assertRaises(HTTPException) as ex:
                await video.info(
                    video.Clip(url="https://youtu.be/jNQXAC9IVRw"),
                    req("/api/public/info"))
            self.assertEqual(ex.exception.status_code, 413)

    async def test_anonymous_rate_limits_enforced(self):
        with patch.object(video, "PUBLIC_APP_MODE", True):
            for _ in range(3):
                video.throttle_public(req("/api/public/download"), "download")
            with self.assertRaises(HTTPException) as ex:
                video.throttle_public(req("/api/public/download"), "download")
            self.assertEqual(ex.exception.status_code, 429)

    async def test_original_private_route_still_requires_password(self):
        with patch.object(video, "APP_PASSWORD", "private-test-key"),              patch.object(video, "authorize", wraps=video.authorize):
            with self.assertRaises(HTTPException) as ex:
                await video.info(
                    video.Clip(url="https://youtu.be/jNQXAC9IVRw"),
                    req("/api/info"))
            self.assertEqual(ex.exception.status_code, 401)


if __name__ == "__main__":
    unittest.main()
