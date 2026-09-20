# Implementation and verification plan

Use static HTML/CSS/ES modules for GitHub Pages and a separate Node 22+ integration gateway. Prefer browser-local operations for manual editing. Use original AutoClip API contracts and existing repository service contracts for remote routes.

The frontend owns temporary source object URLs, cut selections, captions and in-memory access tokens. The gateway owns provider credentials, allowlisted origins, finite resource limits, request validation and idempotency. No database or secret is shipped in the static artifact.

Verify timestamp parsing and project boundaries, subtitle offsets, export geometry, gateway authentication/CORS and duplicate request handling with automated tests. Use browser interactions to verify real audio/video output, caption rendering, save/restore, language direction and a narrow layout. Complete delivery only after the combined GitHub Pages deployment succeeds and the live route loads.
