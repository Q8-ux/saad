# Comment destinations

Every displayed comment uses the shared `commentSource` resolver. Results, saved opportunities, audience evidence, campaign sources, semantic report quotations and exports carry the same destination. Existing browser documents are enriched on read, without changing original text, identities, collection dates or issuing provider requests.

- `sourceUrl`: the button/export destination.
- `commentUrl`: direct comment destination, when available.
- `postUrl`: parent post retained separately.
- `sourceKind`: `comment` or `post`.
- `sourceStatus`: `provided`, `constructed`, or `post_only`. Constructed links are not represented as live-verified.

| Platform | Destination |
| --- | --- |
| Instagram | Preserve supplied comment link; otherwise `/p/{shortcode}/c/{id}/`. Replies with a root ID use `/c/{root}/r/{reply}/` (best effort). |
| YouTube | Preserve supplied link or construct `watch?v={video}&lc={comment}`; reply ID suffixes remain intact. |
| TikTok | Prefer provider `share_info.url`; otherwise construct the mobile `/v/{video}.html` share URL with `share_comment_id` and `share_item_id`. |
| Facebook | Preserve supplied link or add `comment_id`; replies also use `reply_comment_id`. Known base64 `comment:post_comment` IDs are decoded for routing only. |
| Reddit | Preserve the returned relative/absolute permalink; otherwise append the native `t1_` comment ID to the post path. |
| X | Each reply is its own status. Native status IDs point to `/i/status/{id}`; collected posts retain their own post URL. |

Missing IDs, synthetic identities, unsafe numeric IDs and incomplete reply ancestry never generate guessed comment identifiers. Their buttons explicitly say **المنشور فقط**. Platform login, deleted/private content and changes to platform routing can affect access; the resolver cannot guarantee that a remote platform still serves a comment.

Technical references:

- [Instagram comment permalinks](https://www.insightsocial.app/docs/api-reference/instagram/comment)
- [YouTube comment sharing](https://support.google.com/youtube/answer/6000976)
- [TikTok provider comment/share response](https://docs.scrapecreators.com/v1/tiktok/video/comments/)
- [Facebook provider comment IDs](https://docs.scrapecreators.com/v1/facebook/post/comments/)
- [Facebook comment/reply exporter](https://github.com/roeibh/facebook-comment-explorer)

Validation covers all six platforms, nested replies, exact provider links, old browser documents, hostile targets, missing IDs, stable identities and JSON/CSV/device exports. No paid collection or live personal dataset is needed for these checks.
