# صوتك — استوديو نسخ الصوت

Arabic RTL web workstation based on the actual Voicebox REST contracts at upstream commit `8af7efe62fab8d33e2a5dfbedabaa45f68a5184f`.

- Live client: https://q8-ux.github.io/saad/voice-cloning-studio/
- Source: https://github.com/Q8-ux/saad/tree/main/voice-cloning-studio
- Upstream: https://github.com/jamiepine/voicebox (MIT)

## What works locally

Microphone recording and uploads, real decoded waveforms, local capture storage, editable transcripts, script drafts, multitrack clip arrangement and WAV mixing, trimming, fades, speed/pitch, gain, reverb, delay, chorus, compression and filters, project export/import with embedded audio, backup/restore, dark mode, and mobile layout. Voice profiles and audio are never included in the public source repository.

## Connected ready voices and YouTube

The default web workflow now loads the actual ready-voice catalog and calls a lightweight synthesis service automatically, with no private Voicebox key needed for those bounded public tools. Ready voices are labeled separately from voice clones. The YouTube panel supports public search, official playback, time selection, authorized reference import, and local source provenance. Direct file upload remains available when the source refuses extraction. Supported desktop browsers can record user-selected tab audio through the browser permission picker; video frames are not recorded. This does not bypass source access restrictions.

## What needs a running Voicebox engine

Voice cloning, cloned-voice TTS generation, Voicebox preset/designed voices, STT/Whisper transcription, server profiles/import/export, history and job cancellation/retry/favorites, server effect versions, local LLM personality controls, model downloads/load/unload, and MCP. These controls call real upstream endpoints; no demo voices or fabricated results are returned. The client exposes nine engine choices present in the reviewed source; installed model capabilities must be checked on the host.

The deployed lightweight gateway is at `https://voicebox-engine-production.up.railway.app`. Health indicates gateway reachability only. The current hosting account limits services to 1 GB RAM and 2 vCPUs; no full inference engine is provisioned. A correctly authenticated request returns `engine_not_configured` until a capable Voicebox host is connected. No billing upgrade was made.

Configure `STUDIO_UPSTREAM_URL` and, if needed, `STUDIO_UPSTREAM_TOKEN` on the gateway host. Use the `server/Dockerfile.engine` recipe on a suitably resourced host. The default `server/Dockerfile` runs only the small authenticated streaming gateway. See [server/README.md](server/README.md) for the exact launch contract. Gateway token is kept in server environment variables and the user's browser session, outside public source. A remote upstream must use HTTPS; loopback HTTP is supported for local operation.

## Validation and deployment

```sh
npm run check
npm test
PYTHONPATH=server python3 -m unittest discover -s server/tests -p 'test_*.py'
python3 deployment/build.py
```

The GitHub Pages workflow restores the latest successful Pages artifact, updates this application only, checks unchanged hashes for every other site's file, and publishes. It refuses to replace unrelated sites when a valid prior artifact cannot be found. The shared full-site publisher also includes this project's generated `dist` output.

Browser checks used a synthetic two-second tone, not a real person's voice. Audio upload/decoding, radio processing, actual WAV output and the UI's empty/disconnected state are tested separately from inference. No clone, dialect similarity or AI transcription accuracy claim is made without an actual engine run and listening review. Microphone hardware permission/device behavior needs testing on the user's phone; browser page shortcuts do not inject text into other applications like desktop dictation.

Latest live checks: 32 Arabic ready voices returned, including Kuwait Fahed/Noura. With edge-tts7.3.1, actual Arabic synthesis returned an MP3 file (30,528 bytes). Public YouTube search returned real NASA results. Direct extraction on the tested cloud host returned youtube_blocked; import remains source-dependent, with upload/tab-capture alternatives. Speaker cloning remains dependent on a separately provisioned private inference host.

## Interface languages and visual design

Version 1.2 includes Arabic, English, French, Spanish, German, Turkish and Simplified Chinese. The selector changes UI text, accessible labels, direction and the requested ready-voice language. Arabic is RTL and the default; the other six are LTR. The 661 source strings include client controls, dialogs, validations and media-service errors. Typed scripts, transcripts, source titles and personal names remain unchanged. Actual engine language capabilities still govern cloning.

The default cosmic violet theme uses layered gradients and quiet flowing light, readable opaque panels, visible focus, and reduced-motion support. The light variant retains the violet palette. No new runtime dependency or remote translation service is used.
