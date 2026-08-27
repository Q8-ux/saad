# Security baseline

- Never commit `.env` files or production secrets.
- Rotate the demonstration password before any shared deployment.
- Restrict CORS to approved origins.
- Require HTTPS, strong JWT secrets and database TLS in production.
- Add audit logs, role enforcement, rate limiting and MFA before enterprise use.
- Treat GPS, device identifiers and future biometric data as sensitive personal data.
- Keep `EMAIL_TOKEN_SECRET` separate from `JWT_SECRET` and rotate both through the hosting secret store.
- By default, activation links expire after 24 hours and password-reset links after 30 minutes; both become invalid after the relevant password change.
- Password-recovery and public activation-request responses are intentionally generic to reduce account enumeration.
- Configure SPF, DKIM and DMARC for the address used by `EMAIL_FROM` before production email delivery.
