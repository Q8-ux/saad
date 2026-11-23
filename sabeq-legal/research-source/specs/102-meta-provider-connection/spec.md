# Meta Llama connection for Sabeq

## Request and assumptions
Connect Meta Llama through OpenRouter for both actual memo generation and the legal assistant. Preserve existing writing instructions, templates, citation validation, case facts, human review, export and notifications. The account owner creates their OpenRouter key; its value is not available to the developer or committed source.

## Requirements
- FR-001: Administrators can enter a secret key and a pinned Meta Llama model under the existing paths/integrations page. No new account, role or permission scope is created.
- FR-002: Save the key only in the existing encrypted server vault. GET responses, logs, browser storage and bundles never contain the key. Blank key input retains an existing saved key.
- FR-003: Verify structured memo-style and assistant-style synthetic requests before activation. Reject authentication, rate limit, truncated/invalid JSON, timeout and unavailable model without changing the currently active configuration. Use a fixed HTTPS endpoint and disable redirect forwarding.
- FR-004: Route shared text generation and intake through the activated setting. Files, audio and speech retain their existing providers. Preserve the current explicitly configured fallback and restore the environment primary when disabled.
- FR-005: Keep all legal instructions, templates, source gates and saved drafts intact. Only reviewed provider-transport edits may differ from the protected baseline. Provider routing must exclude endpoints that collect prompt data.
- FR-006: Conflicting updates fail without overwriting another administrator's change. A paid Meta model requires an unchecked-by-default, explicit administrator consent flag before any test request or activation; no paid model switch is automatic.

## Acceptance
- Missing key leaves the existing provider working and the UI clearly inactive.
- A synthetic key is encrypted at rest and absent from every public response/event; unauthorized and supervisor access is rejected.
- Both public text call paths use the saved model after activation; disabling restores the original environment. Missing legal sources still block invented citations.
- Synthetic activation checks exercise JSON output and cancellation without real case data. Client UI and production deployment are verified independently of model acceptance.
- Report key entry/live provider verification as pending until observed, never as completed from code tests alone.

## Case isolation clarification
Each memo retains its own facts, attached documents, parties, requests and output under its own request identifier. Shared model configuration is permitted; shared case conversation/history or merging different cases is forbidden. Test distinct concurrent synthetic cases and reversed completion order, as well as the existing rejection of a mismatched agent request ID. Do not infer an observed production data leak from an untested suspicion.

## Legal enrichment clarification
For every new memo, preserve the existing case-grounded defenses and authoritative-source pipeline: applicable verified law names/numbers, article numbers and exact article wording, factual application, counterargument and reasoned reply. Missing or unverified authorities must remain a review/source-coverage issue; never fabricate or bulk-copy authorities from another case. Keep existing saved memos and human revisions intact. No universal guarantee of error-free legal output is asserted from connection tests.
