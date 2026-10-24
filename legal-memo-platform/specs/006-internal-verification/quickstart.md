# Validation

ثبّت requirements.txt الخاص بالأداة في بيئة Python3.11+ مع Node22. من legal-memo-platform شغل python -m unittest discover -s tools/internal-verification -p 'test_*.py' -v ثم python tools/internal-verification/verify.py --profile backend.

من جذر المستودع شغل python legal-memo-platform/tools/internal-verification/verify.py --profile publication. المصدر الخاص يستعمل npm run verify:internal تلقائياً قبل build.

المتوقع تقرير metadata جديد تحت .verification ورمز خروج صفر فقط عند اجتياز جميع الشروط. فشل اصطناعي يجب أن يرفض الاكتمال رغم وجود تقرير نجاح قديم. لا يحتاج هذا المسار مفتاح API أو حساب عميل.
