# Workforce & Safety Platform — Starter MVP

Production-oriented starter for:
- Multi-company users
- JWT authentication
- Email account activation and password recovery
- SMTP-backed system notifications with delivery status, retry and stale-attempt recovery
- Employees
- Attendance check-in/check-out with GPS
- Audit-ready PostgreSQL schema
- Arabic-first dashboard

## Stack
- Next.js 16
- NestJS 11
- Prisma ORM 6
- PostgreSQL 17
- Node.js 24 LTS

## Start
1. Copy `.env.example` to `.env`.
2. Run `docker compose up --build`.
3. API: http://localhost:4000/api
4. Swagger: http://localhost:4000/docs
5. Web: http://localhost:3000

## Seed admin
Run inside API container:
`npm run prisma:seed`

Credentials:
- admin@example.com
- ChangeMe123!

> Change all secrets before deployment.
