# Tasks: حسابات تشغيل مركز التحكم

## Phase 1: Setup
- [x] T001 تثبيت اعتماد الخادم والتحقق من قفل الحزمة في package.json وpackage-lock.json، ومزامنة specs/054-control-users. (FR-003)

## Phase 2: Security test boundary
- [x] T002 إضافة اختبارات اصطناعية فاشلة أولاً في tests/management.test.mjs للاعتماد والجلسات والصلاحيات وحدود المحاولات والواجهة. (FR-001–009, SC-001–004)

## Phase 3: US1 — Login and sessions
- [x] T003 [US1] تنفيذ lib/management-password.ts: username unique normalized pattern [a-z][a-z0-9_]{2,31}، salt32hex، hash64hex، enabled boolean، pepper minimum32، وكلفة600000 الثابتة دون تخفيض. (FR-001,003,005)
- [x] T004 [US1] ربط الجلسات والإلغاء والخروج والحدود في lib/management-auth.ts وapp/api/management/[...path]/route.ts؛ expiry8h/idle1h و30/8 محاولات بالساعة لا تتجاوز بتغيير User-Agent. (FR-004–006,008)

## Phase 4: US2 — Scoped access
- [x] T005 [US2] فرض دور operator وقائمة GET/POST المسموحة بالخادم وإرجاع sections الآمنة، مع الحفاظ على دخول administrator السابق في lib/management-auth.ts والراوتر. (FR-007,008, SC-002)
- [x] T006 [US2] تحديث public/management/admin.js وadmin.css وindex.html للمدخل العربي وترشيح الأقسام والروابط المحظورة وتنظيف كلمة المرور، ومزامنتها إلى sabeq-admin-preview. (FR-007,009, SC-004)

## Phase 5: US3 — Provision and deliver
- [x] T007 [US3] توليد كلمات24محرفاً مختلفة للأسماء الخمسة وحفظ الاعتماد خارج المستودع، وتهيئة قيم الخادم السرية بعد تحقق الاختبارات. (FR-001–003, SC-003)
- [ ] T008 [US3] تشغيل الاختبارات والبناء وفحوص الخصوصية والنشر والتحقق الحي وتسليم ملف الاعتماد الخاص ورابط المركز؛ الأدلة في specs/054-control-users/validation.md. (FR-008–010, SC-001–004)

## Phase 6: Convergence
- [ ] T009 مراجعة spec/plan/tasks والكود والأدلة وإغلاق النواقص أو إضافتها دون خلط الفحص المحلي بالنشر في specs/054-control-users/analysis.md وvalidation.md. (FR-001–010)

## Dependencies and delivery
T001 → T002 → T003 → T004 → T005 → T006 → T007 → T008 → T009. البحث الأمني ووصف البيانات مستقلان وقد أُكملا؛ لا حاجة لوكلاء تنفيذ متزامنين على ملفات المصادقة نفسها. MVP دخول صحيح ودور محدد؛ التسليم يشمل كامل الطلب والخروج والإلغاء والخصوصية والنشر.
