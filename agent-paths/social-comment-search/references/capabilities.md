# Audited collection routes

Reviewed 2026-10-18. Repository documentation and function existence establish a capability contract, not a successful read from a particular account/network. Verify again after upstream changes.

| Route | Demonstrated capability | Important boundary |
| --- | --- | --- |
| [Agent-Reach](https://github.com/Panniantong/Agent-Reach) | Selects tools and checks configured channels | A router; it does not itself index every social comment |
| [OpenCLI Instagram](https://github.com/jackwener/OpenCLI/blob/main/docs/adapters/browser/instagram.md) | User search, profiles, recent posts, Explore, followers/following | Requires an authorized Chrome session. `comment` writes a comment. `user` returns a comment count, not all texts |
| [instagrapi](https://github.com/subzeroid/instagrapi) | Comment pages and threaded replies | Unofficial endpoints are fragile and may require an existing authorized session |
| [Instaloader](https://github.com/instaloader/instaloader) | `Post.get_comments()` and `PostComment.answers` | Instagram may restrict access; do not promise exhaustive history |
| [TikTok-Api](https://github.com/davidteather/TikTok-Api) | Video comments via the original library | Public-route/session infrastructure can fail; check current examples |
| [yt-dlp](https://github.com/yt-dlp/yt-dlp) | YouTube comment extraction and bounded replies | `--write-comments`, `--skip-download`, `--write-info-json`, extractor `max_comments`; not an all-platform comment engine |
| [PRAW](https://github.com/praw-dev/praw) | Reddit comment forests and replies | Requires authorized API access; bound `replace_more`, and report remaining placeholders |
| [MediaCrawler](https://github.com/NanmiCoder/MediaCrawler) | Comments on supported Chinese platforms | Do not claim Instagram support; review its platform list and license before product embedding |
| ScrapeCreators | Hosted search/comment endpoints for multiple platforms | Requires a paid-service account/key. Discovery and comments are different endpoints |

## Instagram source audit

The reviewed instagrapi source declares version 3.0.26. The comment mixin blob audited was `446ad6c448f82680e4b449d598da0adf832918cc`:
[comment.py](https://github.com/subzeroid/instagrapi/blob/master/instagrapi/mixins/comment.py).

Relevant methods include `media_comments_public_gql_chunk(code, end_cursor)`, `media_comments_gql_chunk(media_pk, end_cursor)`, `media_comments_chunk(media_id, max_amount, min_id)` and `media_comment_replies_chunk(media_id, comment_id, max_amount, min_id)`. Inspect current method signatures before calling. A chunk helper may issue internal requests; a script-level call count is not a strict HTTP-request count. `amount=0` helpers can exhaust pagination and should not be the default.

OpenCLI's reviewed `followers.js` fetches one followers page with `count=limit` and no continuation loop. Its `following.js` does paginate. Do not generalize one command's coverage to the other. Sources: [followers.js](https://github.com/jackwener/OpenCLI/blob/main/clis/instagram/followers.js), [following.js](https://github.com/jackwener/OpenCLI/blob/main/clis/instagram/following.js), [comment.js](https://github.com/jackwener/OpenCLI/blob/main/clis/instagram/comment.js).

## Hosted provider routes

Read the current primary endpoint spec before any remote implementation or paid call:

- [Instagram comments](https://docs.scrapecreators.com/v2/instagram/post/comments/): `url`, `cursor`, optional `include_replies`. The reply option has materially higher credit cost. A success rate statement is the provider's claim, not a guarantee.
- [Instagram reel discovery](https://docs.scrapecreators.com/v2/instagram/reels/search/): Google-indexed reels, not a complete Instagram-native search.
- [X public post search](https://docs.scrapecreators.com/v1/twitter/search/posts/): indexed public posts, not a complete reply crawl.
- [Reddit comment search](https://docs.scrapecreators.com/v1/reddit/search/): use `filter=comments`; check result schema and continuation.
- [TikTok comments](https://docs.scrapecreators.com/v1/tiktok/video/comments/openapi.json): accepts `url`, `cursor`; it has no author-country filter.
- [YouTube comments](https://docs.scrapecreators.com/v1/youtube/video/comments/openapi.json): `url`, `continuationToken`, order. A reply continuation token is evidence of uncollected replies, not a full thread.

For owned professional Instagram media, official Meta access is preferable where it covers the task. It does not grant arbitrary access to every account's comments. Primary overview: [Meta's Instagram API collection](https://www.postman.com/meta/instagram/folder/u4g5a2a/instagram-api-with-facebook-login).
