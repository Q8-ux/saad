# AI Video Studio

واجهة GitHub Pages + Backend آمن قابل للنشر منفصلاً.

## ما يعمل على الواجهة
- إدارة المشروع والحفظ المحلي والاستئناف.
- بوابات تحقق للمراحل السبع.
- تقسيم السيناريو وخطة المشاهد.
- رفع الأصول محلياً وتصدير Manifest/JSON.
- فحص حالة Backend عبر `/health` عند ضبط عنوانه.

## Backend المطلوب للتوليد الحقيقي
المفاتيح السرية لا توضع في GitHub Pages. شغّل `backend/server.mjs` على خدمة Node ثم عرّف المتغيرات:

- `OPENAI_API_KEY` — اختياري للـ LLM/صور حسب المزود الذي تربطه.
- `ELEVENLABS_API_KEY` — اختياري للصوت.
- `ALLOWED_ORIGIN=https://q8-ux.github.io`
- `PORT=10000`

ثم ضع رابط Backend داخل إعدادات الواجهة.

## الأمان
- لا توجد مفاتيح API في ملفات الواجهة.
- CORS مقيد عبر `ALLOWED_ORIGIN`.
- حد لحجم JSON وعدد الطلبات داخل الذاكرة كبداية.
- التحقق من الحقول قبل تمريرها للمزود.

## ملاحظة الإخراج
GitHub Pages لا يستطيع تشغيل FFmpeg server-side. إخراج MP4 يحتاج خدمة Backend/worker تدعم FFmpeg أو Remotion. ملف backend يعرّف نقطة `/api/render/plan` للتحقق من خطة الإخراج، ويمكن إضافة worker فعلي لاحقاً.