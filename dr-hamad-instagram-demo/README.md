# Dr Hamad interactive education website

Updated 22 October 2026, retaining the existing public GitHub Pages URL.

- Arabic RTL, original circular logo and three bundled Al Mohanad font weights.
- Interactive SVG knee/hip motion, exploded implant components and five assembly stages. These are simplified educational diagrams, not 3D models or validated biomechanical simulations.
- Motion starts only on request; pause/reset controls; stops when the document is hidden; reduced-motion CSS.
- Existing 11 carousels / 88 slides retained, with category/search filters, saved posts, sharing, keyboard navigation and touch swipes.
- A newly written scientific article with an editorial update date, five primary references, anchor citations, print stylesheet and QR linking to the public article.
- AAOS animation links lead to the original publisher. Their media has not been copied, rehosted or presented as our own.

## Routes and verification

`index.html`: interactive site. `article.html`: article and references.

`node verify.cjs` exercises all 88 slides, navigation boundaries, filtering and empty search state. `node --check app.js` and `node --check experience.js` check syntax.

Actual browser checks covered model switching, component explanations, assembly steps, range endpoint, archive/medical filtering, search, opening slides, final slide boundary, save filter, journey stage and article references. Responsive frames at 320, 390, 768 and 1440 CSS pixels were checked for horizontal overflow; desktop and mobile screenshots were reviewed. The three font assets were checked for Arabic glyph coverage.

The previous full article was not recovered from the project or Library. An older article QR exists, and the October 6 content report records its missing full text and sources page. This article is a new editorial version, not a verbatim restoration or a claimed clinical sign-off by Dr Hamad.

## Applied paths

- Frontend Taste Path: existing-stack redesign, Arabic/identity/RTL controls, responsive verification.
- Native SVG educational interaction: custom implementation, no animation/3D dependency installed.
- The pre-existing Compositor/Canva adapter remains manual production configuration; it is not a live website integration.

The independent existing Pages workflow preserves other published websites. All changes remain within this project directory.
