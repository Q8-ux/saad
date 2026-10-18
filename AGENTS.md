# Sabeq development routing

This repository contains independent projects. Activate the following route only for a task involving `sabeq-legal/`, `legal-memo-platform/`, their repository-local development/deployment instructions, or a proven shared dependency used by Sabeq. Do not apply the Sabeq skills to other projects.

Before working on Sabeq, read `.agents/skills/sabeq-ponytail/SKILL.md` and its relevant project references. Apply its `full` behavior by default, preserving all requested functionality and legal-data safeguards.

For specific Sabeq requests, also load:
- Change review: `.agents/skills/sabeq-ponytail-review/SKILL.md`.
- Project audit: `.agents/skills/sabeq-ponytail-audit/SKILL.md`.
- Deferred shortcuts: `.agents/skills/sabeq-ponytail-debt/SKILL.md`.

Default review, audit and debt scope is the Sabeq frontend and backend, not the entire shared repository. A report request alone does not authorize edits. Follow current user instructions over older project notes.

## REA investigations

For REA or reverse-engineering work on Sabeq, read `legal-memo-platform/tools/rea/README.md` and use its pinned runner. Run `npm ci --omit=optional --ignore-scripts --prefix legal-memo-platform/tools/rea`, then `npm run rea:audit --prefix legal-memo-platform`.
The runner inspects only tracked Sabeq application code and the bundle referenced by the current index. Do not point REA at the shared repository, private uploads, databases, sessions or environment files. Keep raw Evidence private; publish only the runner's metadata summary. Treat incomplete source, no-match traces and unresolved imports as unknown. REA code analysis does not validate legal authority, prove a deployed API works, or replace human approval of a memo.


## Sabeq specification and execution path

For Sabeq feature work, load `legal-memo-platform/AGENTS.md` and follow the pinned Spec Kit workflow there. Its development root is `legal-memo-platform/`, covering that backend and the related `../sabeq-legal/` client only. Run the installed `speckit-*` skills and `.specify/scripts/python/` helpers from that development root, or set `SPECIFY_INIT_DIR` to its absolute path. Never initialize Spec Kit at this shared repository's root or apply its Sabeq constitution to another project.

Use one bounded specification per meaningful feature. Preserve existing native/mirrored specs as historical evidence; do not duplicate or silently mark them complete. A small presentation edit does not require the full cycle. Follow `legal-memo-platform/tools/spec-kit/README.md` for commands, validation and the distinction between task completion, tested behavior and live deployment.
