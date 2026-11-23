# Meta Llama connection for Sabeq

Native backend version 235 is deployed from `6b3dc83a97f2bf8d79d10fea00a2576c69dd959c`. The full native change from version 233 is in `native-source.patch`; its checksum and deployment receipt are in `manifest.json`.

The existing GitHub console adds a protected Meta panel under `#paths`. An administrator enters an OpenRouter API key directly into the password field, chooses Meta Llama, explicitly approves paid usage if applicable, then selects the test/save/activate action. Secrets remain encrypted in the existing server vault and are never returned to the client. No case data is used in the two connection probes.

Llama 4 Scout is an available paid option; free endpoints may be unavailable. No paid request runs without the explicit approval flag. OpenRouter routing requires `data_collection=deny` and `zdr=true`. Existing provider and configured fallback remain until successful activation; disabling restores the original environment. File reading and voice retain their previous configuration.

422 internal release checks and all six dashboard groups passed. Concurrent distinct cases and reverse-order ledger completion remain isolated. Existing article text/number, fact application, citation and missing-source checks remain in force, as do templates, source corpus and human revisions. Synthetic provider checks do not establish legal correctness. Owner key input and actual live inference remain pending.

This does not modify the separate Bolt.new frontend. It updates Sabeq's shared backend and the GitHub console. No archived memorandum was merged or rewritten.

The historical research snapshot retains its separate Meta-native and Heretic extensions. Apply the complete native patch only against the stated native backend base; the deployed backend is authoritative for the managed OpenRouter setting. The GitHub console and its management mirror ship the identical updated client.

## Availability repair

The adapter now distinguishes known privacy-policy, parameter, endpoint, key/provider restriction and credit rejections using a private error body limited to 8 KiB. Unknown errors remain generic; upstream prose, keys and case data are never returned. The console adds paid Llama 3.3 70B as an explicit choice alongside Scout and the free model. Both synthetic probes and explicit paid consent remain mandatory. There is no automatic model substitution or privacy downgrade.

Native version 235 deployed successfully on 2026-11-23T14:53:17.965198+00:00. All 422 internal checks and six dashboard groups passed; the original 87 protected source hashes remain valid after reversing exact transport changes. Actual activation still requires the owner to retry their key successfully. Public model availability is not proof of access for a particular account. The separate Bolt version 33 summary has not been treated as proof of a native deployment, an active key, or a verified new quote-check implementation.
