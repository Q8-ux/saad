# Validation guide

1. Run node --test tests/management.test.mjs from the native source with synthetic configuration only. Check all five usernames, distinct credentials, denial of swapped passwords, route permissions, logout, expiry/revocation, throttling and preserved identity sign-in.
2. Preview /management/ using the supported preview daemon. Inspect the username/password form at desktop and mobile widths. Never put real credentials in screenshots or source fixtures.
3. Build through the supported Sites helper and static build, run privacy check and scoped publication checks.
4. Configure the five actual records and pepper through secret runtime variables; deploy the saved source with that environment revision. Do not publish those values.
5. Attempt live login/session/logout with redacted output; inspect the live public sign-in form. Record any hosting/automation boundary rather than bypassing it.
6. Deliver only the official GitHub control-center link and the private credential file; this guide contains no real credential.
