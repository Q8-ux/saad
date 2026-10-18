# GitHub Pages collection API

Standalone Node 22+ HTTP API; no install, database or runtime files are required. Start with `node social-request-radar/server/start.mjs` from the shared repository root. The Render build command runs the server and research tests; the service uses the free compute plan.

Required server secret: `RADAR_SEAL_KEY`, exactly 32 cryptographically random bytes encoded as base64url. Configure it in Render environment variables. `RADAR_ALLOWED_ORIGIN` defaults to `https://q8-ux.github.io`. `/health` is a side-effect-free health endpoint.

Each browser supplies its own provider key through `/api/configure`. The key is sealed with AES-256-GCM under the server secret; only the opaque credential is saved in the browser. Configuration makes no provider calls and does not verify platform access. `/api/search` requires this credential, decrypts it transiently, and invokes only the bounded provider collector. The API never uses a shared provider key or stores plaintext provider keys. Decrypted keys and request bodies must not be logged. Rotating `RADAR_SEAL_KEY` invalidates all existing browser credentials. Credentials expire after one year.

The public stateless API does not host user records or provide shared user accounts. Anyone may supply their own provider credential; a sealed credential authorizes use of the provider account and must be treated as sensitive. The frontend keeps local searches and saved items on the device. CORS permits the configured GitHub origin; it does not replace the credential requirement. Other applications on the same GitHub Pages origin share browser-origin trust.

Live collection starts only after an explicit search. Limits are at most 12 requests and 20 estimated provider credits per search, with two simultaneous searches across this process. Request IDs coalesce duplicate submissions for 15 minutes within the running instance. The cache, concurrency and rate counters reset after a process restart; this is not a durable billing ledger or a daily credit guarantee. No silent retries, background collection or posting is implemented. Actual provider charges can differ from estimates. Collected records are capped at 2,000 per response and truncation is disclosed.

The free Render service may sleep and cold-start. Preserve the deployment service ID and literal returned URL in `deployment/render-service.json`. Source changes require an explicit deploy when auto-deploy is disabled.
