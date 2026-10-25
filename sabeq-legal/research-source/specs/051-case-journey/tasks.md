# مهام رحلة القضية والدفع

## Phase 1: التعرف الإجرائي
- [x] T001 [US1] تنفيذ واختبار استخراج الصفة والمحكمة في `lib/procedural-position.ts` و`tests/procedural-position.test.mjs`؛ FR-003/FR-005 وSC-001.
- [x] T002 [US1] ربط الاستنتاج بالمساعد والمستندات والإملاء والتحقق الخلفي في `lib/openai.ts`, `lib/memo-input.ts`, `app/api/legal/assistant/route.ts`؛ FR-004.

## Phase 2: التنقل والمراجعة
- [x] T003 [US2] ترتيب ثلاث مراحل وحفظ المسودة والمرفقات في `app/sabeq-site.tsx`, `app/memo-voice-input.tsx`, `lib/memo-journey.ts`؛ FR-001/FR-002/FR-005 وSC-002.

## Phase 3: الدفع
- [x] T004 [US3] نافذة سداد والتحقق من نفس الطلب في `app/memo-payment-dialog.tsx`, `lib/sadad-client.ts` و`tests/memo-journey.test.mjs`؛ FR-006 وSC-003.

## Phase 4: التحقق والنشر
- [x] T005 تشغيل الاختبارات وبوابة الإصدار وفحص العربية واللغات والرجوع في `tests/`, `tools/internal-verification/verify.py` و`app/globals.css`؛ FR-007 وSC-001/SC-002/SC-003.
- [ ] T006 نشر المصدر المطابق وعميل `sabeq-legal/` والتحقق من كل نشر وتوثيق حدوده في `verification.md`؛ FR-008 وSC-004.

## Dependencies and Strategy
T001 ثم T002؛ T003 وT004 يعيدان استخدام الوظائف القائمة؛ T005 قبل T006. لا أعمال لمشاريع أخرى ولا تفويض بحث قانوني خارجي. الفرصة المستقلة هي مراجعة اختبارات التعرف مقابل نافذة الدفع؛ تنفذ هنا بالتتابع على المصدر نفسه.
