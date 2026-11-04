# Meta Llama supplementary review — Sabeq Legal

The existing OpenAI-based legal assistant, its D1 legal database, retrieval engine,
memo renderer, and verified-citation controls remain primary. Meta Llama is **not**
a replacement or a legal authority.

## Current implementation
- Primary OpenAI intake, research planning, pleading drafting and legal-source
  verification continue unchanged.
- If explicitly enabled, Meta Llama reviews the legal issues already identified
  by the primary engine and the draft's grounds for potentially omitted points.
- Only indexed missing issues are returned. OpenAI then revises **grounds only**
  using the already retrieved evidence. The deterministic source validation runs
  on every revision. Meta suggestions never directly become statutory text.
- If Meta/OpenRouter is unavailable, the original pipeline continues.
- The public site and GitHub repo contain no API keys.

## Owner-controlled deployment — disabled by default

Set the following **secret server environment variables** on the Worker running
the Sabeq Legal API, not on GitHub Pages:

- `OPENROUTER_API_KEY`: a key from https://openrouter.ai/settings/keys
- `SABEQ_META_SECOND_REVIEW=enabled`
- `SABEQ_META_CASE_DATA_APPROVED=approved` — **only after** case-data transfer,
  processor retention policies, confidentiality agreements, and client notice or
  consent have been independently reviewed.
- Optional `OPENROUTER_FREE_MODEL=meta-llama/llama-3.3-70b-instruct:free`

Do **not** set `SABEQ_LLM_PROVIDER=openrouter_llama`: the design keeps
OpenAI as primary and does not use the switching path.

Never place a key in the GitHub repository, frontend HTML, public issue,
deployment logs, or a chat transcript. A free model may rate limit, change its
behavior, reject a strict JSON schema, or become unavailable, so the secondary
review is best effort only. The provider is not verified to be appropriate for
confidential live case files.

## Document boundaries
The primary document renderer continues to handle:
1. Memorandum of defense (`memorandum`)
2. Statement of claim (`claim`)
3. Statement of appeal (`appeal`)

An independent evidence binder/hafizat must not be silently merged into a
court pleading; it needs a distinct validated document workflow and an explicit
attachment inventory before release.

## Verification
`node --test tests/llama-openrouter.test.mjs tests/meta-secondary-review.test.mjs`

These unit tests use no live credentials. A successful CI run does not prove
the server has been re-deployed or that the external provider works with the
actual case's structured prompts. Validate with synthetic facts and a test
account before enabling the secondary reviewer for real client cases.
