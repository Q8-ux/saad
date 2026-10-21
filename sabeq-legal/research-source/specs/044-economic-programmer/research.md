# Contract research

Decision: use FCC Anthropic Messages JSON; do not use streaming-only Responses or loopback-only admin sessions. Pinned source: https://github.com/Alishahryar1/free-claude-code/tree/3d2ae2306752dbdf504714a5489bcfcf69b2d04a . Verified api/routes.py, api/handlers/responses.py, api/dependencies.py and config/loader.py. Catalog readiness is separate from actual inference. Retained proxy token is ANTHROPIC_AUTH_TOKEN with PROXY_AUTH_ENABLED=true; process env alone does not set that token. Configure it privately on the independent FCC host. Python requirement ==3.14.7. No independent FCC host or token is currently supplied.

Alternative: reuse existing Sabeq generation helper as an explicit separately labeled billed mode. No silent paid fallback; no claim that this starts the FCC coding harness or edits the repository.
