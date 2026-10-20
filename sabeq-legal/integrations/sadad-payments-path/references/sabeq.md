# Apply to Sabeq

User-facing name: «مسار دفع سداد». Purpose: pay the approved fee before generating one legal memo, retaining retries after generation failure.

Repository: https://github.com/Q8-ux/saad . Treat remembered filenames as discovery hints; read the current checkout and its AGENTS.md first.

- `sabeq-legal/`: GitHub Pages client and current source mirror under `research-source/`.
- `legal-memo-platform/`: Express gateway used by the official domain; inspect every memo endpoint to prevent a payment bypass.
- `sabeq-admin-preview/`: independent management UI.
- Native Site `sabeq-legal-public`: server runtime, D1 and canonical application source; resolve its actual project ID via current platform metadata, never derive it from a slug.
- Current policy: `service_settings` (memo.payment_required, price_fils, currency).
- Existing vault: `management_vault`, `sealConfig/openConfig`, management sessions. Reuse it and enforce manager authorization.

Implementation touch points: `lib/sadad-payments.ts`, `lib/sadad-client.ts`, `app/api/payments/sadad/route.ts`, `webhook/route.ts`, `app/api/legal/memo/route.ts`, `app/sabeq-site.tsx`, `public/management/admin.js`, payment migration, and `legal-memo-platform/memo-payment-gate.js`. Re-read the files before relying on this map.

Preserve the official logo, existing Arabic typography and guest behavior. Do not send client documents or case facts to SADAD; the server retains only request hashes and financial references for payment matching, plus a private temporary result for recovery. Do not add phone to the memo form.

Deployment: save native Site source through its supported workflow and publish the current audience; mirror public client/source changes to GitHub; deploy the gateway separately. A successful native Site deployment does not prove GitHub Pages or www.sabeq.legal updated. The observed official domain on 2026-10-20 serves an older Netlify/ Bolt package; inspect its live asset fingerprint and deployment access before claiming it changed.

Readiness: the video does not establish Sabeq merchant ownership or settlement details, nor a fee. Configure credentials securely, test authentication, set the price and confirm account/callbacks before requiring payment. Display outstanding setup truthfully in the administrative interface rather than inventing success.

Recovery contract: capability metadata survives same-tab reload/remount in sessionStorage, without case facts. It is not guaranteed after closing the original tab/browser. Cached result retrieval expires after seven days; physical cache cleanup runs on subsequent payment operations, not an independently scheduled seven-day deletion job. Original management service records follow their separate retention policy.
