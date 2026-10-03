# Saad Studio — public design platform, beta

Arabic-first original-template design editor. This is a working beta, **not a Canva clone or a production-ready subscription service**.

## Implemented

- 12 original, editable typographic templates: post, story, carousel, CV, slides.
- Canvas text, image and rectangle layers; drag, reorder, duplicate, delete, undo/redo.
- Arbitrary canvas dimensions (100–4096 px), proportional resize, up to 20 pages.
- PNG/JPG export, multi-page raster PDF (Arabic preserved), editable JSON import/export.
- Secure-session account API, scrypt passwords, per-user project isolation, 20-project/50MB beta quota.
- HttpOnly session cookies, origin checks, input/body limits, basic single-instance rate limits.
- Honest feature availability: no simulated checkout, no claimed Canva connection.

## Run locally

Node 24+; no third-party dependencies.

```sh
npm start
# http://localhost:8787
ACCOUNTS_ENABLED=true npm start # local beta account testing
npm test
npm run check
```

The frontend runs standalone from `public/` on GitHub Pages. Cloud accounts stay unavailable until a backend is configured. No account credentials or customer projects belong in GitHub.

## Deploy

The full app should be served on **one origin** for secure SameSite=Lax cookies. GitHub Pages remains the public editor preview. A Render Blueprint is included; it starts on the free plan with accounts disabled. No data durability is claimed for that service.

To enable beta accounts, provision durable storage (paid Render disk or replace SQLite with a managed database), set DATA_DIR and DURABLE_STORAGE_CONFIRMED=true, set APP_ORIGIN to the actual service origin, then ACCOUNTS_ENABLED=true. The server refuses production accounts without the durable-storage acknowledgement. Confirm the cost before provisioning a paid resource. Back up the SQLite database using SQLite backup facilities before maintenance.

## Commercial launch blockers

1. Choose and configure merchant payment provider, approved prices/currency, checkout, signed webhook verification, idempotency, server-owned subscription entitlements, cancellations and refunds. Paid features remain disabled until this is tested.
2. Set up transactional email, email verification, password reset, account deletion and support contact.
3. Approve a privacy policy, commercial terms and retention/backups; add production abuse protection and monitoring.
4. Register a Canva integration, obtain OAuth client credentials on the server, implement and test per-user OAuth/PKCE and export/autofill, complete public integration review. No Canva tokens or templates are copied into this project.
5. Supply licensed Al-Muhannad webfont. Current beta uses system Tahoma/Arial; it does not claim to include Al-Muhannad.
6. Brand-kit management, teams, video generation, AI generation, background removal and advanced image cropping are not implemented. Existing named workflows have not been executed or connected by this code.

## Canva design constraints

Each subscriber uses their own authorized Canva account. Owner Canva Pro membership is not a reseller license. Canva Pro stock/template content is not redistributed. Original bundled templates are available to platform users for personal and commercial finished designs. Uploaded content remains subject to the uploader's rights.

## Verification

`npm test` covers registration/session validity, wrong-password rejection, two-account isolation on read/write/delete, CSRF origin rejection, remote-image input rejection, project lists, and logout invalidation. Commercial billing and Canva integration cannot be tested until implemented and configured.

Production authentication review and load/security testing are still required before paid public launch. Session expiry is seven days. Current in-memory throttling is single-instance and conservative behind a proxy; replace with a shared production limiter before scale.
