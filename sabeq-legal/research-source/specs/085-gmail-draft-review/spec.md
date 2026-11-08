# Gmail draft review

## Scope
Connect the administrator's designated Gmail sender using OAuth with exactly `gmail.send` and `gmail.readonly`. Send the original saved memo draft to the two administrator-designated reviewers after persistence. Runtime configuration owns all real mailbox addresses; examples and tests use synthetic addresses.

## Acceptance
- A1: Administrator-only configuration; client secrets and refresh tokens remain encrypted in the existing vault and never appear in responses, URLs, logs or GitHub.
- A2: A dedicated server callback consumes a short-lived, single-use state with PKCE, validates the initiating administrator session and verifies the actual Gmail account against the configured sender.
- A3: Sender and both recipients come from server settings. OAuth never silently connects a different account.
- A4: Send only nonempty draft output read back from the saved memo request. Repeated/concurrent completions do not send duplicates. Mail failure cannot lose or fail the saved memo.
- A5: Gmail inbox is read on explicit administrator request; its text is escaped in the existing administration screen. No delete, modify or broad Gmail scope is requested.
- A6: Configuration, deployment, Google consent and delivery are reported separately. No successful connection or delivery is claimed before the relevant external response.

## Dependencies and limits
Google OAuth Client ID/Secret must be entered by the owner directly into the protected administration form, followed by consent from the configured sender. The sender and two recipient addresses are already explicitly authorized in this conversation. Provider acceptance is not proof of inbox delivery. Ambiguous transport failures require review instead of blind retransmission. Historical drafts are not backfilled automatically.
