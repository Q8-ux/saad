# Tasks: سياق القضية وفحوص الإدارة

## Phase 1: Specification
- [x] T001 تثبيت النطاق ومعايير القبول في specs/066-project-context-quality/spec.md وplan.md.

## Phase 2: US1
- [x] T002 [US1] إضافة سجل المصادر والتصحيح ووسم النسخة في lib/project-context.ts (FR-001..004).
- [x] T003 [US1] ربط السياسة بالمقابلة والمذكرة في lib/openai.ts وapp/api/legal/memo/route.ts (FR-002,006).
- [x] T004 [US1] اختبار العزل والتصحيح والنصوص الطويلة في tests/project-context.test.mjs (SC-001,002).

## Phase 3: US2
- [x] T005 [US2] ربط فحوص الإدارة الفعلية عبر scripts/check-dashboard-quality.mjs وpackage.json (FR-005,007).
- [x] T006 [US2] تحديث تعريف توفر المسارين في lib/engineering-paths.ts دون ادعاء اختبار حي (FR-005).
- [x] T007 [US2] تشغيل فحوص العقد والسياق وبناء المصدر، وتوثيق النتائج في validation.md (SC-001..003).

## Phase 4: Publication
- [x] T008 نشر المصدر الحالي ومزامنة الملفات المتعلقة إلى GitHub، وتسجيل حدود التحقق في validation.md.

Dependencies: T001 -> T002 -> T003 -> T004؛ T005 وT006 مستقلان بعد T001؛ T007 ثم T008. حدود البيانات والسرية مستمرة في جميع المهام.
