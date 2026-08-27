# API summary

- `POST /api/auth/login`
- `GET /api/auth/users` — administrators only
- `POST /api/auth/invitations` — create an inactive account and email its activation link
- `POST /api/auth/invitations/resend` — administrators only
- `GET /api/auth/email-status` — readiness only; never returns SMTP secrets
- `POST /api/auth/request-activation` — generic public response
- `POST /api/auth/activate`
- `POST /api/auth/forgot-password` — generic public response
- `POST /api/auth/reset-password`
- `GET /api/employees`
- `POST /api/employees`
- `GET /api/attendance`
- `POST /api/attendance/punch`
- `GET /api/notifications`
- `POST /api/notifications` — `EMAIL` is delivered immediately and recorded as `SENT`, `PARTIAL`, or `FAILED`
- `POST /api/notifications/:id/retry` — retry a failed email notification

Authenticated endpoints require `Authorization: Bearer <token>`.

Passwords are never emailed. Activation and reset emails contain signed, expiring links generated with `EMAIL_TOKEN_SECRET`.
