# Digizone — bilingual company website

Live: https://q8-ux.github.io/saad/digizone/

Arabic (RTL) by default, with a full English (LTR) switch and shareable `?lang=en` / `?lang=ar` links. Static HTML, CSS and JavaScript, local Al Mohanad fonts, responsive navigation, expandable service details, keyboard-accessible solution tabs, process, company profile, FAQ and project brief preparation.

## Contact configuration

The official company logo, approved contact details and client portfolio were not supplied. The current wordmark is text. No client testimonials, delivery statistics, partnership claims or copied reference-company contact details are published.

`config.js` accepts a confirmed company email and international WhatsApp number. Both are blank initially. The form prepares a brief locally and supports copy/download. It does **not** submit requests to a backend or claim they were received. Once approved contact details are entered, explicit email/WhatsApp sharing actions appear. For a central enquiry inbox, connect a real form endpoint and update the displayed privacy text.

Serve with `python3 -m http.server 8080` from this directory. There are no build dependencies, analytics trackers or external font requests.

## Content and assets

The user-provided dark navy, purple and pink code defines the visual direction. https://www.aldar-int.com/ was reviewed for the general corporate-site content structure. Copy is original; no Aldar portfolio, contact details, uptime promise or partner branding is reused. Service descriptions are proposed company copy and need commercial approval before use as contractual commitments.

Hero: original generated abstract artwork. Fonts: the Al Mohanad files already used by this owner's existing sites; commercial font rights should be confirmed by the owner. A supplied approved logo can replace the temporary text wordmark and simple favicon.

The deployment workflow restores the most recent successfully published Pages artifact, overlays only `digizone/`, verifies preserved files and publishes the combined artifact. It fails if no intact baseline exists.
