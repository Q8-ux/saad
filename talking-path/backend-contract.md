# Backend contract

## POST /api/voice/transcribe
Input: audio upload/form-data.
Output:
```json
{"text":"...","language":"ar"}
```

Recommended OpenAI adapter: speech-to-text/transcription model configured server-side.

## POST /api/voice/speak
Input:
```json
{"text":"...","language":"ar-KW","voice":"..."}
```
Output: audio bytes.

Recommended OpenAI adapter: TTS model configured server-side.

## Security
API keys stay server-side. Add authentication, rate limiting, request-size limits, logging without sensitive raw case content, and explicit retention rules.
