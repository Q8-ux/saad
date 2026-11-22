# Writing Studio document automation

This CLI-Anything harness uses the same Arabic PDF/DOCX engine as the website.
It supports films, series, continuous stage plays, and Arabic/English books.

## Install

Install Python 3.10+ and Node.js 22+. From `family-online-studio/agent-harness`:

```sh
python -m pip install .
cli-anything-writing-studio --help
```

The committed runtime is self-contained. Node does not need npm packages at
runtime. Developers rebuild it from the private application's generic export
sources using `node scripts/build-studio-cli.mjs`; no manuscripts are bundled.

## Commands

```sh
cli-anything-writing-studio --json project inspect --input manuscript.json
cli-anything-writing-studio --json export package --input manuscript.json --output delivery.zip
cli-anything-writing-studio --json export package --input series.json --output episodes.zip --split-episodes
cli-anything-writing-studio --json export document --input manuscript.json --scope scene:SCENE_ID --format pdf --output scene.pdf
cli-anything-writing-studio --json export document --input manuscript.json --scope unit:UNIT_ID --format docx --output episode.docx
```

Input accepts a native document, the Studio JSON backup envelope (`document`),
or an authenticated API response (`doc`). Inspect output shows metadata and IDs,
not manuscript prose. `--scope part:PART_ID` selects a book part. All selectors
are exact IDs, not guessed scene numbers. Episode order follows first appearance
in the manuscript. A missing episode association fails instead of losing scenes.
Both formats use the same selected document and numbering relative to that scope.

ZIP files contain PDF/DOCX pairs and `manifest.json` with ordered source IDs,
source fingerprint, output sizes and SHA-256 digests. Creative exports omit private
comments, notes, memory and raw sources. Input documents are never modified.
Existing output files require `--overwrite`; writes are atomic with mode 0600.
Maximum input: 2.5 MB. Maximum delivery payload: 96 MiB.

For illustrated books supply `--illustrations-dir` pointing to the private folder
whose paths correspond to `/studio/books/`. Missing drawings fail clearly;
the harness never substitutes blank images or downloads private artwork.
The browser's Export dialog can retrieve authorized book images directly.

## Account access

Supply a legitimate current gateway session through `STUDIO_SESSION_TOKEN` in
the calling process environment. Never put it in command arguments, code or Git.

```sh
cli-anything-writing-studio --json project list
cli-anything-writing-studio --json project pull --work EXACT_WORK_ID --output current.json
```

An explicit work ID is required. The server enforces account ownership. The
harness sends no creative text to an AI provider, performs no remote writes,
and rejects redirects. It does not create a shared login or restore old tokens.

Running without a command opens a memory-only REPL on a terminal. Use `help` or
`quit`. There is no persistent REPL history, account cache or arbitrary shell
execution. Non-interactive invocation prints help.

## Tests

```sh
python -m pip install '.[test]'
CLI_ANYTHING_FORCE_INSTALLED=1 python -m pytest cli_anything/writing_studio/tests -v
```

Read `tests/TEST.md` for the plan, actual results and verification limits.
No live author manuscript is included in tests. No visual preview protocol or
automatic writer-content edits are exposed by this bounded harness.

Upstream methodology and REPL skin: https://github.com/HKUDS/CLI-Anything .
