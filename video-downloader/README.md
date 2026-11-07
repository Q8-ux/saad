# مسار تحميل الفيديوهات — Video Hub

An independent Arabic RTL multi-platform video downloader frontend, with an optional protected FastAPI API based on [yt-dlp](https://github.com/yt-dlp/yt-dlp) and FFmpeg. No proprietary code or site artwork was copied from ssstik.io.

## GitHub project and deployed website

- Source: https://github.com/Q8-ux/saad/tree/main/video-downloader
- Public web interface: https://q8-ux.github.io/saad/video-downloader/

**Live backend:** https://video-hub-api-production.up.railway.app/api/health — Railway production with FastAPI, yt-dlp and a bundled FFmpeg binary. `/api/health` returned HTTP 200, `configured=true`, and 21 allowlisted platform groups. Both YouTube and TikTok public URL metadata extraction returned HTTP 200 in protected end-to-end tests; a real YouTube MP4 downloaded successfully and its MP4 header was verified (533,931 bytes). This does **not** guarantee all individual video URLs or platforms will work. 

The GitHub Pages frontend now preconfigures the Railway HTTPS origin. In **⚙ إعداد محرك التحميل**, enter the private backend password (not stored in this public repository), select **اختبار الاتصال وحفظ**, then paste the video URL. TikTok also has a public TikWM fallback; it may intermittently return HTTP 403.

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

## Railway deployment and operational notes

**Status as of 2026-11-06:** Railway service `video-hub-api` in project `video-hub-multiplatform` is Online with one healthy replica. It uses the official public `python:3.12-slim` image, and a startup command that downloads a pinned immutable revision of `app.py`, `index.html`, and `requirements.txt` from this public repository, then installs Python dependencies and `imageio-ffmpeg`. This workaround is necessary because the Railway GitHub integration currently lacks access to `Q8-ux/saad`; it will **not** automatically deploy future GitHub changes. For long-term reliability, grant Railway's GitHub integration access to this exact repository and use the included Dockerfile instead. This avoids dependency installation on every restart.

Render creation was blocked by the Hobby workspace's 25-service limit, so Railway was used without modifying other projects.

### Verification
- Railway: `GET /api/health` responded 200 and passed its healthcheck
- GitHub Actions: `.github/workflows/video-hub-railway-smoke.yml` verified 200, valid CORS preflight and expected platform list
- Temporary Railway canary: YouTube and TikTok metadata returned 200; YouTube MP4 response passed real byte and file-signature checks
- The temporary canary service was deleted after verification; only the protected API service is retained.
- The owner should rotate `APP_PASSWORD` via Railway's Variables after sharing it.

### Secrets
Do not place `APP_PASSWORD` into any GitHub source, GitHub Pages JavaScript, GitHub Action logs or public issue. The site expects the owner to enter it through the settings field, held only in sessionStorage.

## TikTok fallback

TikWM is a third-party public service and receives URLs processed by that fallback. It can rate-limit and return HTTP 403. The downloaded music link can differ from full audio including speech. The UI provides a direct MP4 link on failure when one is available.

## Android without password (version 1.1.0, 7 Nov 2026)

The Android app no longer prompts for a server password. It uses `/api/public/info` and `/api/public/download` on Railway, with `PUBLIC_APP_MODE=1`. The older private endpoints stay password-protected for the web UI. Public mode has per-client and global hourly rate limits (in memory), a 10-minute video duration limit, and a 60 MB file limit. Abuse may still create infrastructure costs; apply persistent shared rate limits and Railway usage alerts before broad distribution.

Android v1.1.0 GitHub release: https://github.com/Q8-ux/saad/releases/tag/video-hub-android-v1.1.0

The Android app ID differs from the older debug build, so it can be installed without a signature conflict. Uninstall the old app after verifying the new installation. Actual passwordless API video extraction and a TikTok MP4 download were verified from GitHub Actions on 7 Nov 2026. A YouTube sample extractor returned HTTP 422 in that test, so not every platform is confirmed working.
