# SAAD STUDIO — manual design-service storefront

GitHub Pages: https://q8-ux.github.io/saad/saad-studio/

The public frontend is a multi-page Arabic RTL service catalog, not an online design editor. All interface typography uses locally hosted Al Mohanad. Category preview artwork retains six distinct display fonts loaded from Google Fonts.

## Published surface

- Home, searchable all-services catalog, 10 category pages, service detail page, and ordering guide: 14 HTML pages.
- 50 defined services, each with a unique `service.html?id=...` detail URL, scope, requested inputs, and indicative dimensions.
- Service search and related services.
- Manual-order summary. WhatsApp handoff activates only when the owner provides a valid business number.
- No checkout or online payment. No order is submitted to or saved on a server by this storefront.

## Content and launch configuration

Edit `public/config.js`: `whatsapp` is international digits only; service `price` is a number in KWD, or null until confirmed. Only add owner-approved licensed previews to `templates` as `{id,title,image}`. No Canva marketplace templates have been imported. Existing visual previews are original HTML/CSS service illustrations and are labeled as such.

Do not publish private customer designs as catalog samples without approval. A Pro subscription is not a license to mirror the Canva marketplace. The Canva connector returned no available Brand Templates during this implementation.

Prices, WhatsApp number, real approved samples and payment configuration remain owner inputs. Website services explicitly distinguish interface design from development, hosting and payment integration. Printing is separate unless agreed.

## Development and deployment

`npm run check` checks JavaScript syntax. `npm test` covers the retained legacy server's account protections; it does not test storefront orders. Accounts remain disabled by default; the public catalog does not call legacy editor APIs.

The existing `.github/workflows/deploy-saad-studio.yml` preserves the latest combined Pages artifact and overlays `saad-studio/public`. Other projects in the shared repository must not be overwritten.
