# تحميل الفيديو – Android 1.4.0

Native Android app with a simplified, offline-first launcher `DownloadVideoActivity`. The app lays out its screen **before** making any network call, so connection errors appear as status messages instead of a blank page. Minimal UI avoids complex layout dependencies and uses software rendering on the launcher for older Android GPU implementations.

- App name: تحميل الفيديو
- Android 10+, no password or sign-in
- APK package: `com.q8ux.videohub.clean.beta` (separate from previous debug-signed builds)
- Direct MP4 and MP3 buttons, paste input and simple TikTok test link
- Live Railway API: `https://video-hub-api-production.up.railway.app/api/public/download`
- Saves using Android MediaStore in `Downloads/VideoHub`
- Public API limits: 60 MB, 10 min, quota. Content behind authentication or DRM is not supported.
- The old MainActivity is retained but no longer the launcher.

**GitHub APK:** https://github.com/Q8-ux/saad/releases/download/video-hub-android-v1.4.0/Tahmeel-Alvideo-v1.4.0.apk

This is a debug-signed testing APK; it should not be considered production validated without successful emulator and real-device run. Use a stable private release signing key for future updates.
