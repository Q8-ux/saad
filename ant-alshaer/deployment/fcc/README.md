# مسار المبرمج الاقتصادي — أنت الشاعر

المصدر: https://github.com/Alishahryar1/free-claude-code

أداة تشغيل بالإصدار `6.19.6`، من المرجع `v6.19.6` والالتزام `da29b69db4cf4854c6d6fb4195e5628db04c219d`. يشترط المصدر Python `3.14.10` وترخيصه `AGPL-3.0-only`. لا ينسخ هذا المجلد كود FCC. تستخدم الأداة حزمة PyPI المثبتة بالإصدار، وليست تثبيتًا من فرع main المتغير؛ تبعيات الحزمة تحلها uv بحسب متطلبات المصدر.

تخدم هذه الأداة النسخة الأصلية من «أنت الشاعر». افتح مصدر التطبيق الكامل بأدواته المعتادة، ثم نفذ من جذر مستودع سعد:

```bash
python3 ant-alshaer/deployment/fcc/run.py version --project-root /absolute/original-poetry-checkout
python3 ant-alshaer/deployment/fcc/run.py server --project-root /absolute/original-poetry-checkout
```

يجب تثبيت uv أولًا: https://github.com/astral-sh/uv . يحمّل إصدار Python المطلوب والحزمة عند أول تشغيل. لا تحتاج معرفة مفتاح أو إدخاله لفحص الإصدار؛ تشغيل النموذج يحتاج إعداد مزود فعلي داخل لوحة FCC.

بعد إعداد مزود ونموذج متاحين في لوحة FCC المحلية، وثبّت أداة البرمجة التي تختارها:

```bash
python3 ant-alshaer/deployment/fcc/run.py claude --project-root /absolute/original-poetry-checkout
python3 ant-alshaer/deployment/fcc/run.py codex --project-root /absolute/original-poetry-checkout
```

ترفض الأداة مصدر مشروع آخر أو طبقة research-source غير الكاملة. لا تغيّر HOME أو مفاتيح التطبيق ولا تثبّت أدوات البرمجة تلقائيًا. تحفظ uv ملفات التشغيل المؤقتة في .sites-runtime المستبعد من Git. تحفظ FCC إعداداته في موضعه المحلي المعتاد ~/.fcc/، فلا تنسخها إلى المستودع أو ترفقها بالتقارير.

الربط الخادمي لمحرك الشعر موثق في [دليل التطبيق](../../research-source/docs/free-claude-code.md). Cloudflare Workers لا يشغّل عملية Python؛ تشغيل FCC للزوار يحتاج خادمًا دائمًا بعنوان HTTPS ورمز Proxy Authentication. وجود محول FCC في التطبيق لا يعني وجود خادم أو مفتاح أو حصة مجانية.
