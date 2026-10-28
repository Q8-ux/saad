# Reuse case information before payment

User requirement: do not ask for facts or other case information again at payment when it was already supplied.

Scope: repair the alternate memo entry path, which previously imported facts only. Import existing structured requests, names, roles, case and pleading fields alongside facts and the conversation. Preserve nonempty reviewed form values and prevent empty extracted fields from erasing known information. A complete assistant story is shown as a summary, with optional editing, rather than another open storytelling prompt. Unknown required fields remain subject to existing validation. Repeated entry into a pending checkout must preserve current form values and the existing payment attempt.

Acceptance: direct entry and assistant handoff retain structured fields; visitor-only raw facts remain the fallback; manual corrections survive reentry; complete known facts/requests have a collapsed optional editor; missing facts/requests have an open editor; no new invoice, payment bypass, persistent case storage, legal source, or API change is introduced.

Boundary: this repair covers the current mounted browser session. Recovery of a lost draft after a full reload is not implemented: existing payment records contain a hash, not the draft. Never claim this fixes reload recovery.
