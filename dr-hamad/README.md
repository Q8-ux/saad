# Dr Hamad S. AlEnezi — dedicated website

Public website: https://q8-ux.github.io/saad/dr-hamad/

An Arabic RTL website for د. حمد ساكت العنزي, separate from the existing Instagram preview. Uses the existing approved circular H seal and Cairo Regular, Bold and Extra Bold WOFF assets; the SIL Open Font License is included. Palette: navy, medical teal, silver, ice and white.

The doctor introduction and official clinic details come from the user's supplied doctor message: Al Razi Hospital, specialized clinics B, clinic 6, Tuesday morning. Appointment links go directly to https://ask.moh.gov.kw. No appointments are processed by this website.

The joint explorer is an original SVG educational schematic of knee and hip movement, replacement components and five illustrative assembly stages. It is not a validated biomechanical simulation, a 3D model or surgical instruction. Visitor controls use native buttons, ranges and requestAnimationFrame. Motion starts only when the visitor requests it and respects reduced-motion preferences.

Retains all 11 existing carousels, 8 slides each, including prior supplied archive content. No carousel wording changed. Search, categories, saved posts, deep links, sharing, keyboard navigation and swipes are available. Light, navy and pale teal themes stay within the approved main website palette. Saved posts stay in browser local storage.

The previous article “توقيت استبدال مفصل الركبة” remains linked to its existing public Site. Its source text was not recovered and has not been replaced or redated. The separate local editorial article “خشونة الركبة… من فهم الألم إلى قرار العلاج” provides primary references and its own current editorial date, distinctly from the research publication dates. References include NICE NG226, Cochrane 2024, IDEA JAMA 2013 and AAOS OrthoInfo. External AAOS animations are linked to the publisher; media has not been copied.

No fabricated portrait, testimonials, outcomes, qualifications, live availability, AI diagnosis, analytics or patient-data forms. The static website has no external dependencies; Cairo font files are served locally.

## Verification

- `node --check app.js`, `node --check experience.js`, `node --check site.js`.
- `node verify.cjs`: all 88 slides, navigation bounds, medical/archive filters, search and empty state.
- Local HTML checks: referenced assets, internal fragment targets, unique IDs, one H1 on each document.
- Browser QA at 320, 390, 768 and 1440 CSS px, plus mobile article reading. See `qa-results.json` for performed checks and limits.
- Actual Cairo Arabic and Latin glyph rendering is checked in the browser.

Deployment restores the current successful Pages artifact, overlays only `dr-hamad/`, and checks every unrelated published file remains byte-identical. The existing Instagram demo and unrelated projects remain separate.
