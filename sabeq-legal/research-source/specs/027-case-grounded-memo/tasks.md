- [x] Shared general and conditional issue rules
- [x] Grounded plan + source/quote validation
- [x] Local/agent independent post-draft audit, bounded retry
- [x] Incomplete source/quality status in UI
- [x] Synthetic regression checks and existing safety checks
- [x] Build and publication report

## Defense strength repair — 2026-11-07
- [x] D-T01 Document observed bypass, stock fallback and audit gap before changing behavior (D1–D6).
- [x] D-T02 Add and run regression cases that fail on the original behavior (D3, D4).
- [x] D-T03 Implement grounded defense-excerpt checks and audit all output paths with one revision (D2, D3).
- [x] D-T04 Improve issue-specific retrieval coverage and preserve sourced reasoning during correction (D1, D2).
- [x] D-T05 Remove generic empty-ground output and expose revision/coverage outside the memo (D4, D5).
- [x] D-T08 Repair the demonstrated language-cleanup false positive and test source-decorated reasoning/quote preservation (D7).
- [x] D-T06 Run source, citation, memo, admin-link and release checks; record limits (D5, D6).
- [x] D-T07 Mirror reviewed changes to GitHub, publish the existing backend and verify the live revision (D6).

- [ ] D-T09 Confirm a completed live generated defense after the current generation-service failures are resolved. Two official-site test attempts returned 503; no live text-quality improvement is claimed.
