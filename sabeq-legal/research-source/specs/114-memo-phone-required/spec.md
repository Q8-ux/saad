# Required phone and optional reply email

The owner's latest instruction supersedes the email requirement in specification 113: public memo review requires a contact number; email is optional.

Acceptance:
- Manual and assistant review label the contact number required and email optional above the existing accuracy acknowledgement, in Arabic, English and Urdu.
- A valid phone and explicit acknowledgement allow generation and checkout with email blank or omitted. A supplied malformed email still fails validation before models, request creation or invoices.
- Missing/invalid phone or absent acknowledgement still blocks both public API boundaries. Existing phone normalization, payment controls and legal/source gates remain unchanged.
- The phone-only request keeps its contact number in private metadata and the memo's customer-contact list; a supplied email keeps its existing mail link.
- Contact details remain separate from the legal text and payment/model payloads. Use isolated synthetic tests; do not create production requests, invoices or messages.

Assumption: optional means no email verification or ownership proof; a nonempty email must still have valid syntax. No historical data or notification-recipient changes.
