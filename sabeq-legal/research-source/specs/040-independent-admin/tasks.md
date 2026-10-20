# Tasks

## Phase 1: Access and data
- [x] T001 [US1] Implement allowlisted administration access, PKCE exchange, revocation and bounded management endpoints (FR-001/002).
- [x] T002 [US1] Add request ledger and trace guest/signed-in memo outcomes without changing drafting behavior (FR-003).
- [x] T003 [US2] Add contacts/inbox, persisted notification read state, commands and health/source status (FR-004/008/010).

## Phase 2: Integrations and UI
- [x] T004 [US3] Add encrypted OpenWA configuration, test, sessions, QR and signed event ingestion (FR-005/006/007).
- [x] T005 [US2] Prepare real mailbox configuration and signed inbound ingestion, showing missing credentials accurately (FR-008).
- [x] T006 [US1] Build independent Arabic GitHub admin UI with existing brand and actual data states (FR-004/009).
- [x] T007 [US1] Add official-backend monitoring bridge and preserve legacy admin access contract (FR-010).

## Phase 3: Validation and publication
- [x] T008 Test security and business boundaries, typecheck and build; document unavailable external integrations.
- [ ] T009 Publish backend and GitHub client, verify authenticated data denial and public client availability.

Dependencies: T001 -> T002/T003/T004/T005 -> T006 -> T008 -> T009. T007 is independent until the source-status check. No automatic customer messaging is part of this feature.
