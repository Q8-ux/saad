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
