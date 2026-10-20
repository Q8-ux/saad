# Payments contract
GET /api/payments/sadad: سياسة السعر والجاهزية العامة فقط.
POST /api/payments/sadad: attemptId UUID وpaymentToken عشوائي 43 حرفاً وinput بيانات المذكرة؛ لا يقبل سعراً من العميل. إعادة نفس المحاولة لا تنشئ فاتورة ثانية.
GET /api/payments/sadad?id=UUID: Bearer paymentToken؛ تحقق عبر سداد وحالة فقط.
POST /api/payments/sadad/webhook: مطابقة الفاتورة ثم تحقق API؛ 200 بعد المعالجة الآمنة، دون استحقاق مكرر.
POST /api/legal/memo: المدخلات الحالية مع paymentId/paymentToken؛ 402 للدفعة الناقصة، 409 للتزامن/تغير المدخلات، ونفس الناتج الخاص عند تكرار طلب مكتمل.
GET/POST /api/management/payments: جلسة المدير، إعداد وفحص وسياسة ومدفوعات؛ لا إعادة أسرار، ولا فاتورة أثناء فحص الاتصال.
