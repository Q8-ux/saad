export const LEGAL_VOICES = ["marin", "cedar", "alloy", "ash", "ballad", "coral", "echo", "sage", "shimmer", "verse"] as const;
export type LegalVoice = typeof LEGAL_VOICES[number];
export const DEFAULT_LEGAL_VOICE: LegalVoice = "coral";
// Arabic has one fixed voice, independent of previous browser preferences.
export const ARABIC_LEGAL_VOICE: LegalVoice = "cedar";
export function resolveLegalVoice(language: string, requested: unknown): LegalVoice {
  return language === "ar" ? ARABIC_LEGAL_VOICE : isLegalVoice(requested) ? requested : DEFAULT_LEGAL_VOICE;
}
export function legalSpeechSettings(language: string, requested: unknown, format: "mp3" | "pcm") {
  const voice = resolveLegalVoice(language, requested);
  const arabic = language === "ar";
  const fast = !arabic && format === "pcm" && ["alloy", "ash", "coral", "echo", "sage", "shimmer"].includes(voice);
  return {
    model: fast ? "tts-1" : "gpt-4o-mini-tts",
    voice,
    ...(fast ? { speed: 1.05 } : {
      speed: arabic ? 0.9 : 1,
      instructions: arabic
        ? "تحدث بصوت رجالي عربي وبلكنة خليجية كويتية طبيعية، هادئ ومتأنٍ وغير مستعجل. انطق كل كلمة بوضوح، مع وقفات قصيرة طبيعية بين الجمل. حافظ على وضوح المصطلحات القانونية والأسماء والأرقام. اقرأ النص كما هو ولا تضف كلمات أو تغيّر المعنى."
        : "Read clearly in the language of the supplied text, with a calm professional legal tone and moderate pace. Add no words.",
    }),
  };
}
export const MAX_AUDIO_BYTES = 12 * 1024 * 1024;
export function isLegalVoice(value: unknown): value is LegalVoice {
  return typeof value === "string" && (LEGAL_VOICES as readonly string[]).includes(value);
}

// MIME alone is client supplied. Check the container before invoking transcription.
export async function validAudioContainer(audio: Blob): Promise<boolean> {
  const mime = audio.type.toLowerCase().split(";")[0];
  const bytes = new Uint8Array(await audio.slice(0, 32).arrayBuffer());
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  if (bytes.length < 12) return false;
  if (["audio/webm", "video/webm"].includes(mime)) return bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
  if (["audio/mp4", "audio/m4a", "audio/x-m4a", "video/mp4"].includes(mime)) return ascii(4, 8) === "ftyp";
  if (["audio/wav", "audio/wave", "audio/x-wav"].includes(mime)) return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WAVE";
  if (mime === "audio/ogg") return ascii(0, 4) === "OggS";
  if (["audio/mpeg", "audio/mp3"].includes(mime)) return ascii(0, 3) === "ID3" || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0);
  return false;
}

export type VoicePhase = "idle" | "requesting" | "listening" | "transcribing" | "analyzing" | "preparing" | "speaking" | "blocked" | "stopped" | "error";
export const voiceCopy = {
  ar: { start: "بدء المحادثة الصوتية", finish: "إنهاء الكلام وإرساله", stop: "إيقاف المحادثة الصوتية", play: "تشغيل الرد الصوتي", auto: "متابعة المحادثة تلقائياً", voice: "صوت المساعد", disclosure: "صوت مولّد بالذكاء الاصطناعي. يُحلّل كلامك مع سياق القضية والمكتبة القانونية.", hint: "خذ وقتك في الكلام. عند الانتهاء اضغط «إنهاء الكلام وإرساله». الوقفات لا تُرسل التسجيل. الحد الأقصى 12 ميغابايت.", placeholder: "اكتب هنا أو اضغط الموجة للتحدث…", newChat: "محادثة جديدة", phases: { idle: "جاهز للتحدث", requesting: "بانتظار إذن الميكروفون…", listening: "أستمع إليك…", transcribing: "أحوّل كلامك إلى نص…", analyzing: "أحلل القضية وأبحث في المكتبة…", preparing: "أجهّز الرد الصوتي…", speaking: "المساعد يتحدث…", blocked: "اضغط الموجة لتشغيل الرد", stopped: "توقفت المحادثة الصوتية", error: "توقف الصوت — يمكنك الكتابة أو المحاولة مجدداً" }, unavailable: "التحدث غير متاح في هذا المتصفح. افتح الموقع في Chrome أو Safari.", denied: "تعذر تشغيل الميكروفون. اسمح للموقع باستخدامه ثم حاول مجدداً.", empty: "لم ألتقط كلاماً واضحاً. اقترب من الميكروفون وحاول مجدداً.", failed: "تعذر إكمال المحادثة الصوتية. الرد المكتوب يبقى متاحاً.", tooLarge: "التسجيل أكبر من 12 ميغابايت. سجّل رسالة أقصر." },
  en: { start: "Start voice conversation", finish: "Finish and send speech", stop: "Stop voice conversation", play: "Play spoken reply", auto: "Continue conversation automatically", voice: "Assistant voice", disclosure: "AI-generated voice. Your speech is analysed with the case context and legal library.", hint: "Take your time. Press “Finish and send speech” when done. Pauses do not send the recording. Maximum 12 MB.", placeholder: "Type here or tap the waveform to speak…", newChat: "New conversation", phases: { idle: "Ready to speak", requesting: "Waiting for microphone permission…", listening: "Listening…", transcribing: "Transcribing your speech…", analyzing: "Analysing the case and searching the library…", preparing: "Preparing spoken reply…", speaking: "Assistant speaking…", blocked: "Tap the waveform to play the reply", stopped: "Voice conversation stopped", error: "Voice stopped — type or try again" }, unavailable: "Voice is unavailable in this browser. Open the site in Chrome or Safari.", denied: "Microphone could not start. Allow microphone access and try again.", empty: "No clear speech detected. Move closer and try again.", failed: "Voice conversation could not finish. The written reply remains available.", tooLarge: "Recording exceeds 12 MB. Record a shorter message." },
  ur: { start: "صوتی گفتگو شروع کریں", finish: "بات مکمل کرکے بھیجیں", stop: "صوتی گفتگو روکیں", play: "صوتی جواب چلائیں", auto: "گفتگو خودکار جاری رکھیں", voice: "معاون کی آواز", disclosure: "مصنوعی ذہانت کی آواز۔ آپ کی بات مقدمے کے سیاق اور قانونی لائبریری کے ساتھ تجزیہ ہوتی ہے۔", hint: "اطمینان سے بات کریں۔ مکمل ہونے پر «بات مکمل کرکے بھیجیں» دبائیں۔ وقفے سے ریکارڈنگ نہیں بھیجی جائے گی۔ زیادہ سے زیادہ 12 MB۔", placeholder: "لکھیں یا بولنے کے لیے صوتی لہر دبائیں…", newChat: "نئی گفتگو", phases: { idle: "بولنے کے لیے تیار", requesting: "مائیکروفون کی اجازت کا انتظار…", listening: "سن رہا ہوں…", transcribing: "آواز کو متن میں بدل رہا ہوں…", analyzing: "مقدمے اور قانونی لائبریری کا تجزیہ…", preparing: "صوتی جواب تیار ہو رہا ہے…", speaking: "معاون بول رہا ہے…", blocked: "جواب سننے کے لیے صوتی لہر دبائیں", stopped: "صوتی گفتگو رک گئی", error: "آواز رک گئی — لکھیں یا دوبارہ کوشش کریں" }, unavailable: "اس براؤزر میں آواز دستیاب نہیں۔ Chrome یا Safari استعمال کریں۔", denied: "مائیکروفون کی اجازت دیں اور دوبارہ کوشش کریں۔", empty: "واضح آواز نہیں ملی۔ قریب ہو کر دوبارہ کوشش کریں۔", failed: "صوتی گفتگو مکمل نہیں ہوئی۔ تحریری جواب دستیاب ہے۔", tooLarge: "ریکارڈنگ 12 MB سے زیادہ ہے۔ مختصر پیغام ریکارڈ کریں۔" },
} as const;
