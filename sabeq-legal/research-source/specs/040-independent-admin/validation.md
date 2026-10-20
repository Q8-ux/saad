# Validation — 20 October 2026

- 68 relevant backend/client regression cases passed, including 10 management boundary tests using actual SQLite migrations and the real route modules.
- The official backend suite passed 24 cases, including three new signed-bridge and lifecycle tests.
- Four scoped publication safety tests passed.
- Production Worker build passed. JavaScript syntax checks passed.
- Full repository TypeScript checking still reports pre-existing Cloudflare runtime type configuration and legacy legal-source typing errors; no new management logic type error remained after the focused check.
- Two older voice/tool test harnesses do not cover the current case-plan/source contracts and fail on the unchanged baseline. They were not rewritten as part of this feature.
- Browser screenshots and interaction QA were unavailable because the managed control-browser capability is not exposed. No substitute browser path was used.
- Live office-number linking, mail-provider credentials, client email delivery, and customer messages were not exercised.
- Publication and live verification remain pending at packaging time.

## Login correction — 20 October 2026
- The original native backend v124 and independent GitHub client were published successfully. Live HTML and JavaScript matched the source, CORS preflight returned 204 and anonymous management data access returned 401.
- Production logs show repeated mobile login requests carrying platform identity headers, returning 302 without a subsequent exchange call. Header values are redacted; the logs do not establish which email was used or which redirect destination was returned.
- Route login now reads identity from the incoming Request. The verified Site owner's email is configured in a separate secret setting; the existing allowlist is preserved. Repeated missing-identity redirects are bounded, and the client offers explicit account switching.
- 12 management tests passed using actual SQLite migrations, including a complete login/exchange/session/logout, a conflicting render identity, owner revocation and a simulated execution of the shipped client through the real management routes. No production identity or credentials are used in the tests.
- Four scoped publication tests passed, including bounded versioned script URLs and rejection of substituted script paths. Production Worker build and JavaScript syntax checks passed.
- Authenticated login from the user's phone is not yet verified. A valid production platform session is not available to the test runner; a 200 public login page alone is not treated as proof of authenticated access. Publication of this correction is pending at packaging time.
