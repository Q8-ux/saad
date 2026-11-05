# Sabeq management password recovery

**State:** Source implemented; production is not enabled until the API Worker is
deployed, the D1 migration is applied, and outbound email is confirmed.

## How it works

The independent admin login at
https://q8-ux.github.io/saad/sabeq-admin-preview/ shows **نسيت كلمة المرور؟**.
A user enters a username. Every request gets the same public response.
If the username exists, is enabled, and has a server-approved recovery address,
the server sends a single-use, ten-minute reset link from the existing
Resend-based verification email service. The recovery link does **not** log
the user in or reveal the current password.

The new password is salted, HMAC-peppered, PBKDF2-hashed, and stored as an
encrypted management vault override. Changing the hash and sessionVersion
invalidates prior password-derived sessions.

## Mandatory deployment prerequisites

1. Deploy the **current** backend source to the Worker that actually handles
   `/api/management/password-login`; publishing GitHub Pages alone is insufficient.
2. Apply D1 migration
   `drizzle/0010_management_password_recovery.sql` to **the same production D1**.
   Verify the table exists before enabling the button for live users.
3. Confirm Resend's sender domain and configured outbound
   `RESEND_API_KEY` / `AUTH_FROM_EMAIL`, or saved verification-email settings.
4. Set a protected server-side configuration `MANAGEMENT_RECOVERY_EMAILS` as a
   JSON object mapping each immutable account ID to a controlled email, e.g.
   `{"administrator:saad":"owner@example.invalid","operator:ahmad":"operator@example.invalid"}`.
   These example addresses are **not** real configuration.
   The privileged `MANAGEMENT_OWNER_EMAIL` may recover administrator accounts
   when no per-account mapping is set, but never operator accounts.
5. Exercise a test account and confirm: no recipient enumeration, no email
   before configuration, one-time redemption, ten-minute expiry, password
   policy, old sessions invalidated, and live login with the new password.

## Security constraints

- Never put Resend keys, peppers, passwords or address mappings in GitHub Pages.
- Never email an existing password; never return a reset token to the browser
  that requests recovery. Token is sent solely to the pre-approved mailbox.
- No anonymous admin access is enabled.
- The API returns a generic acknowledgement on missing account or email delivery
  failure, to prevent account enumeration.
- If the provider cannot deliver emails, repair email delivery first; do not
  disclose or manually seed a recovery token in repository source.

## Endpoint contract

`POST /api/management/password-recovery-request`:
`{"username":"saad"}` -> generic acknowledgement.

`POST /api/management/password-recovery-confirm`:
`{"token":"<email-token>","newPassword":"<strong-secret>","confirmPassword":"<strong-secret>"}`
-> `{"ok":true}` only after single-use token verification and encrypted reset.

No mutation to prior memo requests, payment state, or legal evidence.
