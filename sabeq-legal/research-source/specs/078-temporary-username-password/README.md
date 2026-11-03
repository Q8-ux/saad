# Temporary username/password sign-in — Sabeq

User request: replace email-code sign-in for public accounts temporarily with administrator-provisioned usernames and passwords; leave staff/management authentication unchanged.

- New `public_user_credentials` table holds normalized unique usernames and PBKDF2-SHA256 salted hashes. Passwords are never stored or returned as plaintext.
- Existing `public_users` and memo/service records remain intact. Previously created users must receive credentials through management; no automatic default passwords.
- Administration creates and resets public credentials using the current authenticated user management endpoint. This must not grant access to the independent admin login.
- Public sign-in uses `POST /api/auth/password-login` and the existing 30-day bearer-session contract. Login requests have a per-client rate limit and generic failure messages.
- Legacy email OTP routes are explicitly disabled only **after** the new endpoint and client are deployed and verified. Production rollout requires applying the D1 migration and releasing the Cloudflare backend and rebuilt GitHub Pages frontend in that order.
- The internal `@accounts.sabeq.invalid` address is a non-deliverable legacy-schema placeholder, never a recipient or verification target. Keep all confidential user information on the server.
- Existing real email addresses remain contact metadata but are not required to create newly provisioned public accounts.
- Rollback: restore prior frontend and OTP routes only under a controlled backend release, keeping the credentials table and legal records. Do not delete user accounts.
- Do **not** interpret merging GitHub mirror sources as a production deployment.
