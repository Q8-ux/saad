# Data model
- ProceduralPosition: originalRole, partyRole, level, court, courtCircuit, specialization, evidence, conflict, needsActor. غياب الدليل ينتج unknown أو قيمة فارغة.
- memoFields: نصوص حقول الصحيفة الموجودة، باستثناء civilId، مع caseNumber. لا مفاتيح خارج القائمة، ولا أرقام مختلقة.
- Readiness gap: key + question بلغات الواجهة. الفجوات تعتمد على المرحلة ونوع المخرج. النقص أو التعارض يلغي handoffReady حتى مع readyForMemo=true من النموذج.
