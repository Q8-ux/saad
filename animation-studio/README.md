# مسار الرسوم المتحركة — SAAD Animation Studio

**المسار:** `animation-studio/` داخل [Q8-ux/saad](https://github.com/Q8-ux/saad/tree/main/animation-studio)

## ما يعمل في الإصدار الحالي
- لوحة تحكم عربية RTL للأفكار والسيناريو وتكوين مشاهد من فقرات النص وتعديلها.
- Canvas لتحريك نموذج مبسط وعرض نص المشاهد؛ تشغيل الخط الزمني، التقاط PNG، ومحاولة تسجيل WebM في المتصفحات الداعمة.
- رفع ملف صوت وتشغيله، تسجيل الميكروفون بإذن المتصفح، وقراءة نص عبر أصوات النظام إن توفرت.
- رفع خلفيات صور وضغطها محليًا؛ إدارة المراجع والبحث عبر صفحات نتائج أصلية.
- مسودة تسويق، مؤشرات CTR/CPC/ROAS محسوبة من أرقام يدخلها المستخدم.
- حفظ محلي في localStorage، واستيراد/تصدير JSON، وجدول مشاهد CSV، وأوصاف TXT.

## الأدوات المرشحة للتكامل (روابط انتقال لا API)
- [mromidev/claude-animated-shorts](https://github.com/mromidev/claude-animated-shorts) — Three.js + Remotion للشورتات العمودية. MIT؛ يلزم Node, Remotion, ffmpeg وتشغيل محلي/worker.
- [mromidev/claude-blender-skills](https://github.com/mromidev/claude-blender-skills) — Blender 3D، يحتاج Blender/GPU وقد يتطلب أصولًا مستقلة.
- [استوديو الفيديو](../ai-video-studio/)، [مسار صوتك](../voice-cloning-studio/)، [استوديو سعد](../saad-studio/)، [الإطارات](../frame-studio/)، [استوديو السيناريو](../saad-script-studio/)، [المترجم](../masar-translate-browser/)، [نمو تيك توك](../tiktok-growth/)، [يوتيوب](../youtube-studio-ai/)، [راصد الطلبات](../social-request-radar/)، [LongCat](../longcat-video/).

**مهم:** هذه تكاملات تنقل المستخدم إلى مشاريع موجودة فقط، ولا تعني تمرير الملفات بينها آليًا. ربط API الحقيقي لم ينفذ بعد. لا تُرفع أي ملفات المستخدم أو نصوصه من الواجهة إلى خادم في هذا الإصدار.

## المعمارية التالية
1. API محمي وQueue للمعالجة مع Jobs وWebhooks لكل مشروع.
2. تخزين أصول الفيديو والصوت بأذونات مناسبة مع قاعدة بيانات وصلاحيات مستخدمين.
3. Remotion Render Worker يدير مشاهد Three.js ويولّد MP4 وملصقات.
4. Blender Worker (معزول) يقبل manifests واضحة ولا ينفذ سكربتات غير موثوقة.
5. مزود TTS واختيار أصوات بتصاريح واضحة وتزامن subtitles وتوحيد loudness.
6. أدوات ترجمة وترجمة نصية وتصدير متعدد الأبعاد + تقويم محتوى وتحليلات منشورات حقيقة.

## احتياطات
- **GitHub Pages واجهة ثابتة**: لا يشغّل Blender أو ffmpeg ولا يخزن الأسرار بأمان.
- التقاط WebM ودعم مزج الصوت يعتمد على المتصفح؛ اختبر الملف الناتج قبل تسليمه.
- بيانات localStorage قابلة للفقد؛ صدّر JSON باستمرار. الصور قد تملأ المساحة.
- لا تنسخ أصول `references/` من مشاريع الغير للتوزيع قبل التحقق من حقوقها؛ توثيق أساليب الرسم ليس ترخيصًا لنسخ كل المراجع.
- النسخ الصوتي يجب أن يقتصر على صوت لديك حق استخدامه وموافقة صريحة عليه.
- تحقق يدويًا من صحة المصادر وحقوق الموسيقى والصور قبل النشر.

## الاختبار اليدوي
افتح `index.html` بمتصفح حديث أو من GitHub Pages: اكتب سيناريو → أنشئ مشاهد → عدّل زمنها → شغّل المعاينة → نزّل PNG وJSON وCSV → استورد JSON → سجّل ملف WebM إن دعمه المتصفح. تأكد من عدم ظهور أخطاء JavaScript.


## محرك تصيير MP4 الجديد (2026-11-09)

تمت إضافة `renderer/` بخادم Node ومعالجة مهام مستقلة، ومحرك Remotion لعمل فيديوهات 2D/موشن مبسطة، ومحرك Blender لمشاهد هندسية ثلاثية الأبعاد متحركة. يتم الاختيار آليًا: `cinematic` إلى Blender، وبقية الأنماط إلى Remotion؛ يمكن إجبار أحدهما من اللوحة. **هذه النماذج ليست إنتاج رسوم كرتونية احترافية كاملة من نص حر؛ لا توجد توليدات شخصيات أو مزامنة شفاه أو تعلّم توليدي هنا.**

### تشغيل محلي

```bash
cd animation-studio/renderer
npm install
export RENDER_API_KEY="replace-with-a-random-secret-at-least-24-characters"
export ALLOWED_ORIGIN="https://q8-ux.github.io"
npm start
```

- Remotion يحتاج Chromium/Chrome و FFmpeg. قد يحمل Remotion متصفحًا مناسبًا عند أول تشغيل.
- Blender يحتاج تثبيت برنامج Blender وتشغيله عبر `blender` أو تحديد `BLENDER_BIN`.
- يمكن تشغيل Docker باستخدام `docker build -t masar-renderer .` ثم `docker run -p 10000:10000 -e RENDER_API_KEY=... -e ALLOWED_ORIGIN=https://q8-ux.github.io masar-renderer`.
- عند تشغيل الخادم محليًا، ضع `http://localhost:10000` في حقل عنوان الخادم في الاستوديو. للمواقع العامة استخدم HTTPS.
- **لا تستخدم مفتاحًا مشتركًا واسع الصلاحيات لخدمة عامة مفتوحة**: خزّن المفتاح في أسرار الخادم، ودخل نسخة خاصة بالاستوديو في واجهة مقيدة المستخدمين. الكود الحالي نسخة أولية خاصة، وليست منصة SaaS متعددة المستخدمين.
- يتم تنظيف نتائج المهام بعد نحو ساعة؛ التنزيل قبل انتهاء المهلة. تضيع الطوابير عند إعادة تشغيل الخادم.

### API
- `GET /health` — معلومة صحة عامة لا تؤكد تشغيل Blender.
- `POST /api/render/jobs` — يقبل `{title,style,aspect,engine,scenes:[{title,visual,narration,duration,color}]}` ويعيد `202` ومعرّف المهمة.
- `GET /api/render/jobs/:id` — الحالة.
- `GET /api/render/jobs/:id/download` — MP4 عند اكتمال المهمة.
- جميع مسارات `/api/*` تتطلب الترويسة `X-Render-Key: <RENDER_API_KEY>`.
- حد المشروع: 40 مشهدًا، مدة كل مشهد 1–30 ثانية، ومجموع لا يتجاوز 300 ثانية.
- الرفع الحالي **نصي للمشاهد فقط**؛ الخلفيات والصوت المسجل في المتصفح لا تُرسل ولا تُركّب تلقائيًا على MP4.

### الفحص
```bash
cd animation-studio/renderer
node --check server.mjs
npm install
npm run render:sample
```
يوجد workflow `animation-renderer.yml` لفحص البناء وتجربة تصيير MP4 آليًا، لكن **نجاحه لم يتأكد بعد**. لا يُعد وجود المصدر دليلًا على وجود خادم منشور أو فيديو ناتج. 
