# Unknown: Killer Robots

Arabic RTL documentary watch page for Saad Alnabhan. Buildless HTML, CSS and JavaScript.

Film playback stays inside the page: the Telegram source uses a sandboxed embedded frame without popup or top-navigation permission. There is no external movie-opening action. The Telegram post itself could not be verified as a playable full film. Its availability remains a source dependency, and the UI does not claim successful playback just because a frame loads.

A native HTML video element supports a configured direct video URL (`film-media-config`, kind `video`, url set to an actual media file). It calls play from the watch action. The optional local-file control plays a selected video on that device without uploading or publishing it to other visitors. The separately labelled Netflix official trailer is not substituted for the full film.

All supplied film facts, five topics, central message, three questions and notes are retained. The supplied 4/5 rating is attributed to the submitted description, not represented as a verified IMDb score.

Al-Mohanad regular and bold fonts reuse the repository's Unicode-capable Dr Hamad assets, converted to WOFF. The earlier legacy symbol-encoded fonts have been removed. The footer contains only a small noninteractive vector WhatsApp mark and an outlined handwritten Saad Alnabhan signature. No contact number or contact link is present.

The signature outlines were shaped from Allura (Google Fonts, SIL Open Font License); see `dist/assets/SIGNATURE_FONT_LICENSE.txt`. Cover imagery is from Netflix's official trailer `YsSzNOpr9cE` and is credited on the page.

The scoped publisher preserves unrelated published files by comparing their hashes. Deploys use the repository's verified exact-artifact receipt helper.
