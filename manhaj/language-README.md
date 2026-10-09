# Language and editing workflow

Every editable text/textarea, select, date/time, number, email, URL and telephone control receives a microphone button. File inputs, color pickers, checkboxes, hidden and readonly/disabled controls are excluded. Structured fields validate the resulting value before applying it; spoken dates need the displayed ISO format, and selects match an exact spoken option label. Unsupported browsers show a useful message without changing the field. Browser speech services may process audio externally.

Text fields also receive three local rule-based editing modes: language review, formal wording and concise phrasing. Rules normalize spacing/punctuation and a small set of contextual Arabic corrections and phrases. Quoted passages, URLs and email addresses are protected. This is not a general Arabic grammar engine or an LLM integration. Arbitrary rewriting, translation, and deep semantic review are not activated.

All speech and editing suggestions open an editable before/after preview. Applying dispatches the same input/change events as typing, but never submits or saves a record. Stale previews cannot overwrite newer field edits. Undo is available if the field still equals the last accepted revision. Dynamically added controls are enhanced once.

Checks: `node manhaj/language-check.cjs`; local DOM integration: `node manhaj/analysis/ui-check.cjs` with jsdom/fake-indexeddb installed at its documented paths. Physical microphone permission, speech quality and visual layout require real-device verification.
