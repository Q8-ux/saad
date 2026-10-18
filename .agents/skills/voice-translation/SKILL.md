# مسار الترجمة الذكية | Voice Translation Path

## When to invoke
For requests to transcribe, translate, subtitle or index spoken content from videos, audio and permitted YouTube URLs inside Q8-ux/saad projects.

## Non-negotiable steps
1. Obtain the actual media/audio or a legitimate, accessible YouTube URL. Never infer a spoken dialogue from still frames.
2. Check content rights, confidentiality and client consent before sending speech text to an external translation provider.
3. If the media is sensitive (legal, medical, family/private): use transcription-only by default. Do not send its text to Google Translator; translation requires a locally operated approved provider or explicit informed user decision.
4. Choose the source language or auto-detect, then perform actual ASR via the private backend in `voice-translation-path/api.py`.
5. Translate the *actual* transcript, preserving source sentences and timestamps. Never invent dialogue. Mark unintelligible speech as uncertain.
6. Provide the translated transcript, original transcript, SRT/VTT and a separate interpretation; visual event description additionally needs video-frame analysis and must not be conflated with audio transcription.
7. Verify proper names, technical terminology, Arabic RTL layout and timing before publication.
8. Do not claim the feature is live merely because code has been committed. Check deployment, authorization, network dependencies and media tests.

## Runtime contract
- `POST /api/translate` `multipart/form-data`: `file` or `youtube_url`, `source_language`, `target_language`; header `X-API-Key` when configured.
- Output: `original_text`, `translated_text`, `segments[]`, `srt`, `vtt`, `source_language`.
- `GET /api/health`: liveness only.
- Implementation and deployment: `voice-translation-path/README.md`.

## Scope of Voice-Pro
Reference: https://github.com/abus-aikorea/voice-pro . Voice-Pro itself is not embedded; the independent translation API uses faster-whisper / yt-dlp / Deep Translator. Optional audio dubbing and voice cloning require separate Voice-Pro installation, runtime review and consent.

## Project routing
- Preferred: `ai-video-studio/`, `youtube-studio-ai/`, `saad-script-studio/`, `barcode/` and `noura-alattal/` via backend integration, each behind its own feature flag.
- Do not introduce this integration into `sabeq-legal/`, `legal-memo-platform/` or other sensitive projects without their own project-specific privacy and security review.
- Do not change unrelated project code when adding or maintaining this shared skill.
