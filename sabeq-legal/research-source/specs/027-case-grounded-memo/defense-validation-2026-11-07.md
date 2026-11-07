# Defense strength validation — 2026-11-07

## Observed baseline and regressions

- On live source commit 079424cfe2b0eb61d0923737b29e6baeba967f68, an auditor claiming addressed passed even when all reasoning excerpts were absent from the stock defense. The new regression failed with true instead of false.
- Empty memorandum grounds were replaced with a stock reservation. The actual template regression failed before the renderer fix.
- A source-decorated defense paragraph containing يقدم was replaced by a request to research law; the cleanup regression failed before exact-word request matching.
- Retrieval originally flattened candidate sets, allowing earlier queries to consume the source budget. It now selects candidates round-robin, with explicit section names retained as research hints rather than proof of applicability.

## Verification recorded so far

- 79 targeted tests passed after reconciling existing GitHub review and statutory safeguards. These include defense excerpts, unsupported citations, paid/unpaid source failures, source text retention, template sequencing, role/relief consistency and Bolt memo transport.
- A subsequent additional guard prevents nonempty defense prose from passing when the audit identifies no addressed issue; the release suite includes its regression.
- The original release run passed source 34/34, memo 163/163 and access 90/90 plus the Worker build. It predates the reconciliation of the GitHub safeguards; a fresh release run is in progress and must pass before publication.
- The official domain was inspected: www.sabeq.legal embeds the current q8-ux GitHub Pages Sabeq UI. Its deployed client sends /api/legal/memo to the existing production Sabeq source. No domain or UI replacement is required.

## Boundaries

All fixtures are synthetic. No client case, credential or private document was added to GitHub. No legal research source was added, no provider was enabled, and no payment settings were changed. Citation checks and audit excerpts do not prove current amendments, legal applicability or a litigation outcome. Sources that cannot support an argument remain incomplete for counsel review. Publication and a live generation result are still pending at this point.
