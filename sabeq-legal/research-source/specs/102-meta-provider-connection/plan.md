# Implementation plan

Use the existing encrypted management vault, administrator authorization and paths UI. Add a server-only OpenRouter settings module with optimistic encrypted-row updates, fixed synthetic connection probes and secret-free responses. Add a small runtime resolver gated by LEGAL_AI_MANAGED_SETTINGS=enabled; no saved enabled setting means the original environment is returned unchanged.

Update only the shared text transport lookups in lib/openai.ts and report the resolved provider in health. Keep all prompt expressions byte-identical. Add OpenRouter-only data_collection=deny to the existing compatible transport. Document each exact allowed source substitution; the preservation check reverses only those substitutions and still verifies the original protected SHA and instruction fingerprints.

Add the protected settings panel to the existing paths page and publish the same bounded UI update to the GitHub Pages console without replacing other customized code. The administrator may explicitly select an available paid Meta model and approve its usage cost; unavailable free models never trigger a paid replacement. No schema migration, provider OAuth, API key creation, legal source changes, audio changes, payment or email changes.

Run provider/runtime, authorization/secret, cancellation/JSON and core preservation regression checks plus the normal verified build. Deploy the native backend and GitHub console. Activation remains pending user key entry if no secure input is completed during this task.
