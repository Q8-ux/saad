# Shatranj Game — شطرنج النخبة

نسخة اللعبة المهيأة للعمل على GitHub Pages مع Supabase.

## المزايا

- تسجيل حساب ودخول حقيقي عبر Supabase Auth.
- ملف مستخدم وتقييم ابتدائي.
- غرف خاصة برمز من 6 خانات.
- جاهزية اللاعبين وبدء الغرفة.
- تحديث الغرف والنقلات عبر Supabase Realtime.
- حفظ سجل المباريات والهستري لكل مستخدم.
- سياسات RLS لحماية بيانات المستخدمين.
- قابلة للنشر من GitHub Pages.

## الإعداد

1. أنشئ مشروعًا في Supabase.
2. افتح SQL Editor وشغّل ملف `supabase-schema.sql`.
3. من Supabase افتح **Project Settings → API**.
4. انسخ Project URL وanon public key إلى `config.js`.
5. من Authentication:
   - عطّل Confirm email للتجربة السريعة، أو استخدم بريدًا حقيقيًا.
   - أضف رابط GitHub Pages ضمن Site URL وRedirect URLs.
6. من GitHub افتح Settings → Pages واختر النشر من فرع `main` والمجلد `/shatranj-game`.

## تنبيه أمني

لا تضع مفتاح `service_role` في GitHub أو داخل الواجهة. استخدم فقط `anon public key`.
