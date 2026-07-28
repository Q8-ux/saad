# Deployment prerequisites

1. Copy `.env.example` to `.env` and replace all secrets.
2. Provision PostgreSQL 17 or use the included Docker Compose service.
3. Run Prisma migrations and seed the initial administrator.
4. Configure `NEXT_PUBLIC_API_URL` to the public API URL.
5. Enable HTTPS and restrict CORS before production rollout.
6. Replace the demonstration credentials immediately.

## Local startup

```bash
cp .env.example .env
docker compose up --build
```

## Services

- Web: `http://localhost:3000`
- API: `http://localhost:4000/api`
- Swagger: `http://localhost:4000/docs`
