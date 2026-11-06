import unittest
from fastapi import HTTPException
from app import validate, platform_of, selected_format, PLATFORMS

class PlatformValidationTests(unittest.TestCase):
    def test_allow_major_sites(self):
        samples = {
            "TikTok": "https://vt.tiktok.com/abc123/",
            "YouTube": "https://youtu.be/xyz123",
            "Instagram": "https://www.instagram.com/reel/AA/",
            "Facebook": "https://m.facebook.com/reel/555",
            "X": "https://x.com/example/status/123",
            "Snapchat": "https://www.snapchat.com/spotlight/abc",
            "Pinterest": "https://pin.it/abc123",
            "Reddit": "https://v.redd.it/abc123",
            "Vimeo": "https://vimeo.com/123456",
            "Twitch": "https://clips.twitch.tv/abc123",
            "LinkedIn": "https://www.linkedin.com/posts/user_123",
            "Telegram": "https://t.me/example/123",
            "SoundCloud": "https://soundcloud.com/user/track",
        }
        for platform, url in samples.items():
            with self.subTest(platform=platform):
                self.assertEqual(validate(url)[1], platform)

    def test_reject_hosts_and_protocols(self):
        invalid = [
            "http://www.youtube.com/watch?v=123",
            "https://youtube.com.attacker.org/watch?v=123",
            "https://127.0.0.1/internal",
            "https://localhost/admin",
            "https://example.org/video",
            "https://user:pass@youtube.com/watch?v=123",
            "https://youtube.com:8443/watch?v=123",
            "file:///etc/passwd",
            "https://youtu.be/",
            "https://www.youtube.com/watch?v=x\nX-Fake:1",
        ]
        for url in invalid:
            with self.subTest(url=url):
                with self.assertRaises(HTTPException):
                    validate(url)

    def test_quality_validation(self):
        for quality in ("best", "1080", "720", "480", "360"):
            self.assertTrue(selected_format(quality))
        with self.assertRaises(HTTPException):
            selected_format("99999")

    def test_no_generic_catchall_platform(self):
        self.assertNotIn("generic", PLATFORMS)
        self.assertIsNone(platform_of("mysecretcompany.internal"))

if __name__ == "__main__":
    unittest.main()
