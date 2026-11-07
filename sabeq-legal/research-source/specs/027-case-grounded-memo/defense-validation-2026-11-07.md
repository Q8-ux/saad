# Defense strength validation — 2026-11-07

## Baseline reproduced

- A stock defense passed when the auditor claimed addressed despite all reasoning excerpts being absent. The regression failed before the fix.
- Empty memorandum grounds were replaced by a stock reservation. The template regression failed before the fix.
- Language cleanup replaced a genuine source-decorated argument containing يقدم with a request to research law. The regression failed before exact-word request matching.
- Early research queries consumed the candidate budget. Retrieval now uses round-robin candidates and explicit statute-section search hints, subject to the existing applicability and citation checks.

## Verified software behavior

- Release checks passed: sources 34/34, memo 166/166, access 90/90. Dashboard checks and the Worker build also passed.
- The final targeted source/citation/audit regressions passed 61/61. A wider earlier run after reconciliation passed 79/79; these sets overlap and must not be added together.
- Council hooks and strict acceptance of addressed issues were retained. Actual excerpts in the finalized grounds must support the fact anchor, application, opposing argument and response. Generic prose and fabricated excerpts cannot authorize a successful defense.
- Planned statutory quotations remain mandatory where the selected source permits them. Recognizable OCR corruption is quarantined, never autocorrected into a legal quote.
- Paid citation-verification failures remain rejected. Unpaid source failures preserve only an explicitly incomplete factual draft. Neither gets a fabricated stock defense.
- Existing native archive exclusions and source metadata were preserved while reconciling the newer GitHub Council, statutory and reference-template safeguards.
- The optional secondary-review provider remains disabled by the unchanged environment; its code still requires explicit approval for case-data disclosure.

## Publication and route verification

- GitHub change: [PR 101](https://github.com/Q8-ux/saad/pull/101), merged at 8496eb68f2755c4eb169d4f8947914358c0b3854. Council, client-admin contract and REA checks passed for source head 9e654fc71faf5cddda5d9281c487099125ed199d.
- Existing production backend published successfully as version 196, source commit 4b73fa2cd1f31e71eb5a3ab90919f7eb4c0f27de.
- Deployment: appgdep_6aef5c341dd48191af3f876177652e0d. Runtime environment revision 24 was preserved.
- The live health response confirmed defenseRevision grounded-defenses-2, with the existing Gemini provider and gemini-3.5-flash model.
- www.sabeq.legal was inspected directly. Its existing embedded GitHub Pages Sabeq interface calls the current memo backend; no replacement domain or interface was created.
- Release checks ran on the working changes before the source helper committed them; the receipt fingerprint was edd25db6e10a2200990ea6d19e6199aad21319744ab6785c6a1dd6d0d1c42670. The source worktree was clean after packaging.

## Live acceptance remains pending

A synthetic case was prepared and submitted through the actual official-site memo wizard. The generation requests at 17:14:32 UTC and 17:16:08 UTC both returned HTTP 503. The first request has an explicit worker log: Gemini upstream rejected request, kind upstream, upstreamStatus 503. The second request also returned 503, but its complete upstream reason was not established from the bounded log read.

No completed memo was produced in these attempts. Live defense strength, live output completeness and a percentage improvement are therefore unverified. The implementation and production revision are verified; the live generation acceptance test is pending. No provider was silently switched and no payment was made.

## Legal and privacy boundaries

All test facts are synthetic. No client case, credential or private document was added to GitHub. No legal source was added, no provider enabled and no payment settings changed. Existing archived memos were not rewritten. The bound corpus does not establish a current consolidated law edition; the live health response still reports incomplete legislation coverage. Source identity checks and AI audit excerpts do not prove legal applicability or a court outcome. Unsupported sources and missing case documents remain review items.
