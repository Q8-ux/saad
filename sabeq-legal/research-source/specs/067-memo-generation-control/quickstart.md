# Validation

بعد تثبيت الاعتمادات القائمة:

```bash
node --test tests/memo-generation-control.test.mjs
node --test tests/official-legislation.test.mjs tests/bound-legislation.test.mjs tests/inline-authorities.test.mjs tests/case-reasoning.test.mjs tests/agent-pipeline.test.mjs tests/memo-journey.test.mjs tests/prepare-memo-route.test.mjs
npm run build
```

قبل تعديل المحقق، شغّل ملف الانحدار الجديد واحتفظ بعدد الإخفاقات وأسبابها؛ بعد الإصلاح يجب أن يمر دون تخفيف التوقعات. تستعمل الأمثلة الجديدة قوانين ونصوصًا مصطنعة معلنة. الاختبارات القانونية القائمة تستعمل مصادر المشروع المعتمدة وحدودها.

بعد النشر افحص GET /api/health وتحقق من memoControlRevision. هذا دليل وصول الشيفرة للخدمة؛ لا يثبت توليد نموذج حي أو خصمًا ماليًا أو اعتماد محامٍ.
