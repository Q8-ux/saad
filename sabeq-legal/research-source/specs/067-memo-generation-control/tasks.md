# Tasks: ضبط توليد المذكرات

## Phase 1: Setup
- [x] T001 ثبّت نطاق المواصفة والقيود في specs/067-memo-generation-control/spec.md.
- [x] T002 افحص المتصلين والمصدر والتصميم في lib/legal-citation-review.ts وspecs/067-memo-generation-control/plan.md.

## Phase 2: Foundational
- [x] T003 أثبت حالات الفشل قبل الإصلاح في tests/memo-generation-control.test.mjs؛ يغطي FR-007.

## Phase 3: User Story 1
- [x] T004 [US1] أصلح استخراج الهوية الكاملة وربط كل قانون بمادته في lib/legal-citation-review.ts؛ يغطي FR-001 وFR-002.

## Phase 4: User Story 2
- [x] T005 [US2] ارفض الاقتباس الصريح غير المطابق من سجل مادته في lib/legal-citation-review.ts؛ يغطي FR-003 وFR-004.

## Phase 5: User Story 3
- [x] T006 [US3] اختبر المصدر الخاطئ والتصحيح قبل الأرشفة في tests/agent-pipeline.test.mjs؛ يغطي FR-005 وFR-006.
- [x] T007 [US3] أضف معرف إصدارة الضبط إلى app/api/health/route.ts وapp/api/legal/memo/route.ts؛ يغطي FR-008.

## Phase 6: Verification and publication
- [x] T008 شغّل الاختبارات ذات الصلة والبناء واكتب الأدلة وحدودها في specs/067-memo-generation-control/validation.md؛ يغطي SC-001 وSC-002.
- [x] T009 راجع تحقق المتطلبات وأكمل النشر وفحص الإصدارة في specs/067-memo-generation-control/validation.md؛ يغطي SC-003 وFR-008.
- [ ] T010 انقل الملفات المعدلة فقط إلى sabeq-legal/research-source في مرآة GitHub وافتح طلب الدمج.

## Dependencies and strategy
T001 ثم T002 ثم T003 قبل تعديل المحقق. T004 قبل T005 لاشتراكهما في الملف. T006 وT007 بعدهما، ثم T008 وT009 وT010. يمكن قراءة حدود المصدر وفحوص التصدير بالتوازي؛ لا تفويض إضافي ولا تعديل متزامن للملف نفسه. اختبر US1 وUS2 مستقلين ثم الرحلة المشتركة. لا تغييرات واجهة أو دفع أو قاعدة بيانات.
