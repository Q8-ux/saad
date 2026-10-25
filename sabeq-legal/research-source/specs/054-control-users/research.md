# Research

## Password verifier
Decision: @noble/hashes 2.4.0، PBKDF2-HMAC-SHA256 بكلفة 600000 وdkLen32 وasyncTick10، بعد HMAC-SHA256 مع pepper منفصل. ملح عشوائي 16 بايت، وكلمة عشوائية 24 محرفاً.
Rationale: OWASP يوصي بهذه الكلفة لـPBKDF2؛ workerd الحالي يضع حداً افتراضياً 100000، وNode crypto يستدعي القيد نفسه. التنفيذ JavaScript الخالص يتجنب WASM الديناميكي وتخفيض الكلفة. تجربة بحث مستقلة اصطناعية: 700–759ms محلياً، والنتيجة تطابق Node crypto. هذا ليس قياساً للإنتاج.
Alternatives: native-only يتعثر عند الحد؛ Argon2/WASM يحتاج توافق تحميل وذاكرة إضافيين؛ خدمة هوية جديدة توسع غير مطلوب.
Sources:
- https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- https://github.com/paulmillr/noble-hashes/blob/2.4.0/package.json
- https://github.com/cloudflare/workerd/blob/main/src/workerd/io/limit-enforcer.h
- https://github.com/cloudflare/workerd/blob/main/src/workerd/api/crypto/pbkdf2.c%2B%2B
- https://github.com/cloudflare/workerd/blob/main/src/workerd/api/node/crypto.c%2B%2B

## Roles and storage
Decision: الحسابات الخمسة operator بصلاحيات أعمال المكتب، مع بقاء إعدادات الدفع والربط والمبرمج للإدارة السابقة. لا ترقية تلقائية لـit_user.
Rationale: المستخدم طلب أسماء وكلمات مرور دون تحديد أدوار؛ الصلاحية الأقل تحقق تشغيل المركز دون منح مفاتيح أو إنشاء مدير جديد.
Decision: الاعتماد في متغيرات خدمة سرية، والجلسات في D1 الموجود، والتسليم بملف خاص خارج Git. لا بريد مزيف ولا تسجيل عام لحسابات الإدارة.
