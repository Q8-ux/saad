# QR / Barcode delivery confirmation — Tamweenat

## الهدف
كل فاتورة/طلب مُصدّر يحمل QR فريدًا. موظف المطعم يمسحه من داخل تطبيق تموينات لتأكيد استلام الطلبية.

## تدفق العمل
1. عند إنشاء/تصدير الفاتورة يولد الخادم `receipt_token` عشوائيًا مرتبطًا بالطلب والمطعم.
2. الـ QR يحتوي رابطًا قصيرًا من نطاق تموينات فقط، ولا يحتوي السعر أو بيانات العميل الحساسة.
3. قارئ الكاميرا داخل حساب المطعم يقرأ الرمز.
4. الخادم يتحقق أن المستخدم المسجل يتبع نفس المطعم وأن الرمز صالح ولم يُستخدم.
5. تظهر شاشة مراجعة: رقم الطلب، الفاتورة، عدد الأصناف، القيمة، وقت التسليم.
6. يضغط المستخدم «تأكيد الاستلام».
7. يسجل النظام `received_at` و`received_by` ويغيّر حالة الطلب إلى `delivered`.
8. الرمز يصبح غير قابل لإعادة تأكيد الاستلام، وتظهر العملية في سجل الإدارة.

## قاعدة البيانات المطلوبة
```sql
alter table public.orders add column if not exists receipt_token text unique;
alter table public.orders add column if not exists received_at timestamptz;
alter table public.orders add column if not exists received_by text;
alter table public.orders add column if not exists receipt_confirmed boolean not null default false;
create index if not exists orders_receipt_token_idx on public.orders(receipt_token);
```

## API
- `POST /api/admin/orders/:id/receipt-token` — إصدار/تدوير رمز الاستلام.
- `GET /api/receipts/:token` — معاينة آمنة للمطعم المسجل.
- `POST /api/receipts/:token/confirm` — تأكيد الاستلام مرة واحدة.

## الأمان
لا نعتمد مجرد فتح رابط QR كتأكيد. التأكيد يحتاج جلسة مطعم صالحة + مطابقة restaurant_id + ضغطة تأكيد صريحة.
