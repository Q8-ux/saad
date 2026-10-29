# خطة سياق القضية وفحوص الإدارة

## Technical Context
TypeScript وVinext/Cloudflare؛ اختبارات Node بمزود محاكى. المصدر الحالي هو مستودع الموقع عند 5af865312c6f924c66db518a485d140487deb008. لا تبعيات أو جداول أو نماذج إضافية.

## Constitution Check
فصل الواقعة والتشريع والتحليل؛ الملفات والمفاتيح تبقى في الخلفية؛ لا تغيير للدفع أو الصلاحيات أو هوية الموقع؛ لا مصدر قانوني خارجي احتياطي.

## Research Decisions
إعادة استخدام cleanIntakeContext وحدود assistant-input وquestionMemory، وإضافة سجل مصادر حتمي داخل الاستدعاء نفسه. استخدام الاختبارات السلوكية القائمة للإدارة بدلاً من فحص وجود ملفات فقط. البديل المرفوض: ذاكرة عامة تخلط القضايا أو وكيل shell من المتصفح.

## Structure and Phases
1. lib/project-context.ts: مصادر الرسائل، التصحيح الأحدث، وسم النسخة، فصل النقص والتحليل.
2. lib/openai.ts وapp/api/legal/memo/route.ts: تضمين سياسة السياق في مساري المقابلة والصياغة دون إخراجها في المذكرة.
3. tests/project-context.test.mjs: عزل القضايا، أولوية التصحيح، النص الطويل وعدم اختلاق مصدر؛ اختبارات الإدارة القائمة وفحوص الجودة من المستودع.
4. lib/engineering-paths.ts: تعريف توفر المسارين مع حدود التحقق.
5. البناء والنشر من المصدر الحالي، ثم مزامنة الملفات المتعلقة فقط إلى مرآة GitHub.

## Validation
node --test tests/project-context.test.mjs tests/connected-intake.test.mjs tests/indirect-intake.test.mjs tests/assistant-long-input.test.mjs tests/management.test.mjs tests/management-source-connection.test.mjs tests/programmer-client.test.mjs
بناء المصدر؛ لا اختبار توليد مدفوع أو تحصيل أو كتابة قضية حقيقية.
