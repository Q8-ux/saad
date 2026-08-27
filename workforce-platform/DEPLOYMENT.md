# Deployment prerequisites

1. Copy `.env.example` to `.env` and replace all secrets.
2. Provision PostgreSQL 17 or use the included Docker Compose service.
3. Run Prisma migrations and seed the initial administrator.
4. Configure `NEXT_PUBLIC_API_URL` to the public API URL.
5. Enable HTTPS and restrict CORS before production rollout.
6. Replace the demonstration credentials immediately.

## Email delivery

The API uses SMTP and does not place credentials in the repository. Configure these values in the API service environment before inviting users or sending email notifications:

- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_REQUIRE_TLS`
- `SMTP_USER`, `SMTP_PASSWORD` (both together; omit both only for an authenticated network relay)
- `EMAIL_FROM`, and optionally `EMAIL_REPLY_TO`
- `WEB_APP_URL` for activation and password-reset links
- `EMAIL_TOKEN_SECRET`, a separate random secret of at least 32 characters

For an existing Render Blueprint, values marked `sync: false` must be entered manually in the service environment; adding them to `render.yaml` does not populate an already-created service.

After deployment, an authenticated company administrator can check `GET /api/auth/email-status`. The response reports whether required configuration is present without exposing the SMTP host, username, password, or signing secret. It does not send a test message or prove inbox delivery.

## Local startup

```bash
cp .env.example .env
docker compose up --build
```

## Services

- Web: `http://localhost:3000`
- API: `http://localhost:4000/api`
- Swagger: `http://localhost:4000/docs`
