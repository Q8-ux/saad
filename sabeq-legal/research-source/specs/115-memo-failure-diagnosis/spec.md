# Explain memo failures and reconcile repaired requests

A failed memo currently displays only a generic failure badge although its private record already carries a normalized provider error. The reported production failure was classified as OpenAI billing; this is a credits or usage/spend-limit rejection, not a legal-review rejection. A second defect is now confirmed: when an authorized owner repairs the same request in the server ledger, the open public memo form keeps the old failure forever because it never rechecks that request.

Acceptance:
- The authorized memo list and detail show a localized cause for OpenAI billing failures, distinguish temporary rate limits, and use a cautious generic explanation for unknown errors.
- Administrators see official OpenAI billing and limits links for billing failures and an instruction to address the relevant balance or limit before retrying.
- A public memo error carrying an exact request reference can recheck only that request through a same-origin, rate-limited endpoint. The endpoint returns only the request status and whether a draft exists; it never returns case inputs, draft text, provider bodies, contact data or internal error details.
- A signed-in visitor cannot read the status of another signed-in visitor's request. A guest request may be rechecked only with its unguessable exact UUID capability while guest memo mode is enabled.
- The public form automatically rechecks a failed request for a bounded period and offers a localized manual refresh action. If the same request has become needs_review with a saved draft, the stale error changes to a review notice without regenerating, charging, emailing or exposing the draft.
- Existing pending review records are unaffected. Viewing a failed record does not regenerate, send a message, change the request, or consume payment.
- No provider response bodies, keys, case data, real request identifiers or financial account information enter source/tests/specifications.

Limit: these UI corrections cannot purchase API credits or change the owner's financial limits. An unrepaired failed request stays failed; a repaired request is shown only according to the stored ledger state. Preserve OpenAI-first then Meta-review behavior and all legal gates.
