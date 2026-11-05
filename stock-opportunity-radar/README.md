# بوصلة الاستثمار الخليجي — Gulf Investment Compass

**Status:** A multilingual informational directory with an official-source country and sector guide, photo attribution, and a browser-supported voice interface. Last manual source check: **2026-11-05**.

**Current production URL (requires deployed Pages workflow):**
https://q8-ux.github.io/saad/stock-opportunity-radar/

**GitHub:** https://github.com/Q8-ux/saad/tree/main/stock-opportunity-radar

## What is included
- 6 countries: Saudi Arabia, UAE, Qatar, Oman, Bahrain, Kuwait.
- 6 interface and reference-summary languages: Arabic, English, Bahasa Indonesia, Vietnamese, Hindi, Traditional Chinese.
- Country-specific summaries of foreign-ownership/licensing frameworks and links to official primary sources.
- An investment directory that distinguishes **officially listed individual projects** (currently 3 from the official Invest Oman project explorer) from **sector portals** (not investable securities or confirmed listings).
- Actual geographic photographs from Wikimedia Commons, with attributed authors and license/source links in each country card. **These photos illustrate the country, not the investment project or its availability.** Further rights review, including freedom-of-panorama issues, is required for commercial redistribution in some jurisdictions.
- Browser-side typed reference assistant grounded only in the verified curated country descriptions and official links. It is *not* a generative AI model, does not have autonomous access to law updates, and does not give financial/legal advice.
- Browser voice recognition and text-to-speech using the existing `talking-path` adapter copied **unchanged** to `assets/talking-path.js`. Browser support varies; live voice AI and VoiceStudio server integration remain unconnected.
- Fast local search and filters (country, sector).
- Original technical Stock Opportunity Radar CSV screener preserved at `stocks/index.html`:
  https://q8-ux.github.io/saad/stock-opportunity-radar/stocks/

## Source authority and maintenance
- Saudi MISA investment law and official registration FAQ: https://misa.gov.sa/activities/laws-regulations-copy/ / https://misa.gov.sa/ar/frequently-asked-questions/
- Saudi Invest Saudi sectors: https://investsaudi.sa/sectors
- UAE Ministry of Economy and Tourism incentives/ownership: https://www.moet.gov.ae/en/investment-incentives
- Qatar Invest Qatar ownership and law 1/2019: https://www.invest.qa/en/resources/laws-and-regulations/foreign-ownership
- Qatar Invest Qatar opportunity sectors: https://www.invest.qa/en/sectors-and-opportunities/opportunities
- Oman Invest Oman project explorer and FAQs: https://www.investoman.om/investment-opportunities / https://www.investoman.om/resources/faqs
- Bahrain Ministry of Industry and Commerce regulations: https://moic.bh/en/regulations
- Bahrain EDB sectors and opportunity hub: https://www.bahrainedb.com/ar/opportunities/investable-projects/
- Kuwait KDIPA investment law 116/2013 and decisions: https://kdipa.gov.kw/ar/about-kdipa/law-decisions/
- Kuwait KDIPA official portal: https://kdipa.gov.kw/

Sources are linked per country/project directly in the interface. Financial data, capital and project listing statuses are *not* independently audited by this platform. Each jurisdiction can amend rules without advance notice. Laws may be different by nationality, sector, residency, entity type and location.

## Photography
See `guide-data.js` for the six Wikimedia Commons source page URLs, authors and specific Creative Commons licenses. The app loads images via Wikimedia's Special:FilePath endpoint and displays attribution inline. Do not claim that a skyline/nature image documents a specific listed investment. Confirm both the photographer's license and applicable architectural or personality rights before paid marketing reuse.

## Source directory structure
- `index.html`: Gulf Investment Compass landing and assistant UI.
- `guide.css`: responsive multilingual styles.
- `guide-data.js`: cited countries, regulations, sector gateways, published project links, translations and photo attribution.
- `guide.js`: interface filtering, source-grounded reference assistant, voice interactions.
- `assets/talking-path.js`: existing reusable Talking Path voice adapter.
- `stocks/index.html`: unchanged stock technical screener with CSV importer and synthetic demo data; *not* the investment guide.
- `.github/workflows/deploy-stock-opportunity-radar.yml`: Pages publishing and smoke verification, preserving other published apps.

## What is NOT ready
- Real-time regulatory tracking or automatic verification of project status.
- Legal representation, migration/visa determinations or individualized investment advice.
- Live AI conversational backend, externally hosted VoiceStudio, live voice agent or user accounts.
- Project submissions, investor lead capture, verified photo sets per investment asset, subscriptions or payment.
- Licensed data feeds, live stock prices, or execution of share orders.
- Native-speaker legal/editorial approval of all four additional Asian language variants.

## Next release prerequisites
1. Editorial approval by jurisdiction specialists and native speakers, and a source-refresh schedule.
2. Obtain a proper licensed official project image library and verify individual project status by contacting issuing authorities.
3. Implement a secure server-side AI assistant with retrieval limited to approved source documents, date awareness and source citations. Do **not** publish API keys in GitHub Pages.
4. Integrate authorized speech backend if needed; browser Talking Path is only the no-key fallback.
5. Investor enquiries only through a protected opt-in contact workflow, with privacy and retention policies.
6. Never hold investor deposits or promise returns without appropriate licences and professional advice.

This directory is independent of and not endorsed by the Gulf governments. It is intended for research, not legally binding advice.


## Radar of verified government opportunities (November 2026)

The homepage contains a **source-backed opportunity monitor** that never shows demo listings. It is distinct from the manually curated investment-sector cards and from the historic stock screener.

### Operational model

- Frontend: \`radar.js\` reads the current validated JSON snapshot from GitHub's raw main-branch data file; it uses the published Pages JSON only as a fallback.
- Pipeline: \`.github/workflows/refresh-gulf-opportunities.yml\` checks official public sources **every 2 hours** (subject to GitHub scheduling delays) and commits \`data/live.json\` to \`main\`.
- Collector: \`scripts/fetch_official_opportunities.py\` uses ordinary GET plus an official public-page browser render where needed. No credentials or CAPTCHA bypass.
- Initial sources:
  - Bahrain Tender Board's publicly published tenders. If a public listing cannot be extracted reliably, it is explicitly marked **unavailable** instead of silently fabricating records.
  - Invest Oman's investment opportunity explorer: individual project page, title, published OMR capital and observation time, derived from the official rendered page.
  - Saudi Arabia, UAE, Qatar and Kuwait are **official portal links only** pending tested accessible public feeds. They are **not** falsely marked connected.
- The official record URL is mandatory. Government tenders with an expired closing date are excluded. Project availability is never assumed from being listed.
- The UI hides all radar results when the newest snapshot is over 195 minutes old or schema validation fails. That is a reliability safeguard: the user sees an explicit outdated/unavailable message.
- **Live** means periodic official-source refresh; this is NOT a streaming subscription, immediate change notification, guaranteed open project, or investment advice.

### Trust controls

- Never place scraping credentials in GitHub. Respect government portal access controls; only access openly published material.
- Verify source terms and redistribution permissions before commercializing a high-volume feed.
- Project photos must be supplied/licensed separately; generic skyline country photography is not evidence of a particular opportunity.
- Source timestamps prove collection time, not the time an issuer last edited a tender.
- Every issuer's official tender/procurement document and project contract overrides the portal summary.
- If any source stops returning verifiable records, the source status goes to **unavailable** and previous records from that source are not reused.
