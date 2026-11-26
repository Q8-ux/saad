# Plan

Keep the existing normalized error-code presentation in the protected administration client. Extend the existing public memo API with a read-only GET for one exact request ID, protected by same-origin validation, request rate limiting and user ownership for account-bound requests. Return an allowlisted status plus a draft-presence boolean only; do not return case inputs, draft content, contacts, provider details or internal errors.

In the public memo wizard, recheck only the failed request reference for a bounded period and expose a localized manual refresh action. Reconcile a repaired needs_review request into a review notice without invoking generation, payment, email or archive paths. Preserve the existing POST contract and all legal gates.

Use synthetic interface/API tests for ownership, response minimization, localization and transition from stale failure to review. Run the affected tests, lint/build gates and then publish the matching backend and public mirror. Verify the official-domain page after deployment; do not equate a green build with a live fix.
