# Implementation Plan: مقابلة القضية واكتمال المذكرة

**Branch**: codex/sabeq-indirect-intake | **Date**: 2026-10-28 | **Spec**: [spec.md](spec.md)

## Summary
إعادة استعمال الاستنتاج الإجرائي والمقابلة الحالية، وإضافة بوابة اكتمال واحدة مشتركة للنقل. لا تغيير في الدفع أو المصادر أو قاعدة البيانات.

## Technical Context
TypeScript، React 19، Vinext، Cloudflare؛ اختبارات node:test بوقائع اصطناعية. مصدر الخدمة الكامل استُعيد من مستودعها المرتبط بعد إثبات نقص ملفات في مرآة GitHub. لا تبعيات جديدة ولا استدعاء نموذج ثانٍ.

## Constitution Check
حفظ مصادر الملف فقط، عدم اختلاق بيانات، مراجعة بشرية، وعدم نقل بيانات خاصة إلى المستودع. تم اجتياز بوابات التصميم قبل التنفيذ.

## Project Structure
- ../sabeq-legal/research-source/lib/procedural-position.ts: التخصص والدرجة والصفة المتسقة.
- lib/memo-handoff.ts: الحقول اللازمة وبوابة النقل والتعبئة الكاملة.
- lib/intake-readiness.ts: سؤال النقص الأول وترتيب مرحلة القضية والصفة وتحديث ذاكرة السؤال الفعلي.
- lib/openai.ts وlib/intake-context.ts: استخراج وحفظ حقول الصحيفة غير الحساسة من الحوار.
- app/api/legal/assistant/route.ts: حارس نهائي موحد للنص والصوت وحفظ السياق.
- app/sabeq-site.tsx: افتتاح واقعي ونقل بعد الاكتمال.
- tests/indirect-intake.test.mjs وtests/procedural-position.test.mjs وtests/connected-intake.test.mjs.

## Validation
اختبارات حدود الحقول والتعارض والتمييز بين إداري ابتدائي واستئنافي، وعدم اعتبار الوزارة وحدها تصنيفًا؛ بناء العميل والخادم والتحقق الداخلي. نشر الخدمة مع مرآة GitHub ونسخة Pages مع بيان نتائج كل طبقة.
