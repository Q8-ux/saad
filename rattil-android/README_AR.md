# رَتِّل القرآن — تطبيق Android

تطبيق Android أصلي خفيف يعرض النسخة الرسمية من رَتِّل:
https://q8-ux.github.io/saad/rattil/

## الوظائف
- WebView آمن للنسخة الرسمية فقط.
- JavaScript وDOM Storage لتوافق كامل مع المنصة.
- إذن الميكروفون عند استخدام التسجيل/التسميع.
- فتح WhatsApp والروابط الخارجية خارج التطبيق.
- معالجة انقطاع الإنترنت وإعادة المحاولة.
- دعم RTL.
- Android 7.0 فأعلى (minSdk 24).
- targetSdk 35.

## البناء
من جذر المستودع:
gradle -p rattil-android :app:assembleDebug

الـ APK الناتج:
rattil-android/app/build/outputs/apk/debug/app-debug.apk
