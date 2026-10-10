# Deployment security gate (not deployed)

This is an **opt-in configuration router**, not a running AI agent service. The Dockerfile uses the safer `secure_gateway.py` entrypoint. Do not deploy `app.py` to a public host.

## Local validation
```bash
cd agent-paths/service
python -m unittest discover -v
cd ../..
docker build -f agent-paths/service/Dockerfile -t agent-paths-gateway .
```

## Server configuration
Generate a unique random secret of at least 32 characters **per project** and inject `AGENT_PROJECT_KEYS_JSON` via hosting secret settings (never commit it). Example keys must not be reused between projects. Expose service only behind a TLS reverse proxy or a private internal network. Default binding is loopback, so a container deployment requires an explicitly reviewed networking change.

## Mandatory before public deployment
- Real per-tenant identity, scoped authorization and secret rotation; no shared frontend secrets.
- HTTPS, trusted proxy configuration, request-size limits, upstream rate limiting, audit logging without personal data.
- Security review for CORS, CSRF as relevant, SSRF, prompt injection, data retention and provider transfer agreements.
- Persistent distributed rate limits for multi-instance deployments (current limiter is per process only).
- Verify repository and module versions, pin dependencies and scan licenses.
- Connect actual adapters separately behind feature flags and human approval for external writes.
- Test staging integration, performance, rollback and model evaluation before production.
- No confidential client documents, student records or health records should be sent through this configuration API.
