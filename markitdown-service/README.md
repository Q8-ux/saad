# MarkItDown Service

خدمة API مستقلة لتحويل ملفات المشاريع إلى Markdown باستخدام
[Microsoft MarkItDown](https://github.com/microsoft/markitdown). صُممت لتُستدعى من
الخوادم الخلفية لمشاريعك، ولا تخزن الملفات بعد انتهاء الطلب.

## لماذا خدمة مستقلة؟

- تستخدمها عدة مشاريع من نقطة واحدة.
- تُحدَّث وتُراقَب بصورة منفصلة عن واجهات GitHub Pages.
- تحافظ على مفتاح الحماية خارج JavaScript العام.
- تحدّ من حجم الملفات ووقت المعالجة وعدد العمليات المتزامنة.

## الواجهات

| المسار | الوظيفة | الحماية |
|---|---|---|
| `GET /health` | فحص جاهزية الخدمة | عام |
| `GET /docs` | توثيق OpenAPI تفاعلي | عام، لكن التنفيذ يحتاج المفتاح |
| `GET /v1/formats` | الصيغ والحدود المفعلة | مفتاح API |
| `POST /v1/convert` | رفع ملف وتحويله | مفتاح API |

يدعم الإصدار الأول PDF وWord وPowerPoint وExcel ورسائل Outlook وHTML وCSV وJSON
وXML والنصوص والصور. الروابط الخارجية وملفات ZIP والإضافات معطلة عمداً لتقليل
المخاطر.

## تشغيل محلي

يتطلب Python 3.10 أو أحدث:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export MARKITDOWN_API_KEY='replace-with-a-long-random-secret'
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## مثال استخدام

```bash
curl --fail-with-body \
  -H 'X-API-Key: YOUR_SERVER_SIDE_KEY' \
  -F 'file=@contract.pdf' \
  'https://YOUR-SERVICE.onrender.com/v1/convert'
```

لإرجاع Markdown مباشرة بدلاً من JSON:

```bash
curl --fail-with-body \
  -H 'Authorization: Bearer YOUR_SERVER_SIDE_KEY' \
  -F 'file=@contract.docx' \
  'https://YOUR-SERVICE.onrender.com/v1/convert?response_format=markdown'
```

## الربط مع المشاريع

يجب أن يتم الاتصال من Backend أو Edge Function. لا تضع `MARKITDOWN_API_KEY` داخل
ملفات HTML أو JavaScript أو تطبيق جوال؛ أي مفتاح داخلها يمكن استخراجه وإساءة
استخدام الخدمة.

## متغيرات البيئة

| المتغير | الافتراضي | الغرض |
|---|---:|---|
| `MARKITDOWN_API_KEY` | بلا قيمة | إلزامي للتحويل |
| `MAX_FILE_SIZE_MB` | `50` | أقصى حجم للملف |
| `MAX_OUTPUT_CHARACTERS` | `5000000` | أقصى طول للناتج |
| `CONVERSION_TIMEOUT_SECONDS` | `180` | مهلة التحويل |
| `MAX_CONCURRENT_CONVERSIONS` | `1` | حماية الذاكرة |
| `LOG_LEVEL` | `INFO` | مستوى السجلات |

## حدود مهمة

MarkItDown ممتاز لاستخراج بنية الملفات الرقمية، لكنه ليس بديلاً كاملاً لمحرك OCR
عربي متخصص. ملفات PDF المصورة أو الممسوحة ضوئياً تحتاج مرحلة OCR منفصلة قبل
التحويل. لم يتم تفعيل إضافات MarkItDown أو إدخال مفاتيح ذكاء اصطناعي في هذه
الخدمة لتجنب رفع المستندات إلى مزود خارجي دون قرار صريح.

## الاختبارات

```bash
pip install -r requirements-dev.txt
ruff check app tests
pytest -q
```

## المصدر والترخيص

الخدمة غلاف مستقل. محرك التحويل
[microsoft/markitdown](https://github.com/microsoft/markitdown) منشور بترخيص MIT.
