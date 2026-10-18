# راصد الطلبات ونمو الحسابات

Private Arabic RTL research workspace for Saad. Discover public requests for a service by topic and country evidence; turn the observed questions into content ideas and measure account growth.

## Implemented

- Topic, country, platform and date filters; normalized Arabic keyword matching and explicit request/ad rules.
- Source post URL, native comment ID when available, original text, collection time and auditable location evidence. A country mentioned in a comment does not establish the author's residence. Unknown countries remain separate.
- Bounded live provider adapters for Instagram, TikTok, YouTube, Reddit and indexed public X posts. Facebook takes explicit post URLs. Each source reports failures, uncollected cursors, request counts and estimated/reported credit usage.
- JSON, JSONL and CSV imports; nested replies in `answers`/`replies`; duplicate detection; saved opportunities and CSV export.
- Growth section: topic groups grounded in collected quotations, proposed content hooks and calls to follow, matched-content experiment guidance, and persistent per-account growth measurements.
- Private hosted access, authenticated API routes, same-origin mutations, and owner-scoped D1 records. Provider keys stay server-side. No outbound messaging, automatic following or social publishing.

## Source connection and coverage

Set `SCRAPECREATORS_API_KEY` in the hosting secret manager. No credential is included and no provider account has been connected or live-tested in the initial build. Import/search works without a provider key. Live calls are initiated only by an authenticated search submission. Credit limits are conservative estimates; actual provider charging is external and may differ. There are no automatic retries or paid calls during builds/tests.

Instagram keyword discovery is limited to Google-indexed reels returned by the provider, followed by bounded comment retrieval. Explicit post/Reel URLs are also supported. X uses the provider's indexed-public-post search; it is not a complete reply search. TikTok/YouTube discover a bounded set of videos and fetch a comment page per selected video. Reddit uses the provider's comment search. These are not exhaustive social-platform indexes. Older pages and complete child reply threads may remain uncollected; the run report records this.

`score` is a transparent keyword/request/location match heuristic, not the probability that a person will buy or follow. Content grouping is a preliminary keyword grouping, not an installed BERTopic model. Follower/profile-visit ratios are proxies, since follows can happen away from a profile page. Missing denominators show unavailable.

## GitHub Pages edition

The `github-pages/` entry point reuses the research core and dashboard in a browser-only edition. Imports, searches, saved items and account growth measurements are stored in IndexedDB on the current browser. It starts empty; no account is authenticated and no live provider is connected. This edition is a public application interface, while its local records remain on the current device. Direct platform searches require a separately connected secure backend and are explicitly unavailable here.

Build with `node scripts/build-github-pages.mjs`, then verify with `node scripts/verify-github-pages.mjs` and `node --test tests/radar.test.mjs tests/pages-workspace.test.mjs`. The publication workflow overlays the verified `pages-dist/` folder onto the latest successfully deployed Pages snapshot and checks that every unrelated file is byte-identical.

## Development

Use Node 22.13+. Install with the included Sites dependency helper or the repository's pnpm lockfile. Run `node --test tests/radar.test.mjs` and `node node_modules/typescript/bin/tsc --noEmit`. Run `npm run db:generate` after schema changes. Build through the included Sites build integration. The app requires D1 binding `DB` and the hosting authentication boundary; the public GitHub source is not itself a private live backend.

## Audited primary sources (2026-10-18)

- [Agent-Reach](https://github.com/Panniantong/Agent-Reach): routing and diagnostics; its OpenCLI `instagram search` searches users.
- [OpenCLI Instagram adapter](https://github.com/jackwener/OpenCLI/blob/main/docs/adapters/browser/instagram.md): profiles, posts, followers/following. `comment` is a write operation; follower completeness is not established by the command's existence.
- [instagrapi](https://github.com/subzeroid/instagrapi): comment and reply APIs; optional Python collector route, not part of this Worker runtime.
- [Instaloader](https://github.com/instaloader/instaloader): `Post.get_comments()` and reply iterators; alternate archival route.
- [BERTopic](https://github.com/MaartenGr/BERTopic): optional future semantic topic analysis; not installed in this release.
- Provider API specifications: `/v2/instagram/reels/search`, `/v2/instagram/post/comments`, `/v1/twitter/search/posts`, `/v1/tiktok/search/keyword`, `/v1/tiktok/video/comments`, `/v1/youtube/search`, `/v1/youtube/video/comments`, `/v1/reddit/search`, `/v1/facebook/post/comments` on the provider's official API documentation.

Native platform inspiration: Meta's public ranking explanation, Instagram Trial Reels, TikTok Comment Insights, and YouTube native title/thumbnail experiments. The app's editorial suggestions do not claim access to proprietary ranking formulas.
