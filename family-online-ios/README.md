# استوديو الكتابة — iPhone وiPad

مشروع iOS أصلي بـSwiftUI وWKWebView، متصل بالمحرر نفسه على https://q8-ux.github.io/saad/family-online-studio/ . الحد الأدنى iOS/iPadOS 17.4. لا كلمة مرور إضافية، ولا نصوص مسرحية أو مفاتيح خادم داخل الحزمة.

الإصدار 1.0.0 اجتاز البناء واختبار تشغيل عربي أساسي على محاكي iPhone، وبُني أرشيف Release لمعالج arm64 باستخدام Xcode 16.4. [سجل البناء والتحقق](https://github.com/Q8-ux/saad/actions/runs/38748846285). نتائج التحقق وحدودها في [بيانات الإصدار](./downloads/release.json).

[تنزيل مشروع Xcode كاملًا — ZIP](https://github.com/Q8-ux/saad/raw/refs/heads/main/family-online-ios/downloads/writing-studio-ios-source-1.0.0.zip)

[تنزيل أرشيف iPhone غير موقّع للمطوّر — ليس ملف تثبيت](https://github.com/Q8-ux/saad/raw/refs/heads/main/family-online-ios/downloads/writing-studio-ios-unsigned.xcarchive.zip)

## الاستخدام الفوري

[صفحة التثبيت على الشاشة الرئيسية من Safari](https://q8-ux.github.io/saad/family-online-iphone/)

افتح الرابط في Safari، ثم «مشاركة» ← «إضافة إلى الشاشة الرئيسية» ← «إضافة». هذه نسخة ويب تُفتح في نافذة مستقلة، وتحتاج الإنترنت. تستخدم النسخة الحالية من المحرر، وتبقى المسودة والمساعد على الخادم نفسه. اختيارات الجهاز والمسودات المحلية قد تختلف بين Safari والتطبيق الأصلي؛ النص المحفوظ على الخادم هو المشترك.

## قدرات المشروع الأصلي

- إذن الميكروفون عند استخدام التسجيل، مع تقييد وصوله إلى صفحة المحرر الرئيسية ورفض الكاميرا.
- حفظ PDF وWord وJSON وTXT من أدوات المحرر عبر منتقي «الملفات»، واستيراد الملفات بأدوات WebKit.
- طباعة باستخدام واجهة طباعة iOS، وقراءة رد المساعد بأصوات النظام العربية المتاحة.
- إيقاف التسجيل والقراءة الصوتية عند مغادرة التطبيق، ومراعاة حواف الهاتف ولوحة المفاتيح.
- فحص مصدر كل رسالة من الصفحة، وحد 20 ميغابايت لكل تصدير، مع ملفات مؤقتة محمية وحذفها بعد انتهاء الحفظ.

## البناء

افتح `WritingStudio.xcodeproj` في Xcode، واختر scheme `WritingStudio`. يوجد مشروع مولّد حتميًا عبر `python3 tools/generate-project.py` دون تبعيات بناء خارجية. لا تغيّر المعرّف `com.saadrawdan.writingstudio` بعد أول إصدار موقّع.

يشغّل workflow `Build Family Writing iOS` فحوص المصدر، وسياسات الروابط وأسماء الملفات، وبروتوكول التصدير، واختبار تشغيل عربي على محاكي آيفون بصفحة اختبار محلية. ثم يبني archive **غير موقّع** للآيفون. لا يستدعي اختبار الواجهة المسودة الحقيقية ولا يعدّلها. لا تعادل هذه الفحوص تجربة الميكروفون والطباعة وحفظ الملفات على هاتف فعلي.

## حالة التوزيع

المشروع وأرشيف Xcode غير الموقّع ليسا ملف تثبيت للمستخدم. لم يُنشر التطبيق الأصلي على TestFlight أو App Store، ولا توجد شهادة Apple أو provisioning profile داخل المستودع أو Actions. توزيع النسخة الأصلية يتطلب حساب Apple Developer للمالك، وإعداد Team والتوقيع، ثم رفع build إلى App Store Connect. لا ترسل كلمة مرور Apple أو شهادتها إلى مستودع عام.

يمكن فتح المشروع في Xcode وتحديد فريق المالك لتوقيع Archive صالح للتوزيع. لا يلزم شراء اشتراك أو توقيع لاستخدام نسخة Safari.

مراجع Apple: https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios وhttps://developer.apple.com/documentation/xcode/distributing-your-app-for-beta-testing-and-releases
