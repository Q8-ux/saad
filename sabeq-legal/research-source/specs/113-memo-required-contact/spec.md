# Required reply contact for website memo requests

The owner requires a contact box above the accuracy acknowledgement. Both email and phone must be supplied before public memo generation or checkout.

Scope: the manual and assistant-to-memo public journeys, their generation and checkout API boundaries, and private request display. Existing saved requests and authenticated office generation remain usable. The reply contacts do not replace account identity and must not be inferred from legal documents.

Acceptance:
- Both journeys show labelled required email and phone fields immediately above an unchecked accuracy acknowledgement.
- Missing/malformed contacts or absent acknowledgement block generation and invoice creation on the server, including direct API calls. Preparation and document upload may still proceed before review.
- Arabic/Persian digits and ordinary phone formatting normalize safely; email and phone remain LTR in all interface languages.
- The same submitted contacts survive review/back navigation, payment handoff and retry, and are stored/displayed with the private request for office replies.
- Owner follow-up: show the contacts in a dedicated «الاتصال بالعميل» list inside the same memo record, with mailto/tel links; those links open the user's mail/phone app and do not automatically send a reply.
- Contacts are kept out of the legal memo, model drafting inputs, automatic notification bodies and payment provider payloads. No email/phone message is sent by this change.
- Existing case facts, legal gates, prices, payment recovery and role controls are preserved. No historical data migration or collection of contact details from old records.

Limits: syntax checks establish a plausible contact format, not ownership or reachability; no new OTP flow is requested.
