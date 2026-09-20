# Product specification

## Goal
Give saad.albabhan a multilingual video editing workspace for the existing AutoClip project and suitable existing production services. Ship on the owner's existing GitHub Pages repository.

## Acceptance requirements
1. Arabic by default; English and Urdu switch without reloading. Arabic/Urdu RTL, readable type and responsive right-sidebar layout.
2. Local videos remain on device until an explicit server operation. Real audio/video export, clear format and duration limits, no fabricated AI results.
3. Projects survive a save/open round trip when the original file matches. Corrupt plans must not replace the current work.
4. Captions support timed SRT/VTT, local editing, clip-relative export and burned-in output.
5. Integrate the existing analysis service, Route10 voice/video/marketing hub, MarkItDown and Block Buzz through an authenticated gateway; separate AutoClip engine connection.
6. Existing clips are reused for publishing plans. Alternative video producers are selected independently. No automatic social publishing or agent messages.
7. Provider credentials stay server-side; configuration status must distinguish local tools from services requiring activation.
8. Do not disturb other projects in the shared repository or unified Pages workflow.

## Non-goals
Provision paid AI accounts, pretend desktop apps are web APIs, automatic editorial accuracy assessment, automatic face tracking, multi-user SaaS authentication, or install developer tools as visitor-facing workflows.
