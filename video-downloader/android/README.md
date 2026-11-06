# مسار الفيديو — Android (Native)

An Android Java application (Android 10+, API 29) connected to the existing Railway `yt-dlp` API. This is **not** a WebView or a site shortcut.

Features: Arabic RTL dark UI, paste URL, share from other Android apps (ACTION_SEND text/plain), platform metadata and quality inspection, MP4/MP3 download, stream to Android's Downloads through MediaStore, progress, and Android Keystore AES/GCM encrypted storage of the API password. No storage permission needed, no personal data analytics, no embedded server password.

Server: `https://video-hub-api-production.up.railway.app`. The user enters their private backend password once. It is never placed in source, GitHub Actions, or the APK. The app cannot access login-only or DRM-protected media; platform extraction success varies.

Build: `gradle -p video-downloader/android :app:assembleDebug` with Android SDK 35, Java 17 and Gradle 8.9. The debug-signed APK is intended for private testing. It may require uninstalling before a future build because debug signing keys differ between runners. For durable production updates, configure a persistent release signing key via GitHub Actions secrets (do not commit a private key).

Download APK: https://github.com/Q8-ux/saad/releases/tag/video-hub-android-v1.0.0

Open the application and paste or share a public video URL. Keep the app visible during download; the initial Android version downloads through an Activity-owned worker, not a foreground service.
