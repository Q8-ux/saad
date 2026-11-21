# Dr Hamad S. AlEnezi — dedicated website

Public website: https://q8-ux.github.io/saad/dr-hamad/

An Arabic RTL website for د. حمد ساكت العنزي, separate from the existing Instagram preview. Uses the plain metallic H from the owner-approved reference and the existing Cairo Regular, Bold and Extra Bold WOFF assets under their included SIL Open Font License. Active palette: sky blue #BAD8E8, warm beige #E7E0D3, ivory #FCFBF8 and navy #293F50.

The doctor introduction and official clinic details come from the user's supplied doctor message: Al Razi Hospital, specialized clinics B, clinic 6, Tuesday morning. Appointment links go directly to https://ask.moh.gov.kw. No appointments are processed by this website.

The movement/replacement explorer remains an original SVG educational schematic of knee and hip movement, replacement components and five illustrative assembly stages. It is not a validated biomechanical simulation, a 3D model or surgical instruction. Visitor controls use native buttons, ranges and requestAnimationFrame. Motion starts only when the visitor requests it and respects reduced-motion preferences.

Retains all 11 existing carousels, 8 slides each, including prior supplied archive content. No carousel wording changed. Search, categories, saved posts, deep links, sharing, keyboard navigation and swipes are available. Light, navy and warm themes use the active main website palette. Saved posts stay in browser local storage.

The previous article “توقيت استبدال مفصل الركبة” remains linked to its existing public Site. Its source text was not recovered and has not been replaced or redated. The separate local editorial article “خشونة الركبة… من فهم الألم إلى قرار العلاج” provides primary references and its own current editorial date, distinctly from the research publication dates. References include NICE NG226, Cochrane 2024, IDEA JAMA 2013 and AAOS OrthoInfo. External AAOS animations are linked to the publisher; media has not been copied.

No fabricated portrait, testimonials, outcomes, qualifications, live availability, AI diagnosis, analytics or patient-data forms. The static website has no external dependencies; Cairo font files are served locally.

## Verification

- `node --check app.js`, `node --check experience.js`, `node --check site.js`.
- `node verify.cjs`: all 88 slides, navigation bounds, medical/archive filters, search and empty state.
- Local HTML checks: referenced assets, internal fragment targets, unique IDs, one H1 on each document.
- Browser QA at 320, 390, 768 and 1440 CSS px, plus mobile article reading. See `qa-results.json` for performed checks and limits.
- Arabic font rendering is checked in the browser.

Deployment restores the current successful Pages artifact, overlays only `dr-hamad/`, and checks every unrelated published file remains byte-identical. The existing Instagram demo and unrelated projects remain separate.

## Three-dimensional joint anatomy (31 October 2026)

`joint-anatomy.js` lazily loads the locally served Three.js 0.185.1 modules and OrbitControls. `joint-anatomy-models.js` creates original procedural knee and hip schematics. `joint-anatomy.css` is scoped to the new explorer. Features include orbit/zoom and keyboard controls, structure labels and descriptions, real visibility toggles for bone/cartilage/supporting tissues, selected-part isolation, an exploded view, and a four-question structure-identification quiz. Rendering stops outside the viewport and while the page is hidden; there is no automatic rotation by default. When WebGL is unavailable, Three.js SVGRenderer renders a lighter version of the same 3D geometry; if both renderers fail, a link reveals the existing SVG explorer, and all existing content remains available.

The interaction concept was inspired by https://github.com/thebuggeddev/anatomy. That repository has no explicit license in its current tree; no code, GLB models or illustrations from it were copied. The new geometry is schematic and has not received clinical review. Basic anatomical descriptions cite AAOS OrthoInfo; this is educational content, not a clinical atlas or patient-specific advice. Three.js , OrbitControls, SVGRenderer and Projector retain their MIT license in `vendor/three/LICENSE`. All dependencies are served locally; no patient data or external API/CDN requests are introduced.

## Temporary clinic leave announcement

The user-supplied image is displayed in the home-page news notice and opens at full size in a dialog. Both carry `data-expires-at="2026-11-08T00:00:00+03:00"`. `clinic-notice.js` removes them at midnight at the start of the return date in Kuwait, also for an open page or one resumed from background; the default HTML state is hidden. The expiry does not depend on a future deployment. `node dr-hamad/verify-clinic-notice.cjs` verifies the time boundary, dialog closure, cross-timezone instants and background resume.

## Kuwait television interview

The inline player in `#tv-interview` embeds `w8qWv5NMbrw`, “مستشفى الرازي يحقق نقلة نوعية في جراحات الركبة”, published 22 July 2026 by the official NewsKTV1 ministry news channel. The original video description names Dr Hamad Alenzi, orthopaedic surgeon at Al Razi; the runtime metadata reports `OK` and `playableInEmbed: true`. The video is 1,160 seconds long. Source: https://www.youtube.com/watch?v=w8qWv5NMbrw. The official ministry directory https://media.gov.kw/SocialMedia.aspx lists @newsktv1. The original video is embedded with privacy-enhanced YouTube, lazy loading, inline playback and fullscreen. It is not downloaded or rehosted.

## Interface refinement — 21 November 2026

`interface.css` improves visible focus, touch targets, search legibility, empty states and reduced-motion behavior. SVG carousel controls avoid missing font glyphs. The latest approved identity below governs colors and typography; the font preload matches the active Cairo face.

Search now has a labelled clear button and an accessible live result count. The library view buttons use pressed-state semantics. Saving distinguishes persistent browser storage from a session-only fallback when storage fails. Closing a carousel restores focus even when its source tile was replaced during a save/filter render. Mobile navigation closes on outside click, focus departure, Escape, link activation and viewport changes. Brief CSS transitions use the existing stack without an additional animation library.

All 11 carousels and their 88 slide texts, medical article content, clinic facts, appointment destination, video and joint-explorer logic are retained. Additional regression assertions run through `node dr-hamad/verify.cjs`.

## Active reference identity — 21 November 2026

The owner approved the supplied reference image and its explicit four-color palette: #BAD8E8, #E7E0D3, #FCFBF8 and #293F50. The current site uses Cairo as an available visual implementation match; the exact font in the raster reference is unidentified. The plain metallic H is displayed directly from the unchanged reference image through CSS cropping, replacing the circular seal in the active interface. The existing wave and mesh background continues in the new palette with reduced-motion support. See brand-identity/README.md for the current governing specification.
