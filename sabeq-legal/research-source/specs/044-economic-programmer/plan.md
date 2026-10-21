# Implementation plan

Reuse authenticated management routes, management_vault, operationEvent and generateText. No new dependency, DB migration, client-document access, runtime command execution or automatic provider fallback.

## Files
- lib/management-programmer.ts: explicit modes, encrypted safe settings, bounded FCC transport and programming advice.
- app/api/management/[...path]/route.ts: authenticated GET/POST programmer, inference rate limit.
- public/management/admin.js, programmer.js and admin.css: navigation, configuration, trial/review, cancellation, safe output, copy and follow-up.
- tests/management.test.mjs: SQLite/auth/vault route tests with controlled model transport.

## Research and contract
Pinned FCC 3d2ae2306752dbdf504714a5489bcfcf69b2d04a: POST /v1/messages supports non-stream JSON, /v1/responses is streaming-only, /admin is loopback-only. Use GET /v1/models?view=messages for catalog; successful listing does not prove inference. Configure bearer protection on the independent FCC service. Existing project mode remains clearly separate and uses existing billed model with a bounded signal.

GET programmer returns redacted settings and project availability. POST actions save/models/run. run accepts task (trial/review/diagnose/tests), prompt and code; returns text, source, model, durationMs, actual usage if supplied, applied:false. Prompt/result stay in browser memory unless explicitly saved through existing commands API. Metadata-only operation events.

## Validation and publication
Test auth/origin, encryption, key rotation, URL validation, FCC messages protocol, model list versus inference, usage and truncation, cancellation and explicit project mode. Build/typecheck and exercise RTL UI. Publish existing backend Site and mirror changed client/source to Q8-ux/saad only. Preserve audiences and unrelated projects. Report external FCC setup as pending unless tested against a real gateway.
