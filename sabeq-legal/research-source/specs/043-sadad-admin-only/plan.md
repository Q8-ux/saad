# Plan
Reuse encrypted SADAD config; add one explicit visibility boolean, default false. Leave existing service entitlement checks and provider contract intact. Gate new invoice creation and reject inconsistent activation. Gate client display by the server flag, preserving capability recovery. Extend the existing independent admin form and preserve a validated section through its existing PKCE sign-in. No new dependency, database migration, legal-source change or public navigation item.

Touch points: lib/sadad-payments.ts; app/sabeq-site.tsx; lib/sadad-client.ts; public/management/admin.js; tests/sadad-payments.test.mjs and tests/management.test.mjs. Mirror the public bundle and admin script to the existing GitHub release with scoped publication.
