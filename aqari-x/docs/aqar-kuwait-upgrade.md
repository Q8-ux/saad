# Kuwait property discovery — 1.4.0

## Design decision
The task is property discovery and enquiry, on a web application with Arabic/English/Urdu and RTL. Keep Aqari X's Cairo type, daylight green identity, office enquiries and existing account workflows. Use a compact search-first heading, short purpose/type shortcuts, visible result sorting, removable filter chips, paginated cards/list and an optional area map. The map groups counts at sourced area centres; it never claims property coordinates. Details use an accessible image gallery and similar public listings, keeping generated media notices visible. No Saudi identity, regulatory badges, copied listings or payments.

Loading, no matches, failed map tiles, unknown areas, missing photos and auth-required requests must be explicit. Images retain reserved space; controls remain keyboard and touch accessible. Responsive layout uses logical properties and supports long translated text. Avoid making the landing page taller before showing inventory.

## Reference evidence
Reviewed 28 October 2026: https://sa.aqar.fm/ , its map, request form, official help and an actual listing detail page (6893517). Adopt the useful discovery patterns, not Aqar's source, media or Saudi-specific data. Leaflet is locally vendored at 1.9.4. Area coordinates are sourced and licensed independently from property data. External tiles are fetched only while the visitor opens the map, with attribution and normal browser caching.

## Scope and limits
Search works on the office's current public inventory. The experimental external findings are a dated subset, not a live market feed. Generated photographs illustrate the prototype and never establish a property's real features. New filters are shared between browser and backend, including saved-search counts. Price per square metre is calculated only for sale listings with a total price and a known positive area; it is not an appraisal.

## Telegram source requested during implementation
The owner selected https://t.me/soogQ8. This environment's HTTP access returned a small “Site Unavailable / Unable to access this site” response, and search did not retrieve posts from that exact channel. **No posts were imported and no synthetic listings were presented as channel data.** No claim is made that the channel is private, empty or blocked for the user.

The office admin has a channel-specific public-preview fetch and Telegram Desktop single-channel JSON import. Raw exports stay in the browser; only editable field summaries leave it. Preview fetching is authenticated and rate-limited, targets only `https://t.me/s/soogQ8`, rejects redirects, bounds time/size and errors explicitly on an unavailable/non-preview page. It never requests Telegram credentials or a bot token. Both routes validate again server-side, remove contacts, ignore media and raw text, preserve source IDs/dates, check duplicates and save pending review. Source publication time uses a qualified timestamp or exported Unix time; bare local timestamps stay unknown. Illustrative AI images may appear only after a Telegram record is intentionally published as a reference; real uploads take precedence and active listings never inherit trial photos.

JSON exports are assumed to be from the operator-confirmed channel; exports without a username cannot establish channel identity themselves. Full-account and non-channel export formats are rejected. Extraction is provisional and must be reviewed, especially posts with multiple offers. No scheduled sync, historical completeness, notification delivery or live channel import was claimed or enabled.

## Validation
- 53 automated tests pass, including shared search filters, KWD semantics, pagination edges, approximate area grouping, sale-only unit price, public similar-listing selection, contact redaction in three digit scripts, export parsing, channel-bound HTML parsing, unavailable-source errors and pending import normalization.
- Browser: Arabic/English/Urdu, RTL/LTR, combined filters and no matches, native back, listing-ID search, page 2 URL, source-area selection and six loaded OSM tiles at a selected area. A three-image local fixture verified thumbnails, next, ArrowRight, fullscreen and Escape; existing one-image generated listings retain the notice and disable irrelevant next/previous controls.
- Responsive viewport fixtures (390px Arabic, 320px Urdu, 560px English) show no document-width overflow. These are CSS/browser emulations, not physical-device tests. Fixed the inherited mobile rule that hid the view switch so the map remains reachable on phones.
- Telegram import and review UI checked with clearly synthetic local fixtures, never published as ads. Anonymous requests to both new admin routes return 401. Actual authenticated import, channel network fetch from the production server and real media uploads remain untested without an operator account/export. No admin account was created or setup consumed.
- Versioned local module imports keep returning visitors from mixing old cached dictionaries/search code with this release. The preserved-pages workflow remains unchanged.
