# تحميل الفيديو — Android v1.3.0

Native Android 10+ app. Visible name: **تحميل الفيديو**.

## Fixed in 1.3.0
- MP4 and MP3 download controls are visible and enabled independently of the optional video metadata preview.
- The corresponding Railway backend no longer runs a second `yt-dlp` metadata request before each download. It now runs the downloader once and applies duration/file-size limits.
- 422, 413, and 429 errors have clearer Arabic messages.
- No account or password is required in this app.
- Distinct package `com.q8ux.videohub.download.beta` to avoid conflicting with older debug-signed installs.
- Accepts URLs via Android Share, and writes output to `Downloads/VideoHub`.
- Public backend allows 21 host groups as an allowlist, but individual videos or platforms can be unsupported or temporarily blocked.
- Public download restrictions remain 60 MB and 10 minutes, with hourly quotas.

## APK
https://github.com/Q8-ux/saad/releases/download/video-hub-android-v1.3.0/Video-Downloader-Android-v1.3.0.apk

This is a debug-signed test APK, not a Play Store release. No internal creator watermarks are removed and login-only/DRM content is not bypassed.
