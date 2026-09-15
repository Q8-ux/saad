import { useEffect, useRef, useState, type FormEvent } from "react";
import { useI18n, type Language } from "./i18n";
import NavigationIcon from "./navigation-icon";
import { MAX_QUESTION_LENGTH, requestLegalAssistant, type AssistantMessage, type AssistantSource } from "../lib/legal-assistant-api";

type ChatMessage = AssistantMessage & { id: number; language: Language; sources?: AssistantSource[] };
const starters = [
  ["مراجعة عقد", "أريد مراجعة بند في عقد. اسألني عن الدولة ونوع العقد، ثم ساعدني في تحديد الغموض والمخاطر دون افتراض وقائع."],
  ["تنظيم الوقائع", "ساعدني في ترتيب وقائع مسألة قانونية زمنياً وتحديد المعلومات الناقصة. ابدأ بالأسئلة الضرورية."],
  ["استخراج الطلبات", "أريد استخراج الطلبات من الوقائع التي سأقدمها. اطلب مني الوقائع أولاً، ثم ميّز الطلبات الصريحة عما يحتاج توضيحاً."],
  ["ترجمة قانونية", "أريد ترجمة نص قانوني. اسألني عن لغة المصدر واللغة المطلوبة ثم اطلب النص، مع الحفاظ على معناه والتنبيه إلى المصطلحات المحتملة."],
];

function AnswerText({ text }: { text: string }) {
  return <div className="assistant-answer-text">{text.split(/\n{2,}/).map((part, index) => (
    <p key={index}>{part.replace(/^#{1,6}\s+/gm, "").split(/(\*\*[^*]+\*\*)/g).map((chunk, i) =>
      chunk.startsWith("**") && chunk.endsWith("**") ? <strong key={i}>{chunk.slice(2, -2)}</strong> : chunk,
    )}</p>
  ))}</div>;
}

export default function LegalAssistant({ active }: { active: boolean }) {
  const { language, t } = useI18n();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<number | null>(null);
  const [copyError, setCopyError] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const controller = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  const nextId = useRef(1);

  useEffect(() => () => { sequence.current++; controller.current?.abort(); }, []);
  useEffect(() => {
    if (active && log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [active, messages, pending]);

  async function send(event: FormEvent) {
    event.preventDefault();
    const question = draft.trim();
    if (controller.current || !question || question.length > MAX_QUESTION_LENGTH) return;
    const requestId = ++sequence.current;
    const abort = new AbortController();
    controller.current = abort;
    const previous = messages.at(-1)?.role === "user" && messages.at(-1)?.content === question ? messages.slice(0, -1) : messages;
    const message: ChatMessage = { id: nextId.current++, role: "user", content: question, language };
    setMessages([...previous, message]);
    setDraft("");
    setError("");
    setPending(true);
    setSlow(false);
    let timedOut = false;
    const timeout = window.setTimeout(() => { timedOut = true; abort.abort(); }, 90000);
    const slowTimer = window.setTimeout(() => { if (sequence.current === requestId) setSlow(true); }, 12000);
    try {
      const reply = await requestLegalAssistant(question, previous, language, abort.signal);
      if (sequence.current !== requestId || abort.signal.aborted) return;
      setMessages(current => [...current, { id: nextId.current++, role: "assistant", content: reply.answer, language, sources: reply.sources }]);
    } catch (reason) {
      if (sequence.current !== requestId) return;
      setDraft(question);
      setError(timedOut ? "استغرق الرد وقتاً طويلاً. أعد المحاولة." : abort.signal.aborted ? "تم إيقاف الطلب. يمكنك تعديل السؤال وإرساله مجدداً." : reason instanceof Error ? reason.message : "تعذّر الحصول على إجابة الآن. أعد المحاولة.");
    } finally {
      window.clearTimeout(timeout);
      window.clearTimeout(slowTimer);
      if (sequence.current === requestId) {
        controller.current = null;
        setPending(false);
        setSlow(false);
      }
    }
  }

  function newConversation() {
    sequence.current++;
    controller.current?.abort();
    controller.current = null;
    setMessages([]);
    setDraft("");
    setPending(false);
    setSlow(false);
    setError("");
    setCopied(null);
    setCopyError(false);
    input.current?.focus();
  }

  async function copyMessage(message: ChatMessage) {
    const sources = message.sources?.filter(source => source.url).map(source => `${source.title}\n${source.url}`).join("\n\n");
    try {
      await navigator.clipboard.writeText(`${message.content}${sources ? `\n\n${t("المصادر المسترجعة")}\n${sources}` : ""}`);
      setCopied(message.id);
      setCopyError(false);
    } catch { setCopyError(true); }
  }

  return (
    <section className="assistant-workspace" aria-label={t("المساعد القانوني الذكي")}>
      <header className="assistant-intro">
        <div className="assistant-emblem"><NavigationIcon name="assistant" /></div>
        <div><span className="assistant-eyebrow">{t("مساحة التفكير والصياغة القانونية")}</span><h2>{t("كيف أساعدك في المسألة القانونية؟")}</h2><p>{t("ناقش سؤالك، راجع صياغتك، وتابع الحوار خطوة بخطوة.")}</p></div>
      </header>
      <div className="assistant-chat">
        <div className="assistant-toolbar"><span>{t("المحادثة القانونية")}</span><button type="button" className="button subtle" onClick={newConversation} disabled={!messages.length && !draft}>{t("محادثة جديدة")}</button></div>
        {!messages.length ? <div className="assistant-empty"><h3>{t("ابدأ بسؤال أو اختر مهمة")}</h3><p>{t("اذكر الدولة والتفاصيل المؤثرة لتحصل على إجابة أدق.")}</p><div className="assistant-starters">{starters.map(([title, prompt]) => <button type="button" key={title} onClick={() => { setDraft(t(prompt)); input.current?.focus(); }}><NavigationIcon name={title === "ترجمة قانونية" ? "memos" : "assistant"} /><span>{t(title)}</span></button>)}</div></div> : null}
        <div ref={log} className={"assistant-log" + (!messages.length ? " is-empty" : "")} role="log" aria-label={t("سجل المحادثة")} aria-live="polite" aria-relevant="additions" aria-busy={pending}>
          {messages.map(message => <article key={message.id} className={`assistant-message is-${message.role}`} lang={message.language} dir={message.language === "en" ? "ltr" : "rtl"}>
            <div className="assistant-message-label">{t(message.role === "user" ? "أنت" : "المساعد القانوني الذكي")}</div>
            <AnswerText text={message.content} />
            {message.role === "assistant" && <>
              {!!message.sources?.length ? <details className="assistant-sources"><summary>{t("المصادر المسترجعة")} ({message.sources.length})</summary><p>{t("راجع النص الأصلي وآخر تعديل قبل الاستناد إلى المصدر.")}</p><ul>{message.sources.map((source, index) => <li key={index}>{source.url ? <a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a> : <strong>{source.title}</strong>}{source.excerpt && <p>{source.excerpt}</p>}</li>)}</ul></details> : <p className="assistant-source-note">{t("لم تُرفق مصادر بهذه الإجابة؛ تحقّق من النصوص القانونية قبل الاعتماد.")}</p>}
              <button type="button" className="text-button assistant-copy" onClick={() => void copyMessage(message)}>{t(copied === message.id ? "تم نسخ الإجابة" : "نسخ الإجابة")}</button>
            </>}
          </article>)}
        </div>
        {pending && <div className="assistant-progress" role="status"><span className="assistant-busy-dot" aria-hidden="true" /><span>{t(slow ? "ما زال المساعد يحضّر الإجابة. قد يستغرق الاتصال الأول وقتاً أطول." : "يحضّر المساعد الإجابة...")}</span></div>}
        {error && <div className="assistant-error" role="alert">{t(error)}</div>}
        {copyError && <p className="assistant-error" role="status">{t("تعذّر النسخ. يمكنك تحديد النص ونسخه يدوياً.")}</p>}
        <form className="assistant-composer" onSubmit={event => void send(event)}>
          <label htmlFor="legal-assistant-question">{t("سؤالك للمساعد القانوني")}</label>
          <textarea ref={input} id="legal-assistant-question" value={draft} onChange={event => setDraft(event.target.value)} maxLength={MAX_QUESTION_LENGTH} rows={4} placeholder={t("اكتب سؤالك أو الصق النص المطلوب مراجعته...")} disabled={pending} aria-describedby="assistant-privacy" onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} />
          <div className="assistant-composer-actions"><span className="assistant-character-count" dir="ltr">{draft.length} / {MAX_QUESTION_LENGTH}</span>{pending ? <button type="button" className="button subtle" onClick={() => controller.current?.abort()}>{t("إيقاف الرد")}</button> : <button type="submit" className="button primary" disabled={!draft.trim()}>{t(error ? "إعادة إرسال السؤال" : "إرسال السؤال")}</button>}</div>
          <p id="assistant-privacy" className="assistant-privacy">{t("تُرسل رسائلك وسياق الحوار إلى خدمة الذكاء الاصطناعي. الإجابات إرشادية وتحتاج مراجعة محامٍ.")}</p>
        </form>
      </div>
    </section>
  );
}
