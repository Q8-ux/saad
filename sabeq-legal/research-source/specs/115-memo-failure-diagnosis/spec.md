# Explain memo failures without hiding their cause

A failed memo currently displays only a generic failure badge although its private record already carries a normalized provider error. The reported production failure was classified as OpenAI billing; this is a credits or usage/spend-limit rejection, not a legal-review rejection.

Acceptance:
- The authorized memo list and detail show a localized cause for OpenAI billing failures, distinguish temporary rate limits, and use a cautious generic explanation for unknown errors.
- Administrators see official OpenAI billing and limits links for billing failures and an instruction to address the relevant balance or limit before retrying.
- Existing pending review records are unaffected. Viewing a failed record does not regenerate, send a message, change the request, or consume payment.
- No provider response bodies, keys, case data, real request identifiers or financial account information enter source/tests/specifications.

Limit: these UI corrections cannot purchase API credits or change the owner's financial limits. Keep the failed status until a real later generation succeeds. Preserve OpenAI-first then Meta-review behavior and all legal gates.
