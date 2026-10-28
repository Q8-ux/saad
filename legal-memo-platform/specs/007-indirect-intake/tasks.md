# Tasks: مقابلة غير مباشرة مكتملة

## Phase 1: Setup
- [x] T001 تثبيت المواصفة والخطة والتحليل والحدود في specs/007-indirect-intake/.

## Phase 2: US1 — فهم القضية
- [x] T002 [US1] إصلاح التخصص والدرجة والصفة وجميع الأطراف في ../sabeq-legal/research-source/lib/procedural-position.ts مع اختبارات النفي والمرحلة.
- [x] T003 [US1] ترتيب أسئلة المرحلة والفاعل وحفظ حقول الصحيفة والسياق في lib/intake-context.ts وlib/openai.ts وapp/api/legal/assistant/route.ts ضمن مصدر الواجهة.

## Phase 3: US2 — اكتمال البيانات
- [x] T004 [US2] إضافة فجوات الحقول وبوابة النقل والتعبئة في lib/memo-handoff.ts وlib/intake-readiness.ts وربطها بالمقابلة والواجهة.
- [x] T005 [US2] اختبار نواقص القالب والتعارض والبيانات غير المنطبقة والنقل الكامل في tests/indirect-intake.test.mjs وtests/connected-intake.test.mjs.

## Phase 4: Validation and delivery
- [x] T006 بناء الخادم والعميل وتشغيل الفحوص ذات الصلة وتدوين النتائج في verification.md.
- [ ] T007 مزامنة التعديل ونشر الخدمة ونسخة GitHub Pages والتحقق من حالة النشر، أو توثيق العائق الفعلي.

## Dependencies
T001 ثم T002/T003 ثم T004 ثم T005 ثم T006/T007. لا تعديلات متزامنة للملف نفسه. فحص المتصلات مستقل عن إنشاء المواصفة وقد اكتمل دون تعديل.
