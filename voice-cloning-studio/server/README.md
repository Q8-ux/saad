# Voice studio inference service

The frontend lives in the parent directory and can run on GitHub Pages. This
service offers two deployment modes for the real
[Voicebox backend](https://github.com/jamiepine/voicebox). It does not fabricate
audio or mark inference as ready when no engine is connected.

## Choose a deployment mode

- `Dockerfile` (default): a lightweight authenticated gateway using HTTPX and
  Starlette. It fits a small host without installing Torch. Connect an existing
  capable Voicebox host with the server-side `STUDIO_UPSTREAM_URL` setting.
  Without that setting, every authenticated engine route returns HTTP 503 with
  `code: engine_not_configured`. Local browser recording/editing still work.
- `Dockerfile.engine`: the full CPU inference image with Voicebox pinned to
  `8af7efe62fab8d33e2a5dfbedabaa45f68a5184f`, upstream engine dependencies, CPU
  Torch and persistent models. Use a host with enough memory/disk for the
  intended models. This image has not been built by the lightweight gateway
  unit tests. It is not suitable for a 1 GB host.

The inspected Railway plan permits at most 1 GB RAM and 2 CPU; the default
deployment therefore uses the lightweight gateway, with no plan upgrade.

## Runtime configuration

| Variable | Value |
| --- | --- |
| `STUDIO_API_TOKEN` | Required random private key, at least 24 characters; store only in the hosting secret manager |
| `STUDIO_ALLOWED_ORIGINS` | Defaults to `https://q8-ux.github.io`; comma-separated explicit origins, never `*` |
| `STUDIO_MAX_UPLOAD_MB` | Defaults to 100, bounds encoded multipart requests as well as direct uploads |
| `PORT` | Hosting platform port; defaults to 8080 |
| `STUDIO_UPSTREAM_URL` | Proxy mode only: actual existing Voicebox base URL; HTTPS required except loopback, no embedded credentials/query |
| `STUDIO_UPSTREAM_TOKEN` | Proxy mode only: optional private upstream bearer key, stored on the server |
| `STUDIO_DATA_DIR` | Defaults to `/data`, use a persistent volume |
| `VOICEBOX_MODELS_DIR` / `HF_HOME` / `HF_HUB_CACHE` | `/data/models` in the image |

In engine mode, mount a persistent volume at `/data` and run one replica for
the SQLite database. Configure health checks on `/healthz` in either mode.
CPU inference RAM, disk and latency depend on the selected model. Model weights
are fetched on request, not baked into the image. A successful health check
establishes gateway startup, not engine connection, downloaded weights, Arabic
quality or successful inference. Keep a remote engine private behind a VPN or
actual upstream access control; never expose its unauthenticated API publicly.

For Railway monorepo deployment, set the service root to
`/voice-cloning-studio/server` and config-file path to
`voice-cloning-studio/server/railway.json` if the platform requires the full
repository-relative path. Set secrets and mount the volume before connecting
the repository source. Set no secret values in source files or the frontend.

For Docker, build this directory and pass secrets via the runtime environment.
Generate the key in a trusted secret manager. Do not put it into a committed
compose file, URL, build argument, or container log.

## Frontend contract

Set the frontend engine URL to the service origin plus `/api/voicebox`, for
example the actual deployed origin followed by that suffix. Every request
under this prefix requires `Authorization: Bearer <private key>`.
The key is never accepted in a query string. The upstream app is not exposed
at root or an alternative public route. `GET /healthz` is public and returns
only a static health marker.

The gateway strips the prefix and forwards all Voicebox routes, body bytes,
query strings, response bodies and status codes. It preserves upstream errors,
SSE output and audio downloads. It removes its own bearer credential before
invoking Voicebox. Multipart field names remain the upstream names: `file`
and `reference_text` for reference samples, and `file` for transcription.

Use `fetch()` with authorization for audio and SSE; bare `<audio src>` and
native `EventSource` cannot add the bearer header. Fetch audio to a Blob and
use an object URL. Read status with a streaming fetch or authenticated history
polling. Treat a queued generation as pending until completion, then fetch
`/audio/{generation_id}`. Revoke object URLs when no longer used.

The API key gives owner-level access to voices and model operations. This is a
single-owner studio, not multi-tenant authentication. Exact-origin CORS controls
browser access; the private bearer key is the authentication boundary.

## Checks

Run `python -m unittest discover -s tests -v` from this directory with
`starlette` and `httpx` installed. Tests exercise the real gateway with a
lightweight ASGI upstream and do not download or run speech models. The Docker
build installs upstream runtime/model dependencies and must be validated on the
deployment host; a local gateway test is not an inference benchmark.

## Connected media tools (v1.1)

The small host also serves bounded public routes under `/api/media/`: the current
ready-voice catalog, on-demand MP3 synthesis, YouTube search/inspection, and
10–30 second reference-clip imports. These routes have request/body/concurrency
limits and no access to private Voicebox records. Existing `/api/voicebox` routes
retain their required private bearer credential.

Ready-voice synthesis uses the Microsoft Edge online speech service through
edge-tts; the requested text is sent to that service. It is a preset voice,
not a clone of the user. History and returned audio are stored on the user's
browser, not in shared server history. Browser device voices are an additional
read-aloud option and cannot be downloaded as generated files.

YouTube imports require a rights confirmation, canonical YouTube video URL,
10–30 second bounds, a verified public recorded source <=2 hours, and a real
PCM mono 24 kHz WAV output. Source metadata and timestamps are retained with
locally saved references. Search/preview do not establish import availability.
When YouTube blocks extraction, the app retains its official embedded player
and directs the user to upload their authorized original file. No cookies,
login bypass, proxy rotation, PO tokens or CAPTCHA evasion are used.

## MOSS and Habibi cloning

`Dockerfile.engine` adds both engines to the pinned Voicebox API. Build the
image from this directory and run it on an inference host with a persistent
`/data` mount. Keep the small Railway gateway on its existing Dockerfile and
set its `STUDIO_UPSTREAM_URL` to the private inference service's
`/api/voicebox` endpoint. Set `STUDIO_UPSTREAM_TOKEN` to the inference host's
`STUDIO_API_TOKEN`. The upstream must use HTTPS unless it is on loopback.

| API engine | Model ID | Language and weights |
| --- | --- | --- |
| `moss_tts_nano` | `moss-tts-nano-onnx` | MOSS-TTS-Nano ONNX and its audio codec, Apache-2.0 |
| `habibi_tts` | `habibi-tts-msa` | Habibi specialized Modern Standard Arabic checkpoint, Apache-2.0 |

For a local installation, export a private `STUDIO_API_TOKEN` of at least 24
characters and run these commands in this directory:

```sh
docker build -f Dockerfile.engine -t sawtak-voicebox .
docker run --name sawtak-voicebox --rm -e STUDIO_API_TOKEN \
  -p 127.0.0.1:8080:8080 -v sawtak-voicebox-data:/data sawtak-voicebox
```

In the studio connection settings, use `http://127.0.0.1:8080/api/voicebox`
and the same access key when the browser is on that host.

The inference image has the runtime dependencies. It fetches the selected
engine's pinned weights into `/data/models/studio-cloning` on first load.
Use the existing Models page to monitor download and load state. The two new
engines share the CPU slot and release one model before loading the other.
Peak memory includes ONNX or Torch and its audio codec. Measure it on the
target host before selecting a capacity.

Use a Voicebox cloned profile with a reference recording and its exact
transcript. Both engines can use the same profile. If it has several samples,
they use the first sample and its matching transcript. Existing profiles,
generation jobs and WAV export go through the same authenticated API.

The `Verify Arabic voice cloning engines` GitHub workflow builds the inference
image and runs a short API generation through each engine using an Arabic
reference synthesized by eSpeak NG. The test checks WAV validity and model
state. Use an authorized recording to evaluate pronunciation and similarity
for a production voice.
