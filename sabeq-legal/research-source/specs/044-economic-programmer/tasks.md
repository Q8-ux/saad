# Tasks

## Phase 1: Scope
- [x] T001 Record bounded requirements and upstream contract in specs/044-economic-programmer/spec.md and plan.md (FR-001–008).
## Phase 2: US1
- [x] T002 [US1] Implement vault settings and guarded FCC transport in lib/management-programmer.ts (FR-002–004).
- [x] T003 [US1] Add authorized GET/POST in app/api/management/[...path]/route.ts (FR-001).
## Phase 3: US2
- [x] T004 [US2] Add explicit inference, trial, bounds and cancellation in lib/management-programmer.ts (FR-003–007).
- [x] T005 [US2] Add RTL forms and preserved states in public/management/admin.js, programmer.js and admin.css (FR-007–008).
## Phase 4: US3
- [x] T006 [US3] Add explicit copy and follow-up command in public/management/admin.js (US3).
## Phase 5: Validation
- [x] T007 Add boundary tests in tests/management.test.mjs, run regression/typecheck/build/UI checks (SC-001–004).
- [ ] T008 Publish backend and GitHub client, record limits in specs/044-economic-programmer/validation.md (SC-004).

Dependencies: T001 → T002 → T003/T004 → T005 → T006 → T007 → T008. Upstream read-only contract research is independent of local source inspection. Deliver configuration then a complete synthetic review before optional FCC inference.
