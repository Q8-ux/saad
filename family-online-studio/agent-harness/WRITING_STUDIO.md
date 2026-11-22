# Writing Studio CLI-Anything harness

Target: the existing Arabic Writing Studio, mirrored at
https://github.com/Q8-ux/saad/tree/main/family-online-studio .
Methodology: https://github.com/HKUDS/CLI-Anything .

The backend is the application's own TypeScript document validator, jsPDF Arabic
renderer, DOCX generator and font assets. `scripts/build-studio-cli.mjs` bundles
these exact modules into the package; Python invokes Node, never a replacement
renderer. Rebuild this runtime whenever the shared exports change.

The website's Export dialog and this CLI call `lib/studio-delivery.ts`. Both take
an immutable snapshot, retain source IDs and order, and produce PDF/DOCX plus a
SHA-256 manifest. Series may separate episodes; stage plays remain continuous.
Books retain their A5 format and require all referenced illustrations.

The CLI has explicit local input paths, explicit remote work IDs, one-shot Click
commands, a memory-only REPL and structured JSON results. It does not change the
manuscript, save proposals, run shell instructions, or bypass account access.
No persistent session state, undo history or plaintext authentication file is
introduced. Remote reads use the existing account-scoped gateway and a token
provided through `STUDIO_SESSION_TOKEN`; redirects are rejected.

The bounded scope is document inspection, authenticated retrieval and final
delivery exports. Publishing this package to PyPI, GUI preview bundles,
creative generation, and automatic cross-project operations are outside scope.
Illustrated books can be exported in the browser, or through this CLI when the
operator supplies the corresponding private assets directory.
