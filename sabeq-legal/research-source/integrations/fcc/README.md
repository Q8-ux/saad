# بوابة Free Claude Code لمركز تحكم سابق

تشغل هذه الخدمة FCC الحقيقي بإصدار مثبت، مع السماح بمراجعة مقطع برمجي فقط. لا تتاح واجهة FCC الإدارية أو الطرفية أو جلسات تشغيل الأوامر على الإنترنت.

- المصدر الأصلي: https://github.com/Alishahryar1/free-claude-code/tree/707b6ddf677d81e9f1281c52a8c2fd61f649dd72
- ترخيص المصدر الأصلي: AGPL-3.0-only؛ هذا الموصل لا يغيّر مصدر FCC.
- Python المطلوب وفق الإصدار المثبت: `3.14.9`.

## خدمة Render

المستودع: `https://github.com/Q8-ux/saad`، الفرع `main`، Runtime: Python، Compute plan: `free`.

Build command:

```sh
pip install -r sabeq-legal/research-source/integrations/fcc/requirements.txt
```

Start command:

```sh
cd sabeq-legal/research-source/integrations/fcc && python run.py
```

متغيرات البيئة:

| المفتاح | الاستخدام |
| --- | --- |
| `PYTHON_VERSION` | `3.14.9` |
| `SABEQ_FCC_TOKEN` | رمز عشوائي قوي لا يقل عن 32 حرفًا؛ يحتفظ به خادم سابق وخدمة الربط فقط |
| `MODEL` | نموذج مختار صراحة؛ الافتراضي `nvidia_nim/nvidia/nemotron-3-ultra-550b-a55b` |
| `NVIDIA_NIM_API_KEY` | مفتاح حساب NVIDIA، عند اختيار `nvidia_nim/` |
| `OPENROUTER_API_KEY` | بديل عند اختيار `open_router/`، دون انتقال تلقائي إليه |
| `FCC_OPEN_BROWSER` | `false` |
| `PROXY_AUTH_ENABLED` | `true` |
| `LOG_LEVEL` | `WARNING` |

لا تحفظ المفاتيح في GitHub أو عنوان URL. لا تنشأ حسابات مزودين تلقائيًا.

## الربط باللوحة

1. افتح `https://q8-ux.github.io/saad/sabeq-admin-preview/#programmer` بحساب الإدارة.
2. احفظ عنوان HTTPS الفعلي للخدمة ومفتاح الربط والنموذج نفسه.
3. اضغط «جلب النماذج». تعمل هذه الخطوة حتى قبل إضافة مفتاح المزود، وتصرح بأن التوليد ينتظر المفتاح.
4. بعد إضافة مفتاح المزود إلى بيئة الخدمة وإعادة نشرها، أعد جلب القائمة وشغّل المثال الاصطناعي.
5. نجاح `/healthz` أو القائمة لا يثبت نجاح التوليد أو أن حصتك مجانية.

الخطة المجانية قد تنام عند الخمول، وحصتها مشتركة مع خدمات المساحة. لا تحفظ إعدادات مهمة في قرصها المؤقت؛ متغيرات Render هي مصدر الإعداد. قد تحتاج إيقاظ الخدمة ثم إعادة المحاولة بسبب بدء التشغيل البارد. لا يرسل الموصل ملفات القضايا أو بيانات مستخدمي سابق تلقائيًا.
