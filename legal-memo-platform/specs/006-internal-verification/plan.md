# Implementation Plan: التحقق الداخلي للإصدار

## Summary
استخدام النواة الحتمية الأصلية لـOMH 4.0.2، مثبتة بالالتزام cfb9625147ba20b35f59acbbe804afcb720013d1، كدفتر شروط تحقق حول الاختبارات الحالية. لا نثبت Hermes في Worker ولا نوصل نماذج أو نضيف واجهة.

## Technical Context
Python3.11+ وNode22 في بيئة البناء فقط. tools/internal-verification/verify.py مشترك بين الخلفية العامة والمصدر الخاص. Profiles ثابتة: site للمصادر والمذكرات والصلاحيات في المصدر الخاص؛ backend لاختبارات الخلفية؛ publication لحماية نشر Pages والحركة. يقرأ Python APIs الأصلية OmhPaths وgoal_ledger مباشرة؛ لا setup أو إعداد Hermes أو aliases.

كل تشغيل مستقل: بصمة مصدر قبل وبعد، subprocess بمهلة محدودة، فحص رمز الخروج وعدد اختبارات موجب وغياب التخطي. stdout/stderr في الذاكرة فقط. الأدلة والتقرير metadata في .verification المتجاهلة، دون المصدر الخام أو paths مطلقة. لا يستخدم نجاحاً سابقاً.

ربط build-verified.sh قبل vinext في المصدر الخاص؛ وفي GitHub ربط Validate Sabeq publication safety في deploy-pages.yml وإضافة workflow للخلفية. توسيع تصنيف نطاق نشر سابق ليقبل خلفية سابق وworkflow التحقق فقط، مع الحفاظ على حماية المواقع الأخرى.

## Constitution Check
لا مصادر أو قضايا أو API عملاء أو جداول تتغير. السريان القانوني يبقى غير معتمد. لا ينقل المصدر الخاص إلى GitHub. لا يدعى نجاح Hermes أو تحسن سرعة لم يقس.

## Phases
1. اختبارات الفشل والمهلة والتخطي والخصوصية وsmoke للأداة الأصلية.
2. runner مع معايير OMH وتقرير وبصمة مصدر وحدود وقت.
3. بناء الخادم وCI ونشر Pages بدون ملفات عرض.
4. اختبارات وبناء ونشر موثق مع فصل المحلي وCI والإنتاج.

## Data model
يرجى data-model.md؛ دليل التحقق quickstart.md. لا interfaces عامة أو migrations جديدة.
