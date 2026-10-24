# Validation Guide

في مصدر سابق الأصلي، بعد تثبيت الاعتماديات القائمة:

```sh
node --test tests/inline-authorities.test.mjs tests/reviewed-judgments.test.mjs tests/approved-templates.test.mjs tests/pleading-layout.test.mjs
npx tsc --noEmit
npm run build
```

النتيجة المطلوبة: تبقى بيانات الأسانيد الصحيحة، وترفض المراجع الغائبة أو البوابة، وتخلو صادرات الأنواع الثلاثة من علامات البحث، ويحافظ سجل المراجعة على المصادر.

في المستودع المشترك يشغل أيضاً اختبار الخلفية وفحص Spec Kit، دون استخدام وثائق عميل أو توليد حي مدفوع.
