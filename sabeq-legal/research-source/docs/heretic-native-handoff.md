# تسليم ربط Heretic إلى مصدر سابق الفعلي

بناء `legal-memo-platform` في Render لا يفعّل محرك موقع `www.sabeq.legal`؛ بحسب ملفات الواجهة الحالية، خدمة الموقع الرسمية قائمة على مصدر مستقل.

## نقطة التغيير
`lib/text-providers.ts` (واجهة OpenAI-compatible Chat Completions) ويستعمله `lib/openai.ts` في المساعد والتوليد؛ لا تُغيّر ملفات العميل `app/` أو مصادر التشريعات.

## إعداد تجريبي معزول فقط
```text
LEGAL_AI_PROVIDER=heretic
HERETIC_CHAT_COMPLETIONS_URL=https://GPU-HOST/v1/chat/completions
HERETIC_API_KEY=<secret only on server>
HERETIC_MODEL=heretic-9b-q4
```
لا تضع `LEGAL_AI_FALLBACK_PROVIDER=heretic` في إنتاج قائم دون مراجعة الخصوصية. لا تضع أسرار في صفحات GitHub.

## شروط النشر
1. نقل التغييرات من هذه المرآة إلى المصدر الأصلي المتصل بخدمة سابق، بعد مقارنة النسخ وعدم الكتابة فوق تعديلات أحدث.
2. تشغيل اختبارات المساعد والمذكرة ومطابقة المصدر القانوني على بيانات اصطناعية.
3. تجهيز مضيف GPU آمن بحسب `legal-memo-platform/inference/heretic/README.md`، مع DNS وTLS ومفتاح وحفظ السجلات دون بيانات قضايا.
4. اختبار HTTP 200 من صفحة الصحة يثبت التهيئة فقط، ثم إرسال طلب استدلال اصطناعي لتأكيد النتيجة.
5. عدم تشغيل Heretic على بيانات العملاء دون اختبار الخصوصية والدقة وموافقة المحامي.

## الحالة
المرآة على GitHub قابلة للاختبار؛ لم يتم تشغيل خدمة GPU ولا تحديث مصدر الخدمة الحي من داخل هذا المسار.
