# Validation
في الخدمة الأصلية: node --test tests/sadad-payments.test.mjs tests/management.test.mjs ثم TypeScript وبناء Worker وnpm run build:github. في الخلفية: npm test. جميع المعاملات اصطناعية.
التفعيل الحي: مفاتيح محفوظة في الخادم، اختبار مصادقة، سعر معتمد، تأكيد حساب التاجر، حفظ رابط webhook في لوحة سداد، ثم فحص تحصيل مصرح. وجود مفاتيح لا يثبت نجاح الدفع.
