---
name: sabeq-ponytail-debt
description: "Report deferred shortcut or ponytail comments in Sabeq Legal code. Use for الاختصارات المؤجلة في سابق, Sabeq technical debt or ponytail debt for Sabeq. Search only sabeq-legal and legal-memo-platform; report in Arabic without changing code."
---

## Sabeq project scope

Apply this skill only to Sabeq Legal: `sabeq-legal/` and `legal-memo-platform/`, plus their directly related deployment configuration. Resolve paths from the repository root. Do not activate it for another project in this shared repository.

Before proceeding, read the Sabeq safeguards in `.agents/skills/sabeq-ponytail/SKILL.md`. Limit searches and default review/audit/debt targets to the two Sabeq directories; inspect a shared dependency only when a concrete Sabeq call path requires it. Report that extra scope. Report in Arabic unless the user requests another language. A review, audit, or debt request authorizes a report; make code changes only when requested.

Every deliberate ponytail shortcut is marked with a `shortcut:` comment naming
its ceiling and upgrade path (older code may say `ponytail:`). This collects them into one ledger so a deferral
can't quietly become permanent.

## Scan

Grep the Sabeq directories for comment markers, skipping `.git` and everything the
`.gitignore` files ignore (dependencies, build output, caches, in any stack):

`rg -n --hidden -g '!.git' '(#|//|/\*) ?(shortcut|ponytail):' -- sabeq-legal legal-memo-platform`  (add other comment prefixes if your stack uses them)

Include tracked and untracked source files while respecting ignore rules. Include non-ignored hidden files. Exit code 1 means no markers were found, not a scan failure.

If the user names their own marker word (`/ponytail-debt TODO`), grep for that word instead.

Each hit is one ledger row. The comment prefix keeps prose that merely mentions
the convention out of the ledger. Skip hits that are not a deferral, like a note
about a keyboard shortcut.

## Output

One row per marker, grouped by file:

`<file>:<line>, <what was simplified>. ceiling: <the limit named>. upgrade: <the trigger to revisit>.`

The convention is `shortcut: <ceiling>, <upgrade path>`, so pull the ceiling
and the trigger straight from the comment. Want an owner per row too? add
`git blame -L<line>,<line>`.

Flag the rot risk: any marker comment that names no upgrade path or
trigger gets a `no-trigger` tag, those are the ones that silently rot.

End with `<N> markers, <M> with no trigger.` Nothing found: `No shortcut debt. Clean ledger.`

## Boundaries

Reads and reports only, changes nothing. Persist the ledger only when the user's request already authorizes saving it. One-shot.

