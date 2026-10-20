# Tasks

## Phase 1: Data and authorization
- [x] T001 [US1] Extract user management query/update functions and connect the session-protected users endpoint (FR-001/002/003).
- [x] T002 [US2] Implement encrypted Zoho configuration, refresh and domain-scoped list/create/status actions (FR-004/005/006/007).

## Phase 2: Dashboard
- [x] T003 [US1] Add user search, paging and account editing to the existing dashboard.
- [x] T004 [US2] Add mailbox configuration, list, creation and confirmed status controls without claiming unconfigured activation.
- [x] T005 [US3] Apply Plex typography, responsive hierarchy and compact navigation, preserve hidden owner email and all existing sections (FR-008).

## Phase 3: Verification and publication
- [x] T006 Run route, authorization, provider, shipped-client, font and build checks; document missing live credentials and unavailable browser QA.
- [ ] T007 Publish the backend and scoped GitHub client and verify public asset availability and unauthorized API denial.

Dependencies: T001/T002 -> T003/T004 -> T006 -> T007; T005 runs within the same bounded feature.
