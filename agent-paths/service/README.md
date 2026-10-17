# Agent Paths Gateway — Phase 1

A dependency-free Python configuration gateway for the project-to-module matrix in `../integration-plan.json`.

## Run locally
```bash
export AGENT_GATEWAY_KEY='replace-with-long-random-secret'
python agent-paths/service/app.py
```

## Test
```bash
cd agent-paths/service && python -m unittest -v
```

## API
`GET /health` returns configuration health (not provider/model health).
`POST /v1/route` requires `Authorization: Bearer <AGENT_GATEWAY_KEY>` and JSON `{"project":"sabeq-legal","module":"M01"}`.

This gateway **does not install or execute** the ten libraries. It only checks the configured allowlist. It is not production-ready: use a trusted HTTPS reverse proxy, per-project credentials and tenant isolation, rate limits, audit logs, CORS policy, secret rotation, and integration/evaluation tests before any public deployment. Do not put the gateway secret in GitHub Pages or frontend JavaScript. Do not send confidential legal, educational, or medical data to external services without an approved data-handling design.
