# Tasks: SADAD payments

## Phase 1: Setup
- [x] T001 فحص الفيديو ووثائق سداد والكود وتسجيل الحدود في research.md (FR-001).

## Phase 2: Foundation
- [x] T002 إضافة جدول D1 في drizzle/0006_sadad_payments.sql ومطابقة db/schema.ts؛ الفلس عدد صحيح موجب، العملة KWD (FR-002/003).
- [x] T003 تنفيذ lib/sadad-payments.ts وlib/memo-input.ts للمصادقة والتحقق المسبق والإنشاء مرة واحدة والتحقق والحجز والاسترجاع (FR-002/003/004/005/006).

## Phase 3: US1 — دفع المذكرة
- [x] T004 [US1] إضافة app/api/payments/sadad/route.ts وwebhook/route.ts وربط app/api/legal/memo/route.ts (FR-005/006).
- [x] T005 [US1] إضافة السعر ورابط الدفع والتحقق وإعادة المحاولة إلى app/sabeq-site.tsx وapp/globals.css (FR-008).
- [x] T006 [US1] حماية مدخل الخلفية الرسمية في legal-memo-platform/gateway.js وserver.js باحترام سياسة الدفع (FR-008).
- [x] T007 [US1] اختبار الحجز والمبلغ والمرجع والتكرار والتزامن والفشل والاسترجاع في tests/sadad-payments.test.mjs (SC-001/002/003).

## Phase 4: US2 — إدارة سداد
- [x] T008 [US2] ربط الإعداد والفحص والسجل في app/api/management/[...path]/route.ts وpublic/management/admin.js؛ اختبار الجلسة وعدم كشف الأسرار (FR-007/SC-004/005).

## Phase 5: US3 — المسار
- [x] T009 [US3] إكمال sadad-payments-path/SKILL.md ومراجعه وفحصه ثم حفظه عبر Git (FR-009).

## Phase 6: Delivery
- [ ] T010 تشغيل اختبارات الخدمة والإدارة وTypeScript وبناء Worker وGitHub؛ تسجيل الأدلة والنشر وحدود التفعيل في validation.md (FR-009).

## Dependencies
T002 → T003 → T004 → T005/T007/T008؛ T006 بعد عقد T004. T009 مستقل بعد البحث. T010 بعد اكتمال التنفيذ. لا تعديلات متزامنة على الملف نفسه.

## Independent acceptance
US1: فاتورة مدفوعة اصطناعية تولد مرة وتسترجع، والفشل يسمح بإعادة التوليد دون دفع. US2: المدير فقط يدير، ولا أسرار في الاستجابة. US3: مسار محفوظ قابل للاستدعاء لا يدّعي تفعيل أي مشروع بذاته.

## Phase 7: Remaining external deployment
- [ ] T011 نشر حماية الخادم الرسمي في Render بعد تحديد مساحة العمل؛ تأكيد تحديث واجهة www.sabeq.legal الخارجية دون ادعاء نشرها من GitHub وحده.
