"use client";
import { useEffect, useRef, useState } from "react";
import { Mic, Send, Sparkles, X } from "lucide-react";
import { MAX_AUDIO_BYTES } from "@/lib/legal-voice";
import { MAX_MEMO_STORY_CHARS, understandMemoStory } from "@/lib/memo-dictation";
import { interfaceError } from "@/lib/interface-language";

type Props = {
  active?: boolean; language: "ar" | "en" | "ur"; disabled: boolean;
  initialText: string; facts: string; requests: string;
  request: (path: string, init: RequestInit) => Promise<Response>;
  onBusy: (busy: boolean) => void;
  apply: (data: Record<string, string>, text: string) => void;
};
const labels = {
  ar: { title: "احكِ تفاصيل قضيتك وما تريد الوصول إليه", hint: "اكتب أو تحدث بطريقتك في هذا المربع. سيفهم المساعد الوقائع والطلبات ويستخلصها تلقائيًا عند المتابعة.", placeholder: "ماذا حدث؟ مع من؟ وماذا تريد؟ يمكنك ذكر الأسماء والتواريخ والمبالغ كما هي.", record: "بدء التسجيل", finish: "إنهاء الكلام وفهم القضية", cancel: "إلغاء", listen: "أستمع إليك…", working: "أفهم الوقائع والطلبات…", analyze: "فهم الوقائع والطلبات", review: "ما فهمه المساعد — راجعه وعدّل القصة أعلاه إن احتاجت تصحيحًا", facts: "الوقائع", requests: "الطلبات", missing: "لم تذكر بعد", done: "تم استخلاص البيانات تلقائيًا. راجع ما فهمه المساعد قبل المتابعة.", error: "تعذر فهم القضية. بقي النص محفوظًا؛ أعد المحاولة.", large: "تجاوز التسجيل 12 ميغابايت. سجّل مقطعًا أقصر." },
  en: { title: "Describe your case and the outcome you want", hint: "Write or speak naturally in this one box. The assistant extracts facts and requests automatically when you continue.", placeholder: "What happened, who was involved, and what do you want? Keep names, dates and amounts as stated.", record: "Record", finish: "Finish and understand the case", cancel: "Cancel", listen: "Listening…", working: "Understanding facts and requests…", analyze: "Understand facts and requests", review: "Assistant summary — review it and edit the story above to correct it", facts: "Facts", requests: "Requests", missing: "Not stated yet", done: "Details extracted automatically. Review the summary before continuing.", error: "The case could not be understood. Your text is retained; try again.", large: "Recording exceeds 12 MB. Record a shorter message." },
  ur: { title: "اپنا معاملہ اور مطلوبہ نتیجہ بیان کریں", hint: "اسی ایک خانے میں لکھیں یا بولیں۔ آگے بڑھنے پر معاون حقائق اور مطالبات خود اخذ کرے گا۔", placeholder: "کیا ہوا، کس کے ساتھ اور آپ کیا چاہتے ہیں؟ نام، تاریخیں اور رقوم بتائیں۔", record: "ریکارڈ کریں", finish: "مکمل کرکے معاملہ سمجھیں", cancel: "منسوخ", listen: "سن رہا ہوں…", working: "حقائق اور مطالبات سمجھ رہا ہوں…", analyze: "حقائق اور مطالبات سمجھیں", review: "معاون کی سمجھ کا جائزہ لیں؛ تصحیح کے لیے اوپر اصل تفصیل بدلیں", facts: "حقائق", requests: "مطالبات", missing: "ابھی بیان نہیں ہوا", done: "معلومات خود اخذ ہوگئیں؛ آگے بڑھنے سے پہلے جائزہ لیں۔", error: "معاملہ سمجھ نہیں سکا؛ آپ کی تحریر محفوظ ہے۔ دوبارہ کوشش کریں۔", large: "ریکارڈنگ 12 MB سے زیادہ ہے۔" },
};
export default function MemoVoiceInput({ language, disabled, request, apply, onBusy, initialText, facts, requests, active = true }: Props) {
  const t = labels[language];
  const [phase, setPhase] = useState<"idle" | "listening" | "working">("idle");
  const [text, setText] = useState(initialText);
  const [notice, setNotice] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const sending = useRef(false);
  const recorder = useRef<MediaRecorder | null>(null), stream = useRef<MediaStream | null>(null), abort = useRef<AbortController | null>(null), epoch = useRef(0), mounted = useRef(true);
  useEffect(() => { setText(initialText); setNotice(""); setWarnings([]); }, [initialText]);
  useEffect(() => { onBusy(phase !== "idle"); }, [phase, onBusy]);
  function release() { const r = recorder.current; recorder.current = null; if (r) { r.onstop = null; r.ondataavailable = null; r.onerror = null; if (r.state !== "inactive") r.stop(); } stream.current?.getTracks().forEach(track => track.stop()); stream.current = null; }
  function cancel() { epoch.current++; abort.current?.abort(); release(); setPhase("idle"); }
  useEffect(() => { if (!active) cancel(); }, [active]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; epoch.current++; abort.current?.abort(); release(); }; }, []);
  const alive = (id: number) => mounted.current && id === epoch.current;
  async function understand(value: string, id: number, signal: AbortSignal) {
    const result = await understandMemoStory(request, value, language, signal);
    if (!alive(id)) return;
    setText(result.text); setWarnings(result.warnings); apply(result.fields, result.text); setNotice(t.done);
  }
  async function parseText() {
    cancel(); const id = epoch.current; abort.current = new AbortController(); setPhase("working"); setNotice("");
    try { await understand(text, id, AbortSignal.any([abort.current.signal, AbortSignal.timeout(70000)])); }
    catch (error) { if (alive(id)) setNotice(interfaceError(error, language, t.error)); }
    finally { if (alive(id)) setPhase("idle"); }
  }
  async function start() {
    cancel(); const id = epoch.current; abort.current = new AbortController(); setPhase("working"); setNotice(""); setWarnings([]);
    try {
      const input = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } });
      if (!alive(id)) { input.getTracks().forEach(track => track.stop()); return; } stream.current = input;
      const mime = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg;codecs=opus"].find(value => MediaRecorder.isTypeSupported(value));
      const r = new MediaRecorder(input, mime ? { mimeType: mime, audioBitsPerSecond: 32000 } : undefined); recorder.current = r;
      const chunks: Blob[] = []; let size = 0;
      r.ondataavailable = event => { if (!alive(id)) return; size += event.data.size; if (size > MAX_AUDIO_BYTES) { cancel(); setNotice(t.large); return; } if (event.data.size) chunks.push(event.data); };
      r.onerror = () => { if (alive(id)) { cancel(); setNotice(t.error); } };
      r.onstop = async () => {
        if (!alive(id)) return; if (!sending.current) { cancel(); setNotice(t.error); return; }
        const audio = new Blob(chunks, { type: r.mimeType || mime || "audio/webm" }); release(); setPhase("working");
        try {
          if (!audio.size) throw new Error(t.error);
          const form = new FormData(); form.append("audio", audio, audio.type.includes("mp4") ? "dictation.m4a" : "dictation.webm"); form.append("scope", "memo"); form.append("language", language);
          const signal = AbortSignal.any([abort.current!.signal, AbortSignal.timeout(120000)]);
          const response = await request("/api/legal/transcribe", { method: "POST", body: form, signal }); const data = await response.json();
          if (!response.ok || !data.text) throw new Error(data.error || t.error); if (!alive(id)) return;
          const combined = [text.trim(), String(data.text).trim()].filter(Boolean).join("\n\n"); setText(combined); await understand(combined, id, signal);
        } catch (error) { if (alive(id)) setNotice(interfaceError(error, language, t.error)); }
        finally { if (alive(id)) setPhase("idle"); }
      };
      sending.current = false; r.start(250); setPhase("listening");
    } catch { if (alive(id)) { release(); setPhase("idle"); setNotice(t.error); } }
  }
  return <section className="memo-voice-entry" aria-label={t.title}>
    <label htmlFor="memo-case-story"><h3>{t.title}</h3></label><p id="memo-case-story-hint">{t.hint}</p>
    <textarea id="memo-case-story" name="caseStory" aria-describedby="memo-case-story-hint" placeholder={t.placeholder} value={text} maxLength={MAX_MEMO_STORY_CHARS} required disabled={phase !== "idle" || disabled} onChange={event => { setText(event.target.value); setNotice(""); setWarnings([]); }} rows={7} />
    <div className="memo-voice-buttons">
      {phase === "listening" ? <button type="button" className="button button-primary" onClick={() => { if (recorder.current?.state === "recording") { sending.current = true; setPhase("working"); recorder.current.stop(); } }}><Send size={18} />{t.finish}</button> : <button type="button" className="button button-outline" disabled={disabled || phase !== "idle"} onClick={start}><Mic size={20} />{t.record}</button>}
      {phase === "idle" ? <button type="button" className="button button-primary" disabled={disabled || text.trim().length < 2} onClick={parseText}><Sparkles size={18} />{t.analyze}</button> : <button type="button" className="button button-outline" onClick={cancel}><X size={18} />{t.cancel}</button>}
    </div>
    <p role="status">{phase === "listening" ? t.listen : phase === "working" ? t.working : notice}</p>
    {text === initialText && (facts || requests) && <details className="memo-story-summary"><summary>{t.review}</summary><dl><dt>{t.facts}</dt><dd>{facts || t.missing}</dd><dt>{t.requests}</dt><dd>{requests || t.missing}</dd></dl></details>}
    {warnings.map((warning, index) => <p key={index}>{warning}</p>)}
  </section>;
}
