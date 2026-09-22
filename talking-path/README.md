# مسار التحدث | Talking Path

وحدة صوتية قابلة للتركيب على أي مشروع.

## التدفق
Mic -> STT -> project agent/API -> text answer -> TTS -> speaker

## Modes
- free-browser: Web Speech Recognition + SpeechSynthesis when supported.
- openai: secure backend adapters for STT/TTS.
- realtime-ready: interface contract for a future realtime speech adapter.

## Install
Copy `talking-path` into your project and include:
```html
<script src="./talking-path/talking-path.js"></script>
```

Then:
```js
const talk = TalkingPath.create({
  mode: "free-browser",
  language: "ar-KW",
  onText: async (text) => {
    const answer = await yourAgent(text);
    await talk.speak(answer);
  }
});
talk.start();
```

Never expose OpenAI API keys in browser code. For OpenAI mode, point the adapters to protected backend endpoints.
