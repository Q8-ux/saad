# Validation — 2026-10-17

- Live catalogue: seven judicial collections, 5108 PDF pages. The original bound legislation database contains 7787 article records and zero separate case records; its source and scope were not changed.
- Three complete judicial-digest principles were matched visually to the uploaded PDFs, including appeal identity, session date, chamber and printed/PDF pages. Other excerpts were not approved. A criminal-law sample could not be visually verified because of missing embedded fonts; a separate printed reference with contradictory years was excluded.
- 92 targeted tests passed across judicial retrieval, source identity, citation guards, actual-fact/issue analogy, memo plan, assistant handoff, agent generation, templates and legislation isolation.
- Full suite: 159 passed and six failures. All six failing test cases also fail on the pre-change 0d2aa0b source. Existing issues: missing VM dependencies in fast-tools/intake-latency/intake-stream, the Node renderer cannot import cloudflare: modules, and two obsolete voice-route memo fixtures. The newly introduced judgment module is recognized by the affected VM harness. This change does not claim that the complete pre-existing test suite is green.
- Worker build passed. GitHub client build passed. Private statute payload and reviewed judgment hashes/text were absent from both browser bundles.
- Engineering specification validation and git whitespace checks passed.
- No external legal search, official-case authenticity/current-authority verification, paid live model generation or physical-device browser test was performed. Source-page matching is not verification of the full judgments or current law.
- The original files, client-case archive and live legacy catalogue rows were not changed.

Publication is recorded by the pushed native source version and the code-only GitHub mirror. Server data and source excerpts must not be included in that public mirror.
