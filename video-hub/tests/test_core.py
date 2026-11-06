"""Offline safety smoke tests for Video Hub."""
import sys
import unittest
from pathlib import Path
from fastapi import HTTPException

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "api"))
from main import check_url, health


class URLValidationTests(unittest.TestCase):
    def test_known_public_links(self):
        samples = [
            "https://vt.tiktok.com/ZSp6Vv81S/",
            "https://www.tiktok.com/@abc/video/123",
            "https://www.instagram.com/reel/abc123/",
            "https://youtu.be/test1234",
            "https://x.com/user/status/123",
        ]
        for link in samples:
            with self.subTest(link=link):
                self.assertEqual(check_url(link)[0], link)

    def test_rejects_unsafe_links(self):
        samples = [
            "http://vt.tiktok.com/example",
            "https://127.0.0.1/video",
            "https://vt.tiktok.com.evil.example/video",
            "https://evil.example/?next=https://vt.tiktok.com/",
            "https://user:pass@tiktok.com/video",
            "https://tiktok.com:8443/video",
            "file:///etc/passwd",
            "https://tiktok.com/",
        ]
        for link in samples:
            with self.subTest(link=link), self.assertRaises(HTTPException):
                check_url(link)

    def test_health(self):
        self.assertEqual(health()["status"], "ok")


if __name__ == "__main__":
    unittest.main()
