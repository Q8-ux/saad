# إعداد المدير الأول بأمان

لا توجد كلمة مرور افتراضية ولا يجوز لأي حساب جديد المطالبة بصلاحية المدير.

1. افتح صفحة /login/ وأنشئ حساب عمل ببريد تملكه وأكده.
2. افتح محرر SQL من صلاحية مالك قاعدة البيانات (لا من الموقع).
3. تحقق من هوية البريد ومن مطابقة user_id قبل أي تعديل:

```sql
SELECT id, email, email_confirmed_at FROM auth.users
WHERE lower(email) = lower('EMAIL_OF_OWNER');
```

4. بعد التحقق من ملكية البريد، نفذ من محرر مالك قاعدة البيانات فقط:

```sql
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'manager'::public.app_role FROM auth.users
WHERE lower(email)=lower('EMAIL_OF_OWNER') AND email_confirmed_at IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;
```

5. تأكد أن المدير الوحيد هو الحساب المحدد، ثم افتح /manager/ .
6. يستطيع المدير إضافة موظف مؤكد البريد فقط من لوحة الصلاحيات.

يُمنع تخزين كلمات مرور أو رموز service_role في المستودع العام.