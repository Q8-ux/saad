# Video Hub — مركز تحميل الفيديوهات

موقع تحميل فيديوهات مستقل بتصميم عربي (RTL)، مع واجهة هاتف، وتحميل MP4 وMP3 للفيديوهات العامة.

## الروابط
- الشفرة: https://github.com/Q8-ux/saad/tree/main/video-hub/
- واجهة GitHub Pages: https://q8-ux.github.io/saad/video-hub/ (إن كان Pages منشورًا من الفرع main)
- المصدر التقني المرجعي: https://github.com/OpenSelena/omniget
- المحرك المفتوح المصدر: https://github.com/yt-dlp/yt-dlp

**مهم:** OmniGet تطبيق سطح مكتب GPL-3.0. هذا الموقع كود أصلي مستقل وليس نسخة من مصدر SSSTik أو من كود OmniGet. لا توجد علاقة بهاتين الجهتين.

## التشغيل
مبدئيًا افتح `index.html` لعرض الواجهة. لكي تعمل أزرار تحليل وتنزيل الروابط، يلزم خادم Python API، لأن GitHub Pages يستضيف ملفات ثابتة فقط.

### تشغيل محلي
```bash
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\\Scripts\\activate
pip install -r video-hub/api/requirements.txt
cd video-hub/api
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```
ثم افتح http://127.0.0.1:8000/ .

### نشر الخلفية والموقع معًا على Render
أنشئ Web Service مربوطًا بالمستودع `Q8-ux/saad`، بإعدادات:

| الإعداد | القيمة |
|---|---|
| Branch | main |
| Runtime | Python |
| Build command | `pip install -r video-hub/api/requirements.txt` |
| Start command | `cd video-hub/api && python -m uvicorn main:app --host 0.0.0.0 --port $PORT` |
| Health endpoint | `/api/health` |

سيصبح الموقع والـ API على نفس نطاق Render، بدون إعداد CORS إضافي. في نسخة GitHub Pages، افتح «إعداد الخادم» وضع رابط Render عند اكتمال نشره.

## مسارات API
- `GET /api/health` — فحص الاتصال
- `POST /api/info` — `{"url": "https://vt.tiktok.com/..."}`
- `GET /api/download?kind=mp4&url=...` — تنزيل ملف فيديو
- `GET /api/download?kind=mp3&url=...` — تنزيل صوت

## الأمان والتشغيل
- روابط HTTPS فقط من قائمة نطاقات TikTok وInstagram وYouTube وX وFacebook.
- لا تسجيل دخول للحسابات الخاصة، ولا محاولة تجاوز DRM أو الفيديوهات الخاصة.
- حد أقصى 180MB، ومهلة تنزيل 175 ثانية، وحدّ طلبات لكل عميل، وتنزيلان متزامنان في الخادم.
- ملفات مؤقتة تُحذف بعد اكتمال إرسال الملف (وقد تُحذف بعد فشل العملية).
- لا تخزين دائم للوسائط، ولا خدمة خارجية مدفوعة، ولا مشاركة بيانات اعتماد الحسابات.
- قد تفشل بعض روابط المنصات بسبب القيود الإقليمية أو تغير واجهاتها البرمجية، ويُفضَّل تحديث `yt-dlp` باستمرار.
- **لا يوجد ضمان** أن مصدر TikTok سيتيح نسخة بلا علامة مائية؛ يجري تفضيل الصيغة التي لا يصفها المستخرج بالموسومة عند توافرها. لا تُمسح الشعارات أو التواقيع المدمجة في الإطارات.
- إذا أصبح الموقع عامًا، أضف رقابة على الاستهلاك (quota) وحدًا على عدد المتصفحين، وتحقق من شروط المنصات وحقوق النشر.

## الاختبار
بعد تثبيت الحزم:
```bash
python -m unittest discover -s video-hub/tests -v
curl http://127.0.0.1:8000/api/health
```
اختبار رابط TikTok الحقيقي يتطلب خادمًا متصلًا بالخارج. قد يخضع لقيود TikTok، لذا لا تُعد الواجهة وحدها إثباتًا لنجاح التنزيل.
