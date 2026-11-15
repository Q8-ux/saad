# مسار صناعة السيناريو والدراما | Screenplay & Drama Engine

A reusable, Arabic-first architecture and curated integration registry for writing TV series, screenplays, dialogue, continuity, screenplay formatting and production breakdown.

**Status:** Architecture and integration registry. External tools are NOT installed or operational merely by being listed here.

## Pipeline
1. Concept, logline and premise (Dramatron)
2. Story bible, season arcs, episode outlines (AI Screenplay Writer)
3. Character profiles, motivation, arcs and relationships
4. Scene beats, conflict, dialogue, subtext, final lines
5. Continuity and evidence-backed recall across episodes (ScriptRAG)
6. Critical review: causality, pacing, contradictions, redundant scenes
7. Arabic RTL screenplay editor, Fountain/FDX import/export, PDF pagination
8. Production breakdown, shot planning, table reads and storyboards

## مسار الكتابة

### من المشكلة إلى قرار البطل

1. افتتح بصورة أو فعل يعرّف وضع البطل. حدّد الثيمة من المشكلة التي يعيشها والشعور أو العلاقة أو الخطر أو الضغط المالي الذي يختبره.
2. أسّس العالم بعلاقات تؤثر في القرار. عرّف من يساند البطل، ومن يضغط عليه، وكيف يمكن لكل علاقة أن تغير تكلفة ما يريد.
3. اجعل الحدث المحرّك يبدّل ما يستطيع البطل فعله اليوم. امنح التردّد وظيفة درامية وأظهر الخيارين وعاقبتهما، حتى يصبح الانتقال إلى المرحلة التالية نتيجة قرار واضح.
4. بعد الانتقال، اربط الحبكة الثانوية بخيار البطل أو عاقبته. مثال عملي: تتعارض مسؤولية البطل عن رعاية أحد أفراد عائلته مع الوقت الذي يحتاجه لحل المشكلة الأساسية.

### طول العمل والإيقاع

المفصل وظيفة درامية. قد تمتد صورته أو ثيمته إلى أكثر من صفحة أو مشهد. وردت في شرح الكاتب ثلاث صفحات للافتتاح وست إلى سبع صفحات لطرح الثيمة بوصفها أمثلة مرنة. يمكن أن تحمل المفاصل الخمسة الأولى الفصل الافتتاحي، ثم يبدأ الانتقال بقرار البطل. في المسلسل، ضع قفلات الفصول بحسب شبكة العرض إذا كانت الحلقة موزعة على فواصل إعلانية.

في المسرحية القصيرة، يمكن جمع مفصلين متقاربين من منطقة التصاعد، ومنها المفاصل السادس إلى الثاني عشر، داخل مشهد واحد عندما تؤدي أفعاله الوظيفتين. طول المسرحية وعدد فصولها يتبعان المادة. على منحنى فريتاغ، راجع التأسيس والتصاعد والذروة وأثر الذروة والحل. استعمله لرؤية حركة التوتر عبر العمل واستعمل المفاصل لتحديد فعل المشهد ونتيجته.

في الرواية، تُوزع التحولات بحسب وظائف فصولها وشخصياتها. في الكتاب المعرفي، عالج سؤال الفصل والدليل والمثال والنتيجة. استخدم المفاصل عندما يخدمها بناء سردي، مثل قصة داخل فصل أو مثال ممتد.

### أداة الكتابة

**WriterSolo** محرر مستقل من WriterDuet. يوجد في قائمة استوديو الكتابة للمسلسلات والمسرحيات والكتب. يتيح الاستوديو تنزيل FDX للعمل الدرامي أو TXT للكتاب، ومعاينة مسودة عائدة للمراجعة. [دليل الاستخدام داخل الاستوديو](../family-online-studio/docs/writer-solo.md).

- [المفاصل الخمسة عشر في Save the Cat](https://savethecat.com/get-started)
- [Gustav Freytag، Technique of the Drama](https://openlibrary.org/works/OL10505065W/Freytag%27s_Technique_of_the_drama)
- [WriterSolo](https://writersolo.com/)

## Source registry
These are upstream references, NOT vendored code. Validate actual repo availability, license, maintenance, APIs and security before adopting.

| Role | Repository |
|---|---|
| Multi-agent TV screenplay | https://github.com/E-Asrar-Haghighi/ai-screenplay-writer |
| Hierarchical story generation | https://github.com/google-deepmind/dramatron |
| Script retrieval / continuity | https://github.com/trieloff/scriptrag |
| Screenwriting agent skills | https://github.com/jtydhr88/screenwriting-skills |
| Arabic AI cinema exploration | https://github.com/Mossab82/AI-Cinema |
| Collaborative screenplay editor | https://github.com/alextheradu/scripty |
| Browser Fountain editor | https://github.com/Rooftop-Pictures/fountain-editor |
| FDX/Fountain utilities | https://github.com/wildwinter/screenplay-tools |
| Fountain parser | https://github.com/animoralabs/screenplay-fountain |
| Obsidian Fountain editor | https://github.com/bgrundmann/obsidian-fountain |
| Fountain implementation | https://github.com/nyousefi/Fountain |
| Production breakdown | https://github.com/wassermanproductions/scriptbreak |
| Cinematic analysis / table read | https://github.com/kirklasalle/CineMatrix |
| Shot planning | https://github.com/koosoli/OpenShotDesigner |
| Preproduction | https://github.com/kazim-45/openframe |
| Storyboards | https://github.com/zetagao/frameline |
| Shot list from Fountain | https://github.com/Obrais-cloud/shotcall |
| Production planning | https://github.com/vlakula/rebelshot |
| Short drama reference catalog | https://github.com/PAMPAS-Lab/awesome-ai-short-drama |

## Writer approval gates
- Never silently change canon, character deaths, scene outcomes or dialogue.
- Proposed rewrites must include rationale and before/after diffs.
- Canon must be versioned by project, season, episode and scene.
- Flag contradictions with evidence; do not invent missing plot facts.
- Treat external scripts as reference material, not copyable training or output assets.

## Arabic release gate
- Fully connected Arabic glyphs; no reversed character order.
- RTL dialogue and scene headings with mixed English, digits and punctuation.
- Fonts embedded where licensing permits.
- PDF and FDX export tested with Arabic and mixed-language samples.
- Episode starts on a new page; scene starts do not force page breaks.
- Avoid orphan lines, blank lower halves and oversized gaps.
- Compare page counts, margins and scene order against approved reference.

## Architecture boundary
- GitHub hosts source/configuration, not secrets or private scripts.
- Backend is required for AI model calls, secure uploads, indexing and project permissions.
- No external source code is imported until license/security review.
- Use adapters per upstream; avoid tight coupling.
- CI must run unit, formatting, security and Arabic export regression tests.

## Implementation backlog
- [ ] Validate each upstream URL, license, maintenance and supported runtime.
- [ ] Define canonical schema: Project > Season > Episode > Scene > Beat > Dialogue.
- [ ] Implement structured story bible with provenance and versioning.
- [ ] Implement continuity retrieval with cited scene references.
- [ ] Build dialogue reviewer including subtext and last-line impact.
- [ ] Build Arabic-first Fountain/FDX parser and export test fixtures.
- [ ] Add scene and episode pagination regression suite.
- [ ] Add permissions, cost budgets, audit trail and author approvals.
- [ ] Run end-to-end pilot on one authorized screenplay episode.

## Integration policy
Start with adapters for AI Screenplay Writer, ScriptRAG, Screenwriting Skills, Scripty and ScriptBreak. Expand only after measurable quality and compatibility tests.

## Definition of done
One episode can be imported, analyzed, reviewed without modifying canon, edited in RTL, exported to PDF/FDX and reimported with scene order, dialogue, and pagination validated. 
