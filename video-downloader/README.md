# مسار تحميل الفيديوهات — Video Hub

An independent Arabic RTL multi-platform video downloader frontend, with an optional protected FastAPI API based on [yt-dlp](https://github.com/yt-dlp/yt-dlp) and FFmpeg. No proprietary code or site artwork was copied from ssstik.io.

## GitHub project and deployed website

- Source: https://github.com/Q8-ux/saad/tree/main/video-downloader
- Public web interface: https://q8-ux.github.io/saad/video-downloader/

**Current limitation:** GitHub Pages cannot execute Python/FFmpeg. The frontend accepts links from multiple platforms and supports a separate API connection, but actual YouTube/Instagram/Facebook/X/etc. downloads require a running backend. A browser TikTok fallback uses the public TikWM endpoint when reachable; it sometimes returns HTTP 403, so uptime is not guaranteed. An HTTP 200 response alone is not proof a video saved successfully.

## Backend support

TikTok, YouTube and Shorts, Instagram and Reels, Facebook, X/Twitter, Snapchat Spotlight, Pinterest, Reddit, Vimeo, Twitch, Dailymotion, SoundCloud, Bluesky, Bilibili, Rumble, Streamable, VK, LinkedIn, Threads, Telegram, Kwai.

These are URLs in a **security-reviewed host allowlist**, not a promise that every video works. Content behind login, DRM and private posts is not supported. We do not bypass restrictions or remove embedded signatures/watermarks. Some platforms change their download protocol often. yt-dlp supports additional sites not automatically exposed because serving arbitrary URLs introduces server-side request forgery risk.

## Start / deploy

For Docker deployments:
- Repository: https://github.com/Q8-ux/saad, branch main
- Docker context: `.`
- Dockerfile: `./video-downloader/Dockerfile`
- Set `APP_PASSWORD` to a long unique secret in the host's environment, **never** commit the password
- Optional: `CORS_ORIGINS=https://q8-ux.github.io`
- Health endpoint: `GET /api/health` (reports `configured` and supported platform names)

Locally install Python requirements and FFmpeg, then:
```bash
cd video-downloader
python -m pip install -r requirements.txt
APP_PASSWORD='use-a-long-secret' uvicorn app:app --host 127.0.0.1 --port 8000
python -m unittest discover -s tests -p 'test_*.py' -v
```

The protected JSON endpoints require an `X-Download-Key` header containing the server password:
- `POST /api/info` body `{"url":"https://...","kind":"video","quality":"best"}`
- `POST /api/download` same body, `kind` either `video` or `audio`, `quality` from `best,1080,720,480,360`
- `GET /api/health` needs no password

After the backend is deployed, open the site's **إعداد محرك التحميل** section, paste the HTTPS API origin and password, and test the connection. Password is held in browser sessionStorage only; backend URL is stored in localStorage. The service limits file sizes, durations and concurrency, deletes temp media after response, and does not support arbitrary user URLs.

## Hosting blocker

Creating a fresh Render web service failed because the connected Hobby workspace hit its 25-service limit. No other service was overwritten or deleted. The project can be deployed to another suitable Docker host, or an unused Render service can be retired *only with explicit authorization*. Until then non-TikTok sites remain configured but not live.

## TikTok fallback

TikWM is a third-party public service and receives URLs processed by that fallback. It can rate-limit and return HTTP 403. The downloaded music link can differ from full audio including speech. The UI provides a direct MP4 link on failure when one is available.
