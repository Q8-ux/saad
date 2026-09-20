# AutoClip Studio integrations

This is an independent Node 22+ integration gateway. It is not a replacement for the AutoClip Python/Whisper/FFmpeg engine. It has no third-party Node dependencies. The website can perform local editing without this service.

Run `node --env-file=.env server.mjs` after copying `.env.example` to a private `.env` and setting a random `STUDIO_ACCESS_TOKEN` of at least 24 characters. Use a different key for each underlying service. Do not commit `.env`, private keys, or media. The browser accepts only the gateway access token, held in memory until the tab closes.

Configure HTTPS, `ALLOWED_ORIGINS=https://q8-ux.github.io`, and the services needed:

| Route | Existing service / input | Required configuration |
| --- | --- | --- |
| AutoClip | Original engine; connected separately in Studio | AutoClip server with `/api/v1/health/`, `/projects/upload`, project processing, clip APIs; server-side LLM/Whisper setup and CORS |
| Research | `masar-analysis` in this repository | `MASAR_API_URL`, `MASAR_API_KEY`; `MASAR_USE_LLM=true` only with a configured model |
| VoiceStudio | Existing `route10-hub` `/api/audio/generate` | `ROUTE10_HUB_URL`, `ROUTE10_HUB_TOKEN`; provider configured on the hub |
| Poolday | Existing hub `/api/video/generate` | Provider URL/key configured on the hub |
| MoneyPrinterTurbo | Existing hub `/api/chinese/generate` | Provider URL/key configured on the hub |
| OpenShorts | Existing hub `/api/campaigns` | Provider API key configured on the hub; used only for a new source, never reprocesses existing Studio clips |
| Documents | `markitdown-service` `/v1/convert` | `MARKITDOWN_API_URL`, `MARKITDOWN_API_KEY` |
| Agents | **Block Buzz** CLI | `BUZZ_CLI_PATH`, `BUZZ_RELAY_URL`, `BUZZ_PRIVATE_KEY`, `BUZZ_CHANNEL_ID` |
| Captions | SRT/VTT import from VoiceStudio/AutoClip/other tools | Local, no server; no automatic speech-recognition claim |
| Quality | Local timing, duration, duplicate validation | Local; editorial accuracy still needs human review |

The hub must register product `autoclip-studio` with pillar `highlights`. The companion repository change adds this alongside the existing chess product. Gateway capabilities verify the hub's provider configuration and product registration. This does not certify the upstream provider; the first real job may report a provider failure.

Buzz is `block/buzz`, the agent collaboration platform. It is **not** the unrelated speech-transcription application with the same name. Install the documented Buzz CLI from that repository on a compatible server, use a narrowly scoped identity, and set the existing private review channel. The default gateway Docker image does not contain Buzz. The UI explicitly sends a review request only after the user clicks that action. Success means delivery to the channel, not completion of an AI review. No request is sent on page load, export, or ordinary editing.

VoiceStudio and Poolday go through the user's existing hub contract. The hub expects a compatible provider endpoint; this project does not claim that the native desktop VoiceStudio exposes the hub's `/generate` contract automatically. Check or provide the appropriate adapter when activating it.

Routes use server-only credentials, allowed origins, finite request sizes and timeouts, authentication on all private operations, bounded response sizes, and idempotency keys. No source scripts or provider errors are logged. No automatic social posting is implemented. Idempotency and rate limits are in memory and are reset on restart; use one process until adding a shared store. The gateway is for this owner's workspace, not a public multi-user SaaS with separate accounts.

The app ships prepared integrations, not pre-provisioned AI accounts or secret keys. No service is marked configured merely because its UI exists. GitHub Pages serves the website but does not execute this gateway or the original AutoClip engine.
