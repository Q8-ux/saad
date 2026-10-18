# مسار الترجمة الذكية | Voice Translation Path

وحدة مستقلة قابلة لإعادة الاستخدام في مشاريع Q8-ux/saad. الواجهة عربية RTL مع ملفات صوت وفيديو أو روابط يوتيوب.

## الوظائف المُنفَّذة

- استيراد ملف (mp3/mp4/m4a/wav/mov/webm/ogg/flac/mkv) أو رابط فيديو YouTube HTTPS.
- التعرف التلقائي على لغة الحديث باستخدام **faster-whisper** محلياً.
- تفريغ النص مع توقيت بداية ونهاية كل مقطع.
- ترجمة مقاطع الحوار إلى العربية افتراضياً أو لغات أخرى بواسطة **Deep Translator / Google Translate**.
- تصدير النص الأصلي والمترجم، وSRT، وVTT، وJSON.
- API موحد يمكن لباقي المشاريع استدعاؤه من خوادمها، دون إعادة تطبيق المعالجة.
- تنظيف ملفات الوسائط المؤقتة تلقائياً بعد المعالجة، وحدود حجم ومدة وتشغيل عملية واحدة في الوقت نفسه.

### العلاقة بـ Voice-Pro
المرجع التقني: https://github.com/abus-aikorea/voice-pro

هذا **مسار خفيف مستقل مبني على بعض التقنيات المستخدمة في Voice-Pro** (faster-whisper وyt-dlp والترجمة)، **وليس نسخة مُثبّتة من Voice-Pro الأصلي ولا واجهة API رسمية له**. تتوفر دبلجة وأدوات استنساخ الصوت المتقدمة في التطبيق الأصلي بعد تثبيته على جهاز ملائم. لا تحتوي هذه الوحدة على كود من Voice-Pro. حقوق ورخصة Voice-Pro (GPL-3.0) تبقى لدى مؤلفيه.

## التشغيل المحلي (Python 3.11+)

يلزم ffmpeg وffprobe في PATH، وإنترنت لتنزيل نموذج Whisper أول مرة ولخدمة الترجمة وYouTube.

```bash
cd voice-translation-path
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn api:app --host 127.0.0.1 --port 7860
```

افتح `http://127.0.0.1:7860`. على Windows استخدم `.venv\\Scripts\\activate`.

يمكن اختيار نموذج أسرع، لكنه أقل دقة أحياناً:
```bash
WHISPER_MODEL=base WHISPER_DEVICE=cpu WHISPER_COMPUTE_TYPE=int8 uvicorn api:app --host 127.0.0.1 --port 7860
```

## Docker (تشغيل خادم محمي)

```bash
cd voice-translation-path
docker build -t translation-path .
docker run --rm -p 127.0.0.1:7860:7860 \
  -e TRANSLATION_API_KEY='change-to-long-secret' translation-path
```

للاستخدام عبر الإنترنت: استعمل HTTPS و reverse proxy مع المصادقة وتحديد الطلبات وتحصين yt-dlp ضد وصول الشبكة الداخلية (عزل الحاوية على مستوى الشبكة). لا تفتح المنفذ العام دون ضوابط. يتطلب التشغيل CPU/RAM وقد يستفيد من GPU؛ لا يمكن تشغيل النموذج على GitHub Pages الثابت.

## واجهة الربط مع المشاريع

`POST /api/translate` (multipart/form-data):
- `file` **أو** `youtube_url` (واحد فقط).
- `source_language`: `auto` (افتراضي) أو رمز لغة مثل `ar`, `zh`, `en`.
- `target_language`: `ar` (افتراضي) أو `en`, `ur`, `fr`, `zh-CN` وغيرها. اختر `none` لتفريغ فقط.
- ترويسة `X-API-Key` مطلوبة عند ضبط `TRANSLATION_API_KEY`.

```bash
curl -X POST http://127.0.0.1:7860/api/translate \
  -H "X-API-Key: change-to-long-secret" \
  -F "file=@example.mp4" \
  -F "source_language=auto" \
  -F "target_language=ar"
```

يعيد JSON: `source_language`, `target_language`, `duration_seconds`, `original_text`, `translated_text`, `segments[]` (`start/end/original/translated`), `srt`, `vtt`.

`GET /api/health` يتحقق من نشاط العملية، **ولا يؤكد جاهزية تنزيل النموذج أو سلامة خدمة الترجمة**.

## إعدادات البيئة

| المتغير | الافتراضي | المعنى |
|---|---|---|
| `TRANSLATION_API_KEY` | فارغ | مفتاح وصول API (لا تُضمّنه في GitHub/واجهة عمومية) |
| `REQUIRE_API_KEY` | 0 | اجعله 1 في النشر العام؛ يمنع البدء إن لم يوجد مفتاح |
| `WHISPER_MODEL` | small | اسم نموذج faster-whisper |
| `WHISPER_DEVICE` | cpu | cpu أو cuda عند التوفر |
| `WHISPER_COMPUTE_TYPE` | int8 | دقة تشغيل النموذج |
| `MAX_UPLOAD_MB` | 150 | سقف حجم الملف |
| `MAX_MEDIA_SECONDS` | 1800 | أقصى مدة للمقطع |

## ضوابط تشغيل وملاحظات حاسمة

1. **الخصوصية:** معالجة الصوت المحلي عبر Whisper تتم على الخادم، لكن نصوص المقاطع تُرسل لمترجم Google الخارجي. لا ترفع مستندات قانونية أو بيانات صحية أو مواد خاصة حتى تستبدل المزود بمترجم محلي معتمد.
2. **الدقة:** قد يخطئ التعرف على اللهجات وتحديد المتحدثين والترجمة. راجع النتائج قبل النشر، لا سيما المقاطع القانونية والطبية.
3. **الحقوق:** تنزيل المحتوى مسؤولية المستخدم ويجب احترام حقوق أصحاب الفيديو وشروط خدمات المصدر.
4. **أمن YouTube:** يقبل التطبيق روابط يوتيوب فقط؛ مع ذلك يجب عزل حركة تنزيلات الخادم ومنع الوصول للشبكات الداخلية عند النشر العام.
5. **السعة:** طلب واحد متزامن؛ خدمة الترجمة المجانية قد تكون محدودة المعدل. لا توجد دبلجة صوتية أو تحليل مرئي للأحداث أو فصل للمتحدثين في هذا الإصدار.
6. **الاختبارات:** اختبارات وحدات محلية، وليست شهادة نجاح معالجة فيديو حقيقي أو جاهزية خادم الإنتاج.

## خطة الربط المقترحة

- `saad-script-studio` / `barcode`: تحويل مقابلات ومواد مرجعية إلى تفريغ وترجمة، دون تعديل السيناريو تلقائياً.
- `ai-video-studio` و`youtube-studio-ai`: جلب SRT/JSON للفيديو ضمن سلسلة إنتاج المحتوى.
- `noura-alattal`: ترجمة مقتطفات مرخّصة لأغراض التعلم.
- `sabeq-legal`: **لا يربط تلقائياً**؛ يحتاج ترجمة محلية آمنة وتقييم خصوصية مستقل.

**الوضع:** هذه وحدة كود قابلة للتشغيل بعد تجهيز خادم مناسب. إضافة الملفات إلى GitHub لا تعني تنصيب Voice-Pro الأصلي أو تشغيل خدمة ترجمة عامة أو نشر رابط حي.
