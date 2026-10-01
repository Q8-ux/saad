# Scoped Sabeq Pages deployment

On 2026-10-01 release run 36834575670 and preceding run 36789802109 both stopped at `Validate Tamweenat assistant`; the Sabeq client bundle was never uploaded or deployed. No Tamweenat source or test is changed by this repair.

For a push containing only `sabeq-legal/` and optionally the Pages workflow itself, restore the artifact from the latest successful Pages deployment and replace only its Sabeq directory. Compare SHA-256 for every other published file before upload. The ordinary full-build tests remain in place for other or mixed project changes and manual full deployment. A missing/expired latest artifact fails closed; an older artifact must not silently roll back another project. Retain successful artifacts for 30 days.

Before publishing, validate the referenced client asset and source commit manifest. Publish `sabeq-legal/deployment.json` with triggering commit, source commit, base run and preserved-file manifest hash. The actual deploy step remains separate from validation. Deployment scripts are excluded from the scoped public output.

Tests: `python sabeq-legal/deployment/test_release.py` covers refusal of changed unrelated files, absent client assets, unsafe tar paths and mixed-project scope. Synthetic files only.

Current legal release: native source 967bcab384cd5a07a38cf2cf28def9c8210a61d0 (v80); PR48 contains the validated client. Legal-feature tests: 50 passed. Hosted dictation/intake/memo smoke results and OCR/source limitations are recorded in PR48. Live MOJ synchronization, official-domain deployment and physical microphone QA are not claimed.

Rollback: restore Sabeq index/release manifest from the pre-PR48 main commit 6b975ecf25159bc4d5da8e9781c02fb67a4f6a72 using a new scoped commit; index-0JNQEr-Y.js remains retained. Backend can return to saved native v78/source a730d2a0891bdaffc8f74e444ccff23a7a3c2dbe. Do not restore the entire old Pages artifact as a rollback for just Sabeq.
