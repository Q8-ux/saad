# Internal records

Run: schemaVersion, runId, sourceRevision, sourceFingerprint, profile, state running/failed/passed, engineVersion, checks. كل تشغيل مستقل.

Check: id ثابت، exitCode، durationMs، tests/pass/fail/skipped/cancelled/todo، outputSha256، passed، reason من رموز ثابتة. لا يسجل معيار done إلا بعد نجاح العملية وعدد الفحوص. التقرير الأحدث يكتب running قبل بدء التحقق وأي فشل يكتب failed.

لا نص خام أو paths مطلقة أو credentials. الادعاء فحوص إصدار محلية فقط، لا تشغيل Hermes أو صحة تشريع.
