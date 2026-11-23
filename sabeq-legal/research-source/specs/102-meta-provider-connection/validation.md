# Validation — Meta provider connection

Validated 2026-11-23 before publication. No API key or real case data is included in these artifacts.

- Normal verified production build: passed. All six dashboard groups passed. Internal release verification: sources 42/42, memo 260/260, access 117/117; total 419/419.
- Provider/model compatibility and runtime checks passed, including actual generateText and conductLegalIntake routing through the same saved model.
- Synthetic administrator checks passed: encrypted storage, masked responses/events, invalid keys, unavailable models, malformed/truncated JSON, rate limiting, cancellation, optimistic conflicts and explicit paid-model consent.
- Concurrent isolated cases sent separate messages and accepted reverse-order responses without mixing. Reverse-order ledger completion retained distinct inputs, identifiers and outputs. Existing agent checks reject another request identifier. No archived memo or human revision was rewritten.
- Existing article-text, citation number/identity, factual application, source absence and legal review gates passed. Original 87 protected sources still match their baseline after reversing only documented provider transport substitutions. No writing instruction, template, legal source or export rule was changed.
- OpenRouter is restricted to the chosen Meta model, non-collecting providers and ZDR endpoints. Paid Meta requests require an explicit approval flag. Existing configured alternate remains unchanged; this is not an added paid fallback.
- The earlier default free 70B model exposed no endpoints in OpenRouter public metadata. Llama 4 Scout had available endpoints and is offered as a paid choice. A model page alone is not live inference evidence.
- Standalone tsc is not a clean project gate: existing missing Cloudflare Worker declarations and other pre-existing type diagnostics remain. The new settings module reports only the same missing cloudflare:workers declaration; the verified Vinext build passed.

Production setup panel and provider acceptance remain pending until deployment and owner key entry are observed. Synthetic connection checks do not establish legal correctness or absence of every possible legal error.
