# MUHAMI Frontend Kit

Reusable voice-first frontend shell for future projects.

## Reuse
Copy the `muhami` folder, then change only:
- brand/title in `index.html`
- translation strings and service labels in `app.js`
- CSS variables in `:root` for theme colors
- backend endpoints `MUHAMI_API` and `MUHAMI_VOICE_API`

## Typography
The UI is prepared for the supplied Al Qassam family:
- `fonts/al-qassam-normal.ttf`
- `fonts/al-qassam-bold.ttf`
- `fonts/al-qassam-extended.ttf`

Keep licensed font binaries private/appropriately licensed. The repository template intentionally does not embed or redistribute font binaries automatically.

## Components
Responsive header, language selector, voice selector, microphone state, voice preview, text composer, document picker, answer panel, service cards, RTL/LTR support, seven-language scaffold, secure backend hooks.

## Security
Never put API secrets, production DB credentials, or case files in the static frontend.
