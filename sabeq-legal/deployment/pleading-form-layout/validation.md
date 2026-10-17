# Validation — 2026-10-17

- Reused the approved claim (Letter) and appeal (A4) definitions and procedural clauses. No original-template objects, legal source files or production database rows were changed.
- Preview, text and native DOCX strip government-header metadata and the exact obsolete administrative captions, including legacy document records. Substantive ministry/court mentions in case text, identifiers and signature fields remain.
- First page: sidebar 17%, left page margin 340 twips (about 6 mm), previous top/right/bottom spacing retained. Continuations: no sidebar or page frame, zero section margins, Arabic right alignment.
- 30 focused tests passed: approved source persistence, template selection/ordering, generation guards, legacy presentation, long-text preservation, OOXML sections, localization and responsive generation controls.
- Both production exports rendered with the bundled LibreOffice renderer and the existing Al-Mohanad fonts. PDF font inspection confirmed AlMohanad. Every final rendered page was visually inspected: claim 2 pages, appeal 4 pages. Arabic shaping, physical right alignment, narrower left sidebar, first-page-only frame and plain continuation pages were checked.
- Worker build and GitHub client build passed. Browser-bundle private statute and judicial-data checks passed. Engineering specification validation and whitespace checks passed.
- Preserved the currently published assistant avatar inside the rounded memo-entry card and the removed lower hero heading. Native analytics and single assistant greeting remain intact.
- No browser/device or physical printer test was performed; the supported control-browser skill is unavailable. No paid live model generation was needed for this formatting change.

Publication receipts are recorded with the native saved source version and in the GitHub release metadata. Sample case files and rendered QA pages are temporary and excluded from Git.
