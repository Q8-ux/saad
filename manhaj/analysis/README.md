# Teacher assistant and curriculum analysis

The floating Arabic assistant guides teachers through existing project, plan, lesson, meeting and task forms. It previews every new record and writes through the existing validated local persistence only after explicit approval. It routes to design, evidence, calendar, reports, resources and settings. Closing the assistant does not close or hide the current site view. Microphone input uses optional browser SpeechRecognition; its processing may use the browser provider's speech service.

This release has no LLM provider, API calls, model-generated educational advice, semantic search, or shared cloud teacher database. Assistant evidence search uses the document selected in analysis, or the last five locally added documents. Lexical excerpts show document title and page number. Record analysis checks field completeness and simple measurable verbs; teachers approve educational conclusions.

Public curriculum metadata comes from Ministry public APIs and the computer library. `collect_curricula.py` reads the search-year parameter from the official website script; it does not infer a current academic year or book edition from upload timestamps. Coverage is limited to public general education and the computer catalogue. Errors are recorded and previous records retained. Book contents are not mirrored. The SQLite metadata database has structured filters and a metadata FTS index.

PDF.js 5.6.205 is installed by the publishing workflow and served from the same site. PDF/TXT/Markdown extracted text is stored in IndexedDB on the teacher's device, separate from the public metadata database. Scanned PDFs require OCR, which is not implemented. Local extracted-document backup is separate from the teacher workspace backup; original PDF files are retained for new uploads and read by the local reader.

Checks: `node manhaj/analysis/check.cjs`. Local DOM integration check requires jsdom and fake-indexeddb at the paths used by `ui-check.cjs`; it verifies route initialization, isolated close/reopen, preview-before-save, duplicate prevention and catalogue preservation after saving.

## Curriculum source audit

Official sources: Ministry student library, official computer catalogue, and NationalStandards metadata API. `collect_standards.py` stores titles, stages and source links; no PDF text is copied. After collecting books, run `audit_curricula.py` to add catalogue coverage, unknown edition counts, and standards metadata to the JSON and SQLite database. SQLite contains `catalogue_audit`, `curriculum_verification` and `national_standards` in addition to the existing catalogue and FTS tables. The page shows a searchable standards list, coverage table and downloadable report.

Official catalogue presence is not verification of approval for 2026/2027. The search API's year parameter must not be treated as a textbook edition or academic year. Book contents and objectives have not been imported or analysed. Ministry notice: https://www2.moe.edu.kw/news/GetNewsDetail?NewsId=910. An appropriate permission or licensed corpus is needed for any public text analysis/republication feature. Private documents remain in the existing local document workflow.

Checks: `node manhaj/analysis/audit-check.cjs` and full DOM check, which also verifies standards search, coverage rows and preservation of teacher records.
