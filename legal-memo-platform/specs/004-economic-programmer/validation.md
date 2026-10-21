# Verified rollout — 21 October 2026

- Hosted backend version 131 deployed successfully from native source f811ae3f2c5fc4b80d4030deb9affe62fa57f9a8.
- Feature merged in https://github.com/Q8-ux/saad/pull/65 . Publication guard fix merged in https://github.com/Q8-ux/saad/pull/66 .
- Scoped Pages deployment succeeded: https://github.com/Q8-ux/saad/actions/runs/39668567423 . It restored the previous published artifact and checked preservation of unrelated project files.
- Management/payment tests: 46 passed. Programmer client tests: 3 passed. Publication tests: 6 passed, including the actual shipped admin client. Motion regressions: 5 passed. Production Vinext build passed. No new dependencies.
- UI checked with real shipped scripts and explicitly synthetic local API fixtures at frame widths 1440/768/390/320; measured content widths matched viewport widths 1425/753/375/305. Trial display and explicit follow-up save exercised. Synthetic browser responses do not prove provider inference.
- Live service access confirmed the new programmer.js script (HTTP 200) and the protected management endpoint (HTTP 401 without a manager session). Existing project provider configuration is present; no secret values were printed or copied.
- Full tsc remains blocked by existing Cloudflare ambient types and unrelated legal/CSS diagnostics. No unrelated legal code was changed to silence them.
- Runtime limits: no independent FCC service URL/token was supplied or deployed. This release installs its server-side adapter and admin controls, not a public FCC code-execution harness. The existing project provider is a separate explicit billed option. Authenticated live inference still needs a signed-in administrator trial; it was not reported as passed.
- Test entrypoint: https://q8-ux.github.io/saad/sabeq-admin-preview/#programmer . Select and save the source, then run the synthetic amount-calculation trial.
