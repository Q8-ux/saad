# Plan
إعادة استعمال policy في lib/sadad-payments.ts وبيانات المبلغ المثبتة لكل محاولة. إضافة إعداد خادم مؤقت SABEQ_MEMO_TEST_ONE_KWD=true؛ يعيد policy سعر 1000 فلس بدل المحفوظ عندما يفعل، وبغير ذلك يحافظ على السعر المحفوظ. لا مخطط أو هجرة أو قاعدة جديدة. اختبار عبر harness سداد القائم، ثم نشر الخدمة وتفعيل الإعداد وقراءة GET /api/payments/sadad. السعر في قاعدة الإنتاج قبل التغيير 50000 فلس، payment_required=1، currency=KWD. مصادر API الرسمية أعيدت قراءتها في 28 أكتوبر: https://sadadpay.readme.io/reference/create-invoice .

Constitution check: لا أسرار في المصدر، لا وقائع إلى سداد، لا تغيير للمراجعة البشرية أو الدفع نفسه أو بقية المشاريع. النشر الحالي public يُحفظ.
