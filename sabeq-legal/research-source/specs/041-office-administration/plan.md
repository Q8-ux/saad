# Plan

Reuse the existing management authorization, encrypted integration vault, operation events and public_users/public_user_sessions tables. Extract the existing administrative user queries into lib/user-management.ts for both legacy service-auth and management-session routes. No schema change or client credential storage.

Add lib/management-mailboxes.ts with a fixed Zoho Mail adapter: global/EU datacenters only, encrypted OAuth refresh credentials, server token refresh, bounded account paging, domain-scoped creation and explicit enable/disable. Re-fetch the target before mutation, preserve groups/aliases/forwarding, reject self or provider administrators, never issue subscription, domain, delete or message calls. Errors do not echo provider payloads or secrets.

Add users and mailboxes sections to public/management/admin.js using existing forms/dialogs. Keep inbox and Resend ingress separate. Apply the minimalist app direction, approved navy/teal colors, compact scrollable right navigation and local IBM Plex Sans Arabic 400/600 WOFF2 assets with their OFL licence. No new application library.

Test the real management route modules against SQLite and controlled provider responses. Test paging, strict input, revocation, credential masking, token renewal, account creation, guarded status mutation and provider failures. Reuse the shipped-client login smoke test. Run syntax, build, scoped Pages checks and real font metadata/contrast checks. Managed control-browser is unavailable; do not improvise browser QA or claim screenshots.

Official API contracts: Zoho post-add-user-to-org, get-org-users-details, put-to-disable-user, put-to-enable-user and using-oauth-2 documents reviewed 20 October 2026.
