# Meta Llama connection for Sabeq

Native backend version 234 is deployed from `66fe41b496b4d3f6bf530caee97e96f7f593d1da`. The full native change from version 233 is in `native-source.patch`; its checksum and deployment receipt are in `manifest.json`.

The existing GitHub console adds a protected Meta panel under `#paths`. An administrator enters an OpenRouter API key directly into the password field, chooses Meta Llama, explicitly approves paid usage if applicable, then selects the test/save/activate action. Secrets remain encrypted in the existing server vault and are never returned to the client. No case data is used in the two connection probes.

Llama 4 Scout is an available paid option; free endpoints may be unavailable. No paid request runs without the explicit approval flag. OpenRouter routing requires `data_collection=deny` and `zdr=true`. Existing provider and configured fallback remain until successful activation; disabling restores the original environment. File reading and voice retain their previous configuration.

419 internal release checks and all six dashboard groups passed. Concurrent distinct cases and reverse-order ledger completion remain isolated. Existing article text/number, fact application, citation and missing-source checks remain in force, as do templates, source corpus and human revisions. Synthetic provider checks do not establish legal correctness. Owner key input and actual live inference remain pending.

This does not modify the separate Bolt.new frontend. It updates Sabeq's shared backend and the GitHub console. No archived memorandum was merged or rewritten.
