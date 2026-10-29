# خطة فحوص تطوير لوحة سابق

## Technical Context
المصدر الحالي Vinext/TypeScript؛ عقد الخدمة في lib/public-service.ts. اختبارات tests/public-service.test.mjs مستقلة بمزود وبيانات اصطناعية.

## Constitution Check
مصدر بيانات واحد وتوقيع وصلاحيات قائمة؛ لا مفاتيح في المتصفح ولا تعديل للصلاحيات أو البيانات.

## Research Decisions
إعادة استخدام فحوص العقد الحالية كشرط بناء واختبار GitHub. لا واجهة تنفيذ shell أو قاعدة ثانية.

## Structure and Phases
إضافة test:contracts، وربطه قبل البناء في scripts/build-verified.sh. فحص النتيجة ثم نشر اللوحة ومزامنة تعديلات المصدر المحددة.

## Validation
node --test tests/public-service.test.mjs ثم بناء المشروع. التحقق المحلي منفصل عن الجلسة الحية.
