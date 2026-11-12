# Heretic GGUF — مستقل عن خادم سابق (جاهز للنشر على GPU)

## الحالة
هذا مشروع نشر **قابل للتنفيذ لكنه غير منشور**. تم تحديد عائقين في 12 نوفمبر 2026:
1. حساب Render المتصل ألغى عمليات بناء خدمتي سابق بسبب نفاد دقائق بناء الدورة، ولم ينشر التحديث الأخير.
2. Railway المتصل لا يوفر GPU، وخدمات Render الموجودة من نوع Free CPU؛ لا توجد آلة GPU متاحة في الحسابات المتصلة لتشغيل نموذج GGUF بحجم 5.63GB بكفاءة.

لم يتم استخدام أي قضايا حقيقية للاختبار ولم يتم تغيير مزود الإنتاج الافتراضي.

## المتطلبات
- مضيف مستقل مع NVIDIA GPU وذاكرة مناسبة وقدرة تخزين 10GB+ و Docker Compose/NVIDIA Container Toolkit.
- اسم نطاق مملوك للمشغل يشير إلى المضيف، مع فتح 80 و443 لإصدار شهادة TLS تلقائياً عبر Caddy.
- مفتاح API قوي خاص على مضيف الاستدلال فقط؛ **لا تُرفعه إلى GitHub**.
- تأكيد تكلفة الاستضافة وسياسة الاحتفاظ بالبيانات قبل إرسال أي بيانات عميل.

## التشغيل على آلة GPU مصرح بها
```sh
cd legal-memo-platform/inference/heretic
cp .env.example .env
# غيّر HERETIC_HOSTNAME إلى اسم النطاق الحقيقي المشار إلى خادم GPU.
mkdir -p secrets
umask 077
# ضع مفتاحاً عشوائياً قوياً في هذا الملف محلياً. لا تلصقه في سجل الأوامر أو GitHub.
${EDITOR:-vi} secrets/inference_api_key
docker compose -f compose.yaml up -d
```
يبدأ تنزيل نسخة Q4_K_M من Hugging Face؛ النموذج يُحمّل داخل خادم GPU ولا يُحفظ في مستودع المشروع. Caddy ينشر واجهة HTTPS مع حصر المسار `/v1/chat/completions`، بينما يعمل llama.cpp على شبكة Docker داخلية مع مفتاح إجباري وبدون تسجيل نصوص المطالبات.

## فحص اتصال اصطناعي قبل الإنتاج
بعد جاهزية TLS وDNS شغّل من جهاز آمن:
```sh
export HERETIC_CHAT_COMPLETIONS_URL=https://YOUR-INFERENCE-HOST/v1/chat/completions
export HERETIC_API_KEY=<same-secret-as-file>
export HERETIC_MODEL=heretic-9b-q4
node smoke-test.mjs
```

ثم اضبط فقط في أسرار **خادم سابق الصحيح** (المتصل بالموقع الفعلي، وليس المرآة الثابتة):
```text
LEGAL_AI_PROVIDER=heretic
HERETIC_CHAT_COMPLETIONS_URL=https://YOUR-INFERENCE-HOST/v1/chat/completions
HERETIC_API_KEY=<same-secret>
HERETIC_MODEL=heretic-9b-q4
```
**لا تُفعل** هذه المتغيرات للإنتاج قبل اختبار إصدارات المذكرات وخصوصية الملفات، والتحقق من القانون الحالي، وأخذ موافقة المراجع البشري. خيار بديل أكثر أماناً خلال التجربة: الإبقاء على `LEGAL_AI_PROVIDER=openai` واختبار Heretic من بيئة staging منعزلة.

## الاختبارات
```sh
node --test legal-memo-platform/inference/heretic/deployment.test.mjs
npm test --prefix legal-memo-platform
```
هذه فحوص تكوين؛ لا تثبت استجابة نموذج حقيقي أو كفاءة GPU أو قدرة تمييز الاستشهادات.

## التراجع
- أبقِ `LEGAL_AI_PROVIDER=openai` في بيئة الإنتاج حتى تحقيق جميع الشروط.
- إن تم التفعيل لاحقاً، أعد المتغير إلى `openai` دون حذف ملفات القضايا أو قاعدة البيانات؛ أوقف GPU بعد إخلاء الحركة ومراجعة عقود الاستضافة.

## المراجع
- https://github.com/ggml-org/llama.cpp
- https://huggingface.co/mradermacher/DeepSeek-V4-Pro-Qwen3.5-9B-UNCENSORED-heretic-GGUF


## نشر آلي محمي عبر GitHub Actions على GPU موجود مسبقاً
تجهيز الخادم لا ينشئ أو يستأجر GPU. قبل النشر يجب امتلاك آلة NVIDIA مجهزة بـ Docker وDocker Compose وNVIDIA Container Toolkit وDNS حقيقي يشير إليها. تُضبط أسرار `sabeq-heretic-gpu` في إعدادات GitHub Environment (لا تحفظها في ملف عام):

- `SABEQ_GPU_SSH_HOST`: اسم خادم GPU الحقيقي
- `SABEQ_GPU_SSH_USER`: اسم حساب التشغيل المصرح له باستخدام Docker
- `SABEQ_GPU_SSH_PRIVATE_KEY`: مفتاح SSH خاص بحساب النشر
- `SABEQ_GPU_SSH_KNOWN_HOSTS`: بصمة host key موثقة خارجياً، **لا تستخدم ssh-keyscan تلقائياً للثقة**
- `SABEQ_HERETIC_HOSTNAME`: اسم نطاق خدمة HTTPS
- `SABEQ_HERETIC_API_KEY`: مفتاح bearer قوي وفريد للخادم

بعد ضبط الأسرار وقيود الموافقة على Environment شغّل يدوياً:
https://github.com/Q8-ux/saad/actions/workflows/sabeq-heretic-gpu-deploy.yml

ضع علامة اختيار `deploy_to_authorized_gpu` فقط إذا كنت تملك الاستضافة وتقبل تكلفتها. يرفض المسار التشغيل على غير `main`، ويستخدم SSH بتثبيت بصمة المضيف، وينشئ ملفات السر داخل المضيف دون وضعها في Git. ثم يفحص **استجابة فعلية** لنموذج GGUF بنص اختبار اصطناعي فقط؛ أي فشل يبقي التفعيل في الموقع مغلقاً.

**لا** ينقل هذا المسار تغيير الموقع الأصلي إلى خادم سابق المباشر؛ ما زال مطلوباً نشر مصدر الخلفية الأصلية واختباره بمعزل عن بيانات العملاء. لا تضع بيانات قضايا أو كلمات مرور في أي سجل اختبار.
