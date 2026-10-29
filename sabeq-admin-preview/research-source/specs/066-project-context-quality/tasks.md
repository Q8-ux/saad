# Tasks: فحوص تطوير الإدارة

## Phase 1: Scope
- [x] T001 تثبيت النطاق في specs/066-project-context-quality/spec.md وplan.md.

## Phase 2: US1
- [x] T002 [US1] إضافة test:contracts في package.json وربطه قبل البناء في scripts/build-verified.sh (FR-001,002).
- [x] T003 [US1] تشغيل tests/public-service.test.mjs وبناء المصدر (SC-001,002).
- [x] T004 [US1] نشر اللوحة ومزامنة تعديلات المصدر المحددة مع توثيق الحدود في validation.md.

Dependencies: T001 -> T002 -> T003 -> T004. لا يفتح هذا المسار صلاحيات تنفيذ من المتصفح.
