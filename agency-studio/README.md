# Agency Studio — Go-to-market content (pre-launch)

B2B White Label creative platform for marketing agencies. **Status: marketing content and static preview only**; the production SaaS, generation engine, customer accounts and billing are NOT implemented by this folder.

## Target audience
- Primary: Indonesian marketing agencies serving 3–30 brands, especially beauty, fashion, food and local commerce.
- Secondary: Vietnamese agencies after verifying language quality and local integrations.
- Agency buyer: founder, creative lead, operations lead.
- Core job: prepare, localize, review, deliver and organize ad creatives across several client brands.

## Positioning
**One organized workspace for every client brand — with creative production support when you need it.**

No invented metrics or testimonials. Do not promise automatic publishing, guaranteed sales, or AI quality without review.

## Pilot subscription hypotheses (USD / month)
| Plan | Price | Brands | Static creative draft credits | Ad copy draft credits |
| --- | ---: | ---: | ---: | ---: |
| Starter | $79 | 3 | 20 | 30 |
| Agency | $149 | 10 | 60 | 50 |
| Scale | $299 | 30 | 150 | 100 |

Managed production add-on: +$199/month — 8 approved final static designs + 2 short-form edits from client-provided footage/assets, one revision per deliverable. Not a promise of AI-generated video. Limited to subject-matter and asset checks.

**Pricing and capacity are unvalidated test offers**, not live billing. Rendered products will need usage metering and overage rates.

## Directory
- `index.html`: static 3-language buyer-facing landing page, with working language and package selectors; does NOT collect leads.
- `content/site.ar.md`: Arabic marketing content and service terms.
- `content/site.en.md`: English landing-page master copy.
- `content/site.id.md`: Bahasa Indonesia localized sales copy.
- `content/campaigns.md`: campaign copy, hooks, static/video creative briefs and post sequences.
- `content/outreach.md`: 30-day outreach, messages, agency qualification, conversion checkpoints.
- `content/onboarding.md`: onboarding, asset permissions and approvals.

## Launch safeguards
1. Keep client assets isolated by agency and brand, with role-based access and per-tenant storage.
2. Do not expose customer assets, names or lead lists in this **public GitHub repo**.
3. Add payment and user database only on a secure backend (not GitHub Pages).
4. Respect image/video music licensing, model output review, advertising policy, and opt-in commercial messaging.
5. Pilot before paid acquisition. Validate cost per creative, human QA time and intent to pay.

## GitHub
Repository: https://github.com/Q8-ux/saad
Project directory: https://github.com/Q8-ux/saad/tree/main/agency-studio
