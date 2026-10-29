# Implementation Plan: ضبط توليد المذكرات

**Branch**: `067-memo-generation-control` | **Date**: 2026-10-30 | **Spec**: [spec.md](spec.md)

## Summary
شدّد المحقق المشترك القائم بدل إضافة مزوّد أو رحلة جديدة: احتفظ بهوية المادة كاملة، اربطها بالقانون الأقرب في موضع الإحالة، وافحص الاقتباس التشريعي الصريح من سجل المادة نفسه. أبقِ تصحيح النموذج المحدود وبوابة المراجعة الحالية قبل الأرشفة.

## Technical Context
TypeScript في خدمة Cloudflare Workers/Vinext القائمة. لا اعتماد جديد ولا ترحيل بيانات. اختبارات Node باستخدام template-harness الحالي. مصدر التنفيذ: خدمة سابق العامة الحالية؛ مرآة GitHub تحت sabeq-legal/research-source. الأداء: معالجة نصية محدودة دون شبكة إضافية أو استدعاء نموذج جديد.

## Constitution Check
مصدر الملف المغلق، الخصوصية، التحقق من السند، المراجعة البشرية، حدود المستودع، وعدم ادعاء النشر محفوظة قبل التصميم وبعده. لا تغيير في الهوية أو الوصول أو الدفع أو القوالب.

## Phase 0: Research
راجع [research.md](research.md). لا مجهولات تستدعي بحثًا قانونيًا خارجيًا أو قرارًا من المستخدم.

## Phase 1: Design
الإحالة والاقتباس في [data-model.md](data-model.md)، العقد في [contracts/citations.md](contracts/citations.md)، والتحقق في [quickstart.md](quickstart.md).

## Project Structure
- lib/legal-citation-review.ts: احتفظ بـ reviewLegalCitations وتوقعاته العامة، وأضف استخراج الهوية وربط القانون والتحقق من الاقتباس.
- app/api/legal/memo/route.ts وapp/api/health/route.ts: تعريف إصدارة ضبط مشتركة، دون تغيير مدخلات أو قرار الحفظ.
- tests/memo-generation-control.test.mjs: حالات انحدار مصطنعة؛ tests/agent-pipeline.test.mjs: بوابة المسار الفعلي.
- specs/067-memo-generation-control/: متطلبات وخطة ومهام ودليل نتائج.

## Boundaries and risks
الاقتباس الصريح يعني صيغة تنص/نصت المادة ... على «نص». لا تدّعِ أن مقارنة النصوص تتحقق من كل إعادة صياغة قانونية أو السريان أو الملاءمة. لا تغيّر المدخلات لتجاوز رفض الاستشهاد. احفظ metadata المراجعة خارج متن المذكرة. إعادة النشر تخص المصدر الحالي دون ترجيع النسخة إلى مرآة أقدم.
