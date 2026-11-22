---
name: cli-anything-writing-studio
description: Inspect and export Arabic Writing Studio documents with the existing application engine. Use for verified PDF and DOCX delivery packages, exact scene or episode scopes, Arabic or English books, and authenticated read-only retrieval of a specified work.
---

# Writing Studio automation

Require Python 3.10+, Node.js 22+ and the installed `cli-anything-writing-studio`
package. Install from the project's `family-online-studio/agent-harness` directory
with `python -m pip install .`. Keep manuscript files and exports outside Git.

Inspect the actual current document before choosing a scope:

```sh
cli-anything-writing-studio --json project inspect --input current.json
```

Generate final files using the real, bundled Writing Studio document backend:

```sh
cli-anything-writing-studio --json export package --input current.json --output delivery.zip
cli-anything-writing-studio --json export package --input current.json --output episodes.zip --split-episodes
cli-anything-writing-studio --json export document --input current.json --scope scene:EXACT_ID --format pdf --output scene.pdf
cli-anything-writing-studio --json export document --input current.json --scope unit:EXACT_ID --format docx --output episode.docx
```

Use `all`, `scene:ID`, `unit:ID`, or book `part:ID`. Obtain IDs from inspection,
not scene numbers or memory. Separate episodes only for series with complete,
contiguous episode assignments. Preserve the existing continuous play and A5
book formats. Supply the private `--illustrations-dir` for illustrated books,
or export those books from the authenticated browser. Never discard drawings.

For remote reads, require an existing account session in the calling environment
as `STUDIO_SESSION_TOKEN`. Never print or persist the token. Use `project list`
then `project pull --work EXACT_ID --output current.json`. Do not substitute an
owner account, infer a default work, or create a shared credential.

Respect errors and nonzero exit codes. Verify the reported output path, bytes,
SHA-256 and ZIP manifest. `--overwrite` is explicit. No command changes a live
manuscript, rewrites dialogue, executes shell instructions or calls an AI provider.
The REPL is memory-only. Preview bundles and live preview are not implemented.
Do not claim that a local or synthetic check exercised a live author's account.
