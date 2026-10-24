# Tasks: التحقق الداخلي للإصدار

## Phase 1: Setup
- [x] T001 تثبيت إصدار الأداة الأصلي في tools/internal-verification/requirements.txt، ومراجعة API دفتر الشروط (FR-001).

## Phase 2: Foundational
- [x] T002 تنفيذ runner ثابت وبصمات مصدر وتقارير metadata في tools/internal-verification/verify.py (FR-001، FR-004).

## Phase 3: User Story 1
- [x] T003 [US1] اختبار الفشل والغياب والتخطي والمهلة والاكتمال الناقص والأداة الأصلية في tools/internal-verification/test_verify.py (FR-002، FR-007).
- [x] T004 [US1] ربط فحص الخلفية في package.json و.github/workflows/sabeq-internal-verification.yml، وبناء المصدر الخاص عبر scripts/build-verified.sh (FR-003).
- [x] T005 [US1] ربط نشر Pages بالفحص وتحديث تصنيف سابق واختباره في ../sabeq-legal/deployment/release.py وtest_release.py و../.github/workflows/deploy-pages.yml (FR-003، FR-006).

## Phase 4: User Story 2
- [x] T006 [US2] تجاهل التقارير وحماية خصوصيتها في .gitignore واختبار metadata-only في tools/internal-verification/test_verify.py (FR-004، FR-005).
- [x] T007 [US2] فحص حزمة المصدر الخاص وعدم تعديل app أو public، وتوثيق حدود Hermes في tools/internal-verification/README.md (FR-005).

## Phase 5: Validation and release
- [ ] T008 تنفيذ الفحوص الفعلية وبناء ونشر المصدر الخاص وحفظ نسخة GitHub ثم فحص CI في specs/006-internal-verification/validation.md (SC-001..SC-004).
- [x] T009 تجهيز اعتماد Python في المصدر الخاص عبر scripts/setup-verification.sh وscripts/install-ci.sh حتى لا يفشل بناء checkout جديد بسبب غياب الأداة (FR-001، FR-003).

## Dependencies
T001 ثم T002 ثم T003 قبل ربط T004 وT005. T006 مع التنفيذ، T007 بعد البناء، T008 بعد اجتياز الفحوص. لا مهام تعديل مشتركة متوازية؛ مراجعة البحث المستقلة لا تكتب الملفات. النسخة الأولى تشمل القصتين لأن صمت الواجهة والخصوصية شرطان إلزاميان.
