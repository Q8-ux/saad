# AI Lead Intelligence Agent

Workflow:

Reddit + LinkedIn + Web → AI Lead Intelligence → Human Approval → Outreach → Follow-up → Sales Opportunity

## Current MVP

- Unified Arabic RTL dashboard.
- Lead scoring based on urgency, solution fit, evidence, and buying capacity.
- Source links for Reddit / LinkedIn / company website.
- Manual approval gate before outreach status can progress.
- Draft outreach message editor.
- Pipeline states: New → Review → Approved → Contacted → Qualified.
- Local browser persistence using localStorage.
- Seed examples from public Reddit posts.

## Important privacy boundary

The system must not attempt to deanonymize Reddit users from indirect personal clues. LinkedIn, email, company websites, and other professional contact channels are attached only when voluntarily published by the person/account or available as clearly public business information.

## Production integrations

The static GitHub Pages MVP deliberately does not embed API secrets. A production backend should provide:

1. Reddit official API / permitted search ingestion.
2. LinkedIn approved API or public business profile ingestion consistent with platform terms.
3. Web search provider for public business information.
4. LLM endpoint for structured lead classification and message drafting.
5. Database (e.g. Supabase/Postgres) for team pipeline and audit logs.
6. Outreach connectors only after explicit human approval.

## GitHub Pages

If repository Pages is configured from the `main` branch root, this folder is served at:

https://q8-ux.github.io/saad/lead-intelligence-agent/
