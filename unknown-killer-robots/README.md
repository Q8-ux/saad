# Unknown: Killer Robots

Arabic RTL mobile documentary app for Saad Alnabhan. Buildless HTML, CSS and JavaScript, with four hash-linked screens and fixed bottom navigation.

The app manifest uses a standalone display, its own icon and a project-scoped start URL. A browser-dependent home-screen action uses an install prompt when available and clear instructions otherwise. The scoped service worker caches the public interface and documentary information; video requests, byte ranges, external origins and other projects bypass its cache.

The viewer uses custom inline controls for playback, seeking, sound and fullscreen. It has no download button, external movie-opening action, or native media overflow menu. The private source file identifier is not published in the frontend. This is a viewer UI restriction, not DRM or a guarantee against browser media inspection.

The supplied Drive file is private and was still processing when inspected. Its contents have not been copied or published. The film configuration is explicitly pending and full-film play actions are disabled until a separate display source is ready. No Drive-account permission is changed, and no private Drive URL is embedded.

A configured actual video source is played natively after the watch action. The separately labelled Netflix trailer is not substituted for the film.

All supplied film facts, five topics, central message, three questions and notes are retained. The supplied 4/5 rating is attributed to the submitted description, not represented as a verified IMDb score.

Al-Mohanad regular and bold fonts reuse the repository's Unicode-capable Dr Hamad assets, converted to WOFF. The earlier legacy symbol-encoded fonts have been removed. The footer contains a small vector WhatsApp mark and an outlined handwritten Saad Alnabhan signature. Both form one WhatsApp link using the previously supplied destination. The phone number is absent from visible text and accessible labels; it necessarily remains part of the link URL. The redundant header watch button and Netflix credit/link lines have been removed.

The signature outlines were shaped from Allura (Google Fonts, SIL Open Font License); see `dist/assets/SIGNATURE_FONT_LICENSE.txt`. Cover imagery is from Netflix's official trailer `YsSzNOpr9cE` and its provenance is retained here.

The scoped publisher preserves unrelated published files by comparing their hashes. Deploys use the repository's verified exact-artifact receipt helper.

Design: the established navy/cyan identity and real Mohanad fonts are retained. Large touch targets, safe-area spacing, readable Arabic and restrained screen transitions take priority over the earlier landing-page layout. All supplied details remain available across the four screens.
