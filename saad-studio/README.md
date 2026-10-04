# SAAD STUDIO — manual design-service storefront

GitHub Pages: https://q8-ux.github.io/saad/saad-studio/

The public frontend is a multi-page Arabic RTL service catalog, not an online design editor. The interface is Arabic only and uses Cairo from Google Fonts. The English brand name is retained. A teal/cobalt wavy mesh is decorative page background.

## Published surface

- Home, searchable all-services catalog, 10 category pages, service detail page, and ordering guide: 14 HTML pages.
- 50 defined services, each with a unique `service.html?id=...` detail URL, scope, requested inputs, and indicative dimensions.
- Service search and related services.
- Manual-order summary. WhatsApp handoff activates only when the owner provides a valid business number.
- No checkout or online payment. No order is submitted to or saved on a server by this storefront.

## Content and launch configuration

Edit `public/config.js`: `whatsapp` is international digits only; service `price` is a number in KWD, or null until confirmed. Only add owner-approved licensed previews to `templates` as `{id,title,image}`. No Canva marketplace templates have been imported. Rejected synthetic service illustrations have been removed. Until licensed samples are supplied, services render as text cards, without pretending they are Canva previews.

Do not publish private customer designs as catalog samples without approval. A Pro subscription is not a license to mirror the Canva marketplace. The Canva connector returned no available Brand Templates during this implementation.

Prices, WhatsApp number, real approved samples and payment configuration remain owner inputs. Website services explicitly distinguish interface design from development, hosting and payment integration. Printing is separate unless agreed.

## Development and deployment

`npm run check` checks JavaScript syntax. `npm test` covers the retained legacy server's account protections; it does not test storefront orders. Accounts remain disabled by default; the public catalog does not call legacy editor APIs.

The existing `.github/workflows/deploy-saad-studio.yml` preserves the latest combined Pages artifact and overlays `saad-studio/public`. Other projects in the shared repository must not be overwritten.

## Arabic-only interface

All 14 pages use Arabic RTL. The former translation scripts and localization source files remain archived in the repository but are not loaded or used by the site. Language query parameters do not change the interface.

## New Canva sample gallery (2026-10-04)

22 previews from four designs generated for this task, hosted as local WebP files. No prior user projects were used. samples.html supports search and each preview preselects its model in the local order summary. Original editable sources and scope are recorded in catalog-provenance.json. These are Canva-generated samples, not copied Pro marketplace templates. Resume, YouTube, business, education, events, packaging and website generation requests failed with quota_exceeded; no replacements from personal files were used.
