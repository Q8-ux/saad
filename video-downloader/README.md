# مسار تحميل الفيديوهات — Personal TikTok Downloader

Independent personal downloader built with FastAPI, yt-dlp and FFmpeg. Designed around the common paste → inspect → download workflow. Does **not** contain the proprietary code, trademarks, or design assets of ssstik.io.

## Features
- Arabic RTL mobile-first UI, password gate for all processing endpoints.
- TikTok public video links including vt.tiktok.com short links.
- MP4 as provided by the extractor; an unwatermarked source **may** be available, but cannot be guaranteed.
- MP3 extraction with FFmpeg, optional video preview, file-size and duration limits.
- Video files in temporary storage only, deleted after response. No history/database.
- Host validation, basic per-IP throttling and request concurrency limit.

## Deploy on Render

Deploy as a **Docker web service** from `https://github.com/Q8-ux/saad`, branch `main`.
Set Dockerfile path to `video-downloader/Dockerfile`, Docker context to `.`.
Set `APP_PASSWORD` in the Render environment (never commit it). `PORT` is provided by Render.
Health: `/api/health`. This project requires a backend: GitHub Pages alone is insufficient.

Local:
```bash
cd video-downloader
python -m pip install -r requirements.txt
APP_PASSWORD='your-long-secret' uvicorn app:app --reload
```
Install `ffmpeg` for MP3 export.

## Usage boundaries
Only download videos you own or have permission to save. Private videos, access-controlled posts and content the extractor cannot reach are unsupported. No removal of embedded creator signatures or anti-access circumvention. Watermark availability and TikTok changes can cause individual downloads to fail.

## Manual QA
1. GET `/api/health` shows `{"status":"ok"}`.
2. Wrong or missing password on `/api/info` returns 401.
3. Non-TikTok URL returns 400 (not fetched).
4. Short TikTok URLs are accepted for analysis; test with a *public permitted* post.
5. Run an MP4 and an MP3 extraction and verify the actual downloaded file. An HTTP 200 alone is not proof of correct media.
6. Re-test after each yt-dlp upgrade as TikTok APIs may change.

## GitHub Pages live fallback (6 November 2026)
GitHub Pages now serves a **working browser-based public TikTok video resolver** via TikWM's public API. The public GitHub Actions check verified the supplied sample short link with HTTP 200, CORS `*`, and available HD, normal video and music fields. Media byte downloads from an actual Android browser are not independently verified; a direct-link fallback is provided.

This browser mode is **not access-protected**. The earlier password-protected FastAPI/yt-dlp backend remains in the repository for a future private server, but is **not deployed** due to Render Hobby's 25-service quota. Browser mode sends the entered public link to the third-party TikWM service, which may rate-limit or change its API; avoid confidential links. The TikWM music link represents the soundtrack and may **not include spoken audio** from the full video. No automatic watermark removal from an existing MP4 is performed. Only source media links are returned.
