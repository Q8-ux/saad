# Architecture

- `apps/web`: Arabic-first Next.js web application.
- `apps/api`: NestJS REST API with JWT authentication.
- `apps/api/prisma`: PostgreSQL data model and seed.
- `docker-compose.yml`: local web, API and database stack.

The attendance service is the system of record for check-in/check-out events. Odoo, SAP or Oracle integrations should consume normalized APIs rather than write directly to the database.
