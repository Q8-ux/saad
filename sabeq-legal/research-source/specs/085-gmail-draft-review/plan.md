# Plan

Reuse the current public service, its D1 store, AES-GCM vault, authenticated management router and existing mail screen. Add `/api/integrations/gmail/callback` on the service's existing origin. Store OAuth state and per-request delivery receipts under separate vault keys with conditional writes; no database migration or new identity system is necessary. Keep verification-code and Resend settings separate. Update the GitHub administration assets and mirrored source with the same change.

Test the real module against an in-memory SQLite vault and mocked Google endpoints: scopes/redirect/PKCE, state expiry/replay, sender mismatch, encrypted persistence, original saved output, both recipients, concurrency, empty drafts and network uncertainty. Run the management/email regressions, TypeScript and build, then verify the published callback's unauthenticated boundary. Google consent remains an owner action.
