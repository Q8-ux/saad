# Research

- Decision: النواة الأصلية offline دون setup أو تغيير aliases. Rationale: Cloudflare لا يشغل Hermes؛ لا حاجة لاستدعاءات نموذج لتشغيل اختبارات الإصدار. Alternative: خدمة وكلاء دائمة تضيف تعقيداً ولا تثبت الاختبارات.
- Decision: Python API الأصلية، لا CLI checkpoints. Rationale: راجع وكيل بحث مستقل الكود وأجرى smoke حقيقياً: CLI يرفض sparse/non-Git، بينما create_goal_ledger وrecord_goal_checkpoint وcomplete_goal_ledger تعمل مع OmhPaths دون Hermes.
- Decision: observed_tree يبقى فارغاً؛ بصمة المصدر الفعلية مسؤولية wrapper قبل وبعد الفحص. لا تختلق هوية native لم يلاحظها OMH.
- Decision: evidence-ref يسمي أمر Python الفعلي وبصمة receipt. لا ينسخ مخرجات الاختبار. OMH يتحقق من دفتر الأدلة، وwrapper وحده يثبت subprocess وعدد الفحوص.
- Observed: الاكتمال مرفوض أولاً وبعد شرط واحد من اثنين؛ مسموح بعد تسجيلهما. لا أُنشئ Hermes home أو أُجري model call.
