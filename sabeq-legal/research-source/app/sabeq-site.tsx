"use client";

import { ASSISTANT_MESSAGE_LIMIT, assistantInputCopy, validateAssistantInput } from "@/lib/assistant-input";
import { runMemoGeneration, MemoGenerationStopped, memoGenerationCopy } from "@/lib/memo-generation";
import { readSSE } from "@/lib/intake-stream";
import { cleanIntakeContext } from "@/lib/intake-context";
import type { AnalysisStage } from "@/lib/intake-analysis";
import IntakeAnalysisView, { IntakeStages, type ConnectedIntakeState } from "./intake-analysis-view";
import VoiceWaveform from "./voice-waveform";
import MemoVoiceInput from "./memo-voice-input";
import PleadingPreview from "./pleading-preview";
import { pleadingFields, renderPleadingHtml, renderArabicMemoHtml, selectPleadingKind, type PleadingDocument } from "@/lib/pleading-document";
import { exportPleadingDocx } from "@/lib/pleading-docx";
import VoiceCountdown from "./voice-countdown";
import LegalToolsPanel from "./legal-tools-panel";
import { LegalVoiceConversation, type VoiceAnalysisResult } from "@/lib/legal-voice-client";
import { DEFAULT_LEGAL_VOICE, resolveLegalVoice, LEGAL_VOICES, isLegalVoice, voiceCopy, type LegalVoice, type VoicePhase } from "@/lib/legal-voice";
import { memoApprovalNotice, canOfferMemoHandoff, buildMemoHandoff, conversationTranscript, isCompleteMemoHandoff, type MemoPrefill } from "@/lib/memo-handoff";

import Image from "next/image";
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Download,
  FileCheck2,
  FileText,
  Gavel,
  Headphones,
  KeyRound,
  Landmark,
  Languages,
  LogOut,
  Mail,
  MapPin,
  Menu,
  Mic,
  Moon,
  Pause,
  Pencil,
  Phone,
  PhoneCall,
  Play,
  Printer,
  Scale,
  Search,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  UploadCloud,
  UserRound,
  Users,
  X,
  Zap,
} from "lucide-react";
import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { apiUrl, assetUrl } from "@/lib/runtime-urls";
import { copy, Language, mediaVideos, SiteCopy, team } from "./site-content";
import { interfaceText as tr, interfaceLabel, interfaceError, canonicalLegalValue } from "@/lib/interface-language";

type ServiceModal = "booking" | "assistant" | "library" | "memo";
type ModalName = ServiceModal | "auth" | "media" | null;
type ColorTheme = "light" | "dark";
type PublicUser = { id: string; name: string; phone: string; email: string };
const sectionIds = ["home", "team", "services", "media", "why", "contact"];
const serviceIcons = [Scale, Users, Gavel, Landmark];
const packageIcons = [Zap, CalendarDays, FileText, BookOpen];
const whyIcons = [FileCheck2, BriefcaseBusiness, ShieldCheck, Headphones];
const memoIcons = [Gavel, BookOpen, UploadCloud];

async function authenticatedFetch(path: string, token: string, init: RequestInit = {}) {
  if (!token) throw new Error("AUTH_REQUIRED");
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  return fetch(apiUrl(path), { ...init, headers });
}

// The memo pilot is temporarily available without an account. Other services
// continue to use authenticatedFetch and remain behind the verified sign-in gate.
async function memoFetch(path: string, token: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  headers.set("Accept", ["/api/legal/assistant", "/api/legal/voice-turn"].includes(path) ? "text/event-stream" : "application/json");
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(apiUrl(path), {
        ...init,
        headers,
        mode: "cors",
        credentials: "omit",
        cache: "no-store",
      });
      // Service outages before a response is returned are recoverable. The
      // server deletes its temporary analysis files after each run, so one
      // controlled retry for document analysis is safe and prevents the user
      // from having to choose the files again after a brief connection glitch.
      const retryableResponse = path === "/api/legal/analyze-documents" && [502, 503, 504].includes(response.status);
      if (retryableResponse && attempt < 2) {
        await new Promise((resolve) => window.setTimeout(resolve, 700 * (attempt + 1)));
        continue;
      }
      return response;
    } catch (error) {
      if (init.signal?.aborted || ["/api/legal/memo", "/api/legal/assistant", "/api/legal/transcribe", "/api/legal/speech", "/api/legal/voice-turn", "/api/legal/memo-dictation", "/api/legal/tools"].includes(path)) throw error;
      lastError = error;
      if (attempt < 2) await new Promise((resolve) => window.setTimeout(resolve, 550 * (attempt + 1)));
    }
  }
  console.error("Memo service request could not be reached", { path, error: lastError instanceof Error ? lastError.name : "unknown" });
  throw new Error("تعذر الاتصال بخدمة التحليل. لم تُرسل الملفات للقراءة؛ أعد المحاولة بعد لحظات.");
}

async function readServiceJson<T extends { error?: string }>(response: Response): Promise<T> {
  const body = await response.text();
  try {
    return JSON.parse(body) as T;
  } catch {
    if (!response.ok) return { error: "تعذر إتمام الطلب من الخدمة. لم تُفقد الملفات؛ أعد المحاولة." } as T;
    throw new Error("استلمت الخدمة استجابة غير صالحة. لم تُفقد الملفات؛ أعد المحاولة.");
  }
}

function Field({ label, children, wide = false }: { label: string; children: ReactNode; wide?: boolean }) {
  return <label className={`field${wide ? " field-wide" : ""}`}><span>{label}</span>{children}</label>;
}

type SelectOption = { value: string; label: string };

function CustomSelect({ name, value, defaultValue, options, onChange, ariaLabel, compact = false }: {
  name?: string;
  value?: string;
  defaultValue?: string;
  options: SelectOption[];
  onChange?: (value: string) => void;
  ariaLabel: string;
  compact?: boolean;
}) {
  const [internalValue, setInternalValue] = useState(defaultValue || options[0]?.value || "");
  const currentValue = value ?? internalValue;

  // Native select controls are deliberately used here. They preserve the
  // visual treatment in CSS while using iPadOS's reliable touch picker,
  // instead of a custom popover that can be dismissed by touch events.
  return <select
    name={name}
    value={currentValue}
    aria-label={ariaLabel}
    className={`native-select${compact ? " native-select-compact" : ""}`}
    onChange={(event) => {
      const nextValue = event.target.value;
      if (value === undefined) setInternalValue(nextValue);
      onChange?.(nextValue);
    }}
  >
    {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
  </select>;
}

function CustomComboBox({ name, defaultValue, options, required, ariaLabel }: { name: string; defaultValue?: string; options: readonly string[]; required?: boolean; ariaLabel: string }) {
  const [text, setText] = useState(defaultValue || "");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const normalized = text.trim().toLocaleLowerCase();
  const visibleOptions = options.filter((option) => !normalized || option.toLocaleLowerCase().includes(normalized)).slice(0, 12);

  useEffect(() => {
    function close(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  return <div className={`custom-combobox${open ? " is-open" : ""}`} ref={rootRef}>
    <input name={name} value={text} required={required} aria-label={ariaLabel} autoComplete="off" onFocus={() => setOpen(true)} onChange={(event) => { setText(event.target.value); setOpen(true); }} />
    <ChevronDown size={17} aria-hidden="true" />
    {open && visibleOptions.length > 0 && <div className="custom-select-menu combo-menu" role="listbox" aria-label={ariaLabel}>
      {visibleOptions.map((option) => <button type="button" role="option" aria-selected={option === text} className={option === text ? "selected" : ""} key={option} onClick={() => { setText(option); setOpen(false); }}><span>{option}</span>{option === text && <Check size={17} />}</button>)}
    </div>}
  </div>;
}

type BrandName = "facebook" | "x" | "instagram" | "linkedin" | "whatsapp";

function BrandIcon({ name }: { name: BrandName }) {
  if (name === "facebook") {
    return <svg className="brand-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M13.8 21v-8h2.7l.4-3.1h-3.1v-2c0-.9.3-1.5 1.6-1.5H17V3.6c-.7-.1-1.5-.2-2.3-.2-2.3 0-3.9 1.4-3.9 4.1v2.4H8.2V13h2.6v8h3Z" /></svg>;
  }

  if (name === "instagram") {
    return <svg className="brand-icon brand-icon-stroke" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.25" y="3.25" width="17.5" height="17.5" rx="5.2" /><circle cx="12" cy="12" r="4.1" /><circle className="brand-icon-dot" cx="17.45" cy="6.65" r="1.05" /></svg>;
  }

  if (name === "linkedin") {
    return <svg className="brand-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.3 8.1H3.2V21h3.1V8.1ZM4.8 3A1.8 1.8 0 1 0 4.8 6.6 1.8 1.8 0 0 0 4.8 3ZM13.2 8.1h-3V21h3.1v-6.4c0-1.7.3-3.3 2.4-3.3 2 0 2.1 1.9 2.1 3.4V21H21v-7c0-3.4-.7-6.1-4.8-6.1-1.9 0-3.2 1.1-3.7 2.1h-.1V8.1Z" /></svg>;
  }

  if (name === "whatsapp") {
    return <svg className="brand-icon brand-icon-stroke" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.4 11.7a8.3 8.3 0 0 1-12.2 7.4L3.5 20.5l1.4-4.6A8.3 8.3 0 1 1 20.4 11.7Z" /><path d="M8.2 7.5c.2-.4.4-.4.7-.4h.5c.2 0 .4 0 .5.4l.8 2c.1.3.1.5-.1.7l-.6.8c-.2.2-.2.4-.1.7.5 1 1.3 1.9 2.3 2.5.3.2.5.2.7 0l.9-1c.2-.2.4-.3.7-.2l2 .9c.3.1.4.3.4.5 0 .4-.2 1.3-.8 1.8-.5.5-1.3.8-2.1.8-1.2 0-3.2-.6-5.2-2.4-1.6-1.5-2.7-3.4-3-4.7-.3-1.3 0-2 .4-2.4Z" /></svg>;
  }

  return <svg className="brand-icon brand-icon-stroke" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 4.5 19.5 19.5M19 4.5 5 19.5" /></svg>;
}

export default function SabeqSite() {
  const [language, setLanguage] = useState<Language>("ar");
  const [theme, setTheme] = useState<ColorTheme>("light");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [modal, setModal] = useState<ModalName>(null);
  const [pendingService, setPendingService] = useState<ServiceModal | null>(null);
  const [authToken, setAuthToken] = useState("");
  const [authUser, setAuthUser] = useState<PublicUser | null>(null);
  const [selectedVideo, setSelectedVideo] = useState(0);
  const [formStatus, setFormStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [assistantMemoPrefill, setAssistantMemoPrefill] = useState<MemoPrefill | null>(null);
  const [assistantSession, setAssistantSession] = useState<AssistantSession | null>(null);
  const t = copy[language];
  const isRtl = t.dir === "rtl";
  const DirectionArrow = isRtl ? ArrowLeft : ArrowRight;
  const year = useMemo(() => new Date().getFullYear(), []);
  const themeLabel = theme === "light"
    ? language === "ar" ? "تفعيل الوضع الليلي" : language === "en" ? "Enable dark mode" : "ڈارک موڈ فعال کریں"
    : language === "ar" ? "تفعيل الوضع النهاري" : language === "en" ? "Enable light mode" : "لائٹ موڈ فعال کریں";

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("sabeq-color-theme");
    const preferredTheme: ColorTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    const frame = window.requestAnimationFrame(() => setTheme(savedTheme === "dark" || savedTheme === "light" ? savedTheme : preferredTheme));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem("sabeq-color-theme", theme);
  }, [theme]);

  useEffect(() => {
    const storedToken = window.localStorage.getItem("sabeq-session-token") || "";
    if (!storedToken) return;
    let active = true;
    authenticatedFetch("/api/auth/session", storedToken)
      .then(async (response) => {
        const data = await response.json() as { user?: PublicUser };
        if (!response.ok || !data.user) throw new Error("INVALID_SESSION");
        if (active) {
          setAuthToken(storedToken);
          setAuthUser(data.user);
        }
      })
      .catch(() => {
        window.localStorage.removeItem("sabeq-session-token");
        if (active) {
          setAuthToken("");
          setAuthUser(null);
        }
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = t.dir;
    document.body.dataset.language = language;
  }, [language, t.dir]);

  useEffect(() => {
    document.body.style.overflow = modal || mobileMenu ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [modal, mobileMenu]);

  function scrollTo(id: string) {
    setMobileMenu(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function showModal(name: ModalName) {
    setFormStatus("idle");
    if (name === "memo") setAssistantMemoPrefill(null);
    if (name === "memo" || name === "assistant") {
      setModal(name);
      return;
    }
    if (name && name !== "media" && name !== "auth" && !authUser) {
      setPendingService(name);
      setModal("auth");
      return;
    }
    setModal(name);
  }

  function authenticated(session: { token: string; user: PublicUser }) {
    setAssistantSession(null); setAssistantMemoPrefill(null);
    window.localStorage.setItem("sabeq-session-token", session.token);
    setAuthToken(session.token);
    setAuthUser(session.user);
    const destination = pendingService;
    setPendingService(null);
    setModal(destination);
  }

  async function signOut() {
    const token = authToken;
    setAuthToken("");
    setAuthUser(null);
    setAssistantSession(null); setAssistantMemoPrefill(null); setModal(null);
    window.localStorage.removeItem("sabeq-session-token");
    setMobileMenu(false);
    if (token) {
      try {
        await authenticatedFetch("/api/auth/logout", token, { method: "POST" });
      } catch {
        // The local session is cleared even if the best-effort server revocation fails.
      }
    }
  }

  async function submitForm(event: FormEvent<HTMLFormElement>, endpoint: string) {
    event.preventDefault();
    if (!authToken) {
      setModal("auth");
      return;
    }
    setFormStatus("loading");
    const form = event.currentTarget;
    try {
      const response = await authenticatedFetch(endpoint, authToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(form).entries())),
      });
      if (!response.ok) throw new Error("Request failed");
      form.reset();
      setFormStatus("success");
    } catch {
      setFormStatus("error");
    }
  }

  return (
    <div className="site-shell" dir={t.dir}>
      <a className="skip-link" href="#main-content">{tr(language, "الانتقال إلى المحتوى")}</a>
      <header className="site-header">
        <div className="container">
          <div className="header-row">
            <button className="brand" onClick={() => scrollTo("home")} aria-label={t.nav[0]}>
              <Image src="/images/brand/sabeq-logo.png" alt="" width={74} height={74} priority unoptimized />
            </button>
            <div className="header-actions">
              <div className="language-select">
                <Languages size={17} />
                <CustomSelect compact value={language} onChange={(next) => setLanguage(next as Language)} ariaLabel={language === "ar" ? "اللغة" : language === "ur" ? "زبان" : "Language"} options={(Object.keys(copy) as Language[]).map((key) => ({ value: key, label: copy[key].label }))} />
              </div>
              <button className="button button-outline header-cta header-memo" onClick={() => showModal("memo")} aria-label={t.memo}><FileText size={17} /><span>{t.memo}</span></button>
              <button className="button button-primary header-cta header-book" onClick={() => showModal("booking")} aria-label={t.book}><CalendarDays size={17} /><span>{t.book}</span></button>
              <button className="theme-toggle" type="button" onClick={() => setTheme((current) => current === "light" ? "dark" : "light")} aria-label={themeLabel} title={themeLabel} aria-pressed={theme === "dark"}>
                {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
              </button>
              <button className="menu-toggle" onClick={() => setMobileMenu(true)} aria-label="Open menu"><Menu /></button>
            </div>
          </div>
          <nav className="header-nav" aria-label="Primary navigation">
            {t.nav.map((item, index) => <button key={item} onClick={() => scrollTo(sectionIds[index])}>{item}</button>)}
          </nav>
        </div>
      </header>

      {mobileMenu && (
        <div className="nav-dropdown" role="dialog" aria-label={language === "ar" ? "القائمة" : language === "en" ? "Menu" : "مینو"}>
          <div className="nav-dropdown-head"><strong>{t.brand}</strong><button className="icon-button" onClick={() => setMobileMenu(false)} aria-label={language === "ar" ? "إغلاق القائمة" : language === "en" ? "Close menu" : "مینو بند کریں"}><X /></button></div>
          <nav>{t.nav.map((item, index) => <button key={item} onClick={() => scrollTo(sectionIds[index])}>{item}</button>)}</nav>
          {authUser && <div className="drawer-account"><i><UserRound size={20} /></i><span><strong>{authUser.name}</strong><small dir="ltr">{authUser.email}</small></span><button type="button" onClick={signOut} aria-label={language === "ar" ? "تسجيل الخروج" : language === "en" ? "Sign out" : "سائن آؤٹ"}><LogOut size={18} /></button></div>}
        </div>
      )}

      <main id="main-content">
        <section className="hero" id="home">
          <div className="hero-brand-block" dir={t.dir}>
            <p className="hero-brand-title">{t.brand}</p>
            <p className="hero-brand-tagline">
              <span>{language === "ar" ? "خبرة قانونية راسخة" : language === "en" ? "Established legal experience" : "مستحکم قانونی تجربہ"}</span>
              <span>{language === "ar" ? "تلتقي بالتقنية الحديثة" : language === "en" ? "meets modern technology" : "جدید ٹیکنالوجی کے ساتھ"}</span>
            </p>
          </div>
          <div className="container hero-layout">
            <div className="hero-copy">
              <h1>{t.heroTitle}<em>{t.heroAccent}</em></h1>
            </div>
          </div>
        </section>

        <section className="section" id="team">
          <div className="container">
            <SectionHeading kicker={t.teamKicker} title={t.teamTitle} text={t.teamText} />
            <div className="team-grid">
              {team.map((member, index) => (
                <article className={`team-card${index === 0 ? " team-card-lead" : ""}${member.image.includes("dr-khalifa") ? " team-card-khalifa" : ""}`} key={member.name.ar} dir={language === "en" ? "ltr" : "rtl"}>
                  <div className="team-photo"><Image src={member.image} alt={`${member.prefix[language]} ${member.name[language]}`} fill sizes="(max-width: 700px) 90vw, (max-width: 1100px) 45vw, 25vw" unoptimized /></div>
                  <div className="team-info"><small>{member.prefix[language]}</small><h3 dir={language === "ar" ? "rtl" : "ltr"}>{member.name[language]}</h3><span><Scale size={15} />{t.brand}</span></div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="memo-band">
          <div className="container memo-layout">
            <div className="memo-copy">
              <p className="eyebrow eyebrow-light">{t.memoKicker}</p>
              <h2>{t.memoTitle}</h2><p>{t.memoText}</p>
              <div className="memo-features">
                {t.memoFeatures.map(([title, text], index) => { const Icon = memoIcons[index]; return <div key={title}><i><Icon size={22} /></i><span><strong>{title}</strong><small>{text}</small></span></div>; })}
              </div>
              <button className="button button-light" onClick={() => showModal("memo")}><FileText size={19} />{t.memoStart}</button>
              <p className="arabic-only"><Languages size={16} />{t.arabicOnly}</p>
            </div>
            <div className="document-stage" aria-hidden="true">
              <div className="document-sheet" lang="ar" dir="rtl"><i><Scale /></i><h3>مذكرة بدفاع</h3><small>أمام محكمة .......... الموقرة</small><hr /><b /><b /><b className="short" /><h4>أولاً: الوقائع</h4><b /><b /><b className="medium" /><h4>ثانياً: الدفاع</h4><b /><b className="medium" /></div>
              <div className="verified"><ShieldCheck size={24} /><span><strong>{tr(language, "مصادر موثقة")}</strong><small>{tr(language, "تشريعات كويتية")}</small></span></div>
            </div>
          </div>
        </section>

        <section className="section services-section" id="services">
          <div className="container">
            <SectionHeading kicker={t.servicesKicker} title={t.servicesTitle} light />
            <div className="services-grid">
              {t.services.map(([title, text], index) => { const Icon = serviceIcons[index]; return <article className="service-card" key={title}><i><Icon size={27} /></i><span>0{index + 1}</span><h3>{title}</h3><p>{text}</p><button onClick={() => showModal("booking")}><DirectionArrow size={19} /></button></article>; })}
            </div>
          </div>
        </section>

        <section className="section packages-section">
          <div className="container">
            <SectionHeading kicker={t.packagesKicker} title={t.packagesTitle} />
            <div className="packages-grid">
              {t.packages.map(([title, text, items], index) => { const Icon = packageIcons[index]; return (
                <article className={`package-card${index === 2 ? " package-featured" : ""}`} key={title}>
                  {index === 2 && <b className="ai-label">AI</b>}<i><Icon size={25} /></i><h3>{title}</h3><p>{text}</p>
                  <ul>{items.map((item) => <li key={item}><Check size={15} />{item}</li>)}</ul>
                  <button className="button button-outline button-block" onClick={() => showModal(index === 2 ? "memo" : index === 3 ? "library" : "booking")}>{t.choose}<DirectionArrow size={17} /></button>
                </article>
              ); })}
            </div>
          </div>
        </section>

        <section className="section media-section" id="media">
          <div className="container">
            <SectionHeading kicker={t.mediaKicker} title={t.mediaTitle} text={t.mediaText} light titleFirst />
            <div className="media-gallery" aria-label={t.mediaTitle}>
              {mediaVideos.map((video, index) => (
                <button className="media-thumb" key={video.src} onClick={() => { setSelectedVideo(index); showModal("media"); }} aria-label={`${t.mediaTitle}: ${video.title}`}>
                  <Image src={video.poster} alt={video.title} fill sizes="150px" unoptimized />
                  <span className="media-thumb-shade" />
                  <i><Play size={19} fill="currentColor" /></i>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="section why-section" id="why">
          <div className="container why-layout">
            <div className="why-intro"><p className="eyebrow eyebrow-light">{t.whyKicker}</p><h2>{t.whyTitle}</h2><p>{t.whyText}</p></div>
            <div className="why-grid">{t.why.map(([title, text], index) => { const Icon = whyIcons[index]; return <article key={title}><i><Icon size={23} /></i><span><h3>{title}</h3><p>{text}</p></span></article>; })}</div>
          </div>
        </section>

        <section className="section contact-section" id="contact">
          <div className="container contact-layout">
            <div className="contact-copy">
              <p className="eyebrow">{t.contactKicker}</p><h2>{t.contactTitle}</h2><p className="contact-text">{t.contactText}</p>
              <div className="contact-list">
                <div className="contact-card contact-card-phone">
                  <i><Phone size={22} /></i>
                  <span>
                    <small>{t.phone}</small>
                    <span className="contact-numbers" dir="ltr">
                      <a href="tel:+96522400420" aria-label={`${t.phone} 22400420`}><PhoneCall size={15} />22400420</a>
                      <a href="tel:+96522020188" aria-label={`${t.phone} 22020188`}><PhoneCall size={15} />22020188</a>
                    </span>
                  </span>
                </div>
                <a className="contact-card contact-card-action contact-card-whatsapp" href="https://wa.me/96550668449" target="_blank" rel="noreferrer" aria-label={`${t.whatsapp} 5066 8449`}>
                  <i><BrandIcon name="whatsapp" /></i><span><small>{t.whatsapp}</small><strong dir="ltr">5066 8449</strong></span><DirectionArrow className="contact-card-arrow" size={18} />
                </a>
                <a className="contact-card contact-card-action contact-card-email" href="mailto:info@sabeq.legal" aria-label={`${t.email} info@sabeq.legal`}>
                  <i><Mail size={22} /></i><span><small>{t.email}</small><strong dir="ltr">info@sabeq.legal</strong></span><DirectionArrow className="contact-card-arrow" size={18} />
                </a>
                <a className="contact-card contact-card-action contact-card-address" href="https://maps.app.goo.gl/cvPGfK3hvwaV5bnH8" target="_blank" rel="noreferrer" aria-label={t.map}>
                  <i><MapPin size={22} /></i><span><small>{t.address}</small><strong>{t.addressText}</strong><span className="map-link">{t.map}<DirectionArrow size={15} /></span></span>
                </a>
                <div className="contact-card contact-card-hours"><i><Clock3 size={22} /></i><span><small>{t.hours}</small><strong>{t.hoursText}</strong></span></div>
              </div>
              <div className="socials" aria-label={tr(language, "وسائل التواصل الاجتماعي")}>
                <a className="social-facebook" href="https://www.facebook.com/people/Sabeq-Law/pfbid0JoEEKQtwxea1k2NPuyap9VbgTcC2i7VXpaUGVyiz6gkdKHyHGuRzYGGZkMVnuFa6l/" target="_blank" rel="noreferrer" aria-label="Facebook" title="Facebook"><BrandIcon name="facebook" /></a>
                <a className="social-x" href="https://x.com/sabik_legal?s=21" target="_blank" rel="noreferrer" aria-label="X" title="X"><BrandIcon name="x" /></a>
                <a className="social-instagram" href="https://www.instagram.com/sabik_legal" target="_blank" rel="noreferrer" aria-label="Instagram" title="Instagram"><BrandIcon name="instagram" /></a>
                <a className="social-linkedin" href="https://www.linkedin.com/in/khalifa-alkhalifa/" target="_blank" rel="noreferrer" aria-label="LinkedIn" title="LinkedIn"><BrandIcon name="linkedin" /></a>
              </div>
            </div>
            <form className="contact-form" onSubmit={(event) => submitForm(event, "/api/contact")}>
              <div className="form-title"><i><Send size={21} /></i><h3>{t.contactTitle}</h3></div>
              <div className="form-grid"><Field label={t.form.name}><input name="name" required autoComplete="name" /></Field><Field label={t.form.email}><input name="email" type="email" required autoComplete="email" dir="ltr" /></Field><Field label={t.form.phone}><input name="phone" required inputMode="tel" autoComplete="tel" dir="ltr" /></Field><Field label={t.form.subject}><input name="subject" required /></Field><Field label={t.form.message} wide><textarea name="message" rows={5} required /></Field></div>
              <label className="honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
              <input type="hidden" name="language" value={language} /><button className="button button-primary button-block" disabled={formStatus === "loading"}><Send size={18} />{formStatus === "loading" ? t.loading : t.form.send}</button><FormNotice status={formStatus} t={t} />
            </form>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container footer-grid">
          <div className="footer-brand"><Image src="/images/brand/sabeq-logo.png" alt="" width={92} height={92} unoptimized /><span><strong>{t.brand}</strong><small>SABEQ LEGAL GROUP</small><p>{t.footer}</p></span></div>
          <div><h3>{t.quick}</h3>{t.nav.map((item, index) => <button key={item} onClick={() => scrollTo(sectionIds[index])}>{item}</button>)}</div>
          <div className="footer-contact-list"><h3>{t.contactTitle}</h3><a href="tel:+96522400420"><PhoneCall size={16} /><span dir="ltr">22400420</span></a><a href="tel:+96522020188"><PhoneCall size={16} /><span dir="ltr">22020188</span></a><a href="mailto:info@sabeq.legal"><Mail size={16} /><span dir="ltr">info@sabeq.legal</span></a><a href="https://wa.me/96550668449" target="_blank" rel="noreferrer"><BrandIcon name="whatsapp" /><span dir="ltr">5066 8449</span></a><a href="https://maps.app.goo.gl/cvPGfK3hvwaV5bnH8" target="_blank" rel="noreferrer"><MapPin size={16} /><span>{t.map}</span></a></div>
        </div>
        <div className="container footer-bottom"><span>© {year} {t.brand}. {t.rights}.</span><a href="https://wa.me/96551231313" target="_blank" rel="noreferrer">{tr(language, "تصميم وتطوير")} <span className="digizone-name">DigiZone</span></a></div>
      </footer>

      {modal && <ModalShell language={language} onClose={() => { if (modal === "auth") setPendingService(null); setModal(null); }} large={modal === "memo"} media={modal === "media"}>
        {modal === "auth" && <AuthGate language={language} service={pendingService} onAuthenticated={authenticated} />}
        {modal === "booking" && <Booking t={t} language={language} status={formStatus} submit={submitForm} />}
        {modal === "assistant" && <Assistant t={t} language={language} token={authToken} initialSession={assistantSession} onSession={setAssistantSession} openBooking={() => showModal("booking")} startMemo={(prefill) => { setAssistantMemoPrefill(prefill); setModal("memo"); }} />}
        {modal === "library" && <Library t={t} language={language} token={authToken} />}
        {modal === "memo" && <MemoWizard t={t} language={language} token={authToken} initialData={assistantMemoPrefill} />}
        {modal === "media" && <MediaViewer video={mediaVideos[selectedVideo]} language={language} />}
      </ModalShell>}

      <div className="floating"><button className="assistant-avatar-button" onClick={() => showModal("assistant")} aria-label={t.assistant}><span className="assistant-portrait"><img src={assetUrl("/images/sabeq-assistant-avatar.jpg")} alt="" width={64} height={64} decoding="async" /></span></button><a href="https://wa.me/96550668449" target="_blank" rel="noreferrer" aria-label={t.whatsapp}><BrandIcon name="whatsapp" /></a></div>
    </div>
  );
}

function SectionHeading({ kicker, title, text, light = false, titleFirst = false }: { kicker: string; title: string; text?: string; light?: boolean; titleFirst?: boolean }) {
  const kickerNode = <p className={`eyebrow${titleFirst ? " eyebrow-below-title" : ""}`}>{kicker}</p>;
  return <div className={`section-heading${light ? " section-heading-light" : ""}`}>{titleFirst ? <><h2>{title}</h2>{kickerNode}</> : <>{kickerNode}<h2>{title}</h2></>}{text && <p>{text}</p>}</div>;
}

function MediaViewer({ video, language }: { video: (typeof mediaVideos)[number]; language: Language }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const playLabel = language === "ar" ? "تشغيل" : language === "en" ? "Play" : "چلائیں";
  const pauseLabel = language === "ar" ? "إيقاف" : language === "en" ? "Pause" : "روکیں";

  async function togglePlayback() {
    const element = videoRef.current;
    if (!element) return;
    if (element.paused) {
      await element.play();
      setPlaying(true);
    } else {
      element.pause();
      setPlaying(false);
    }
  }

  return <div className="media-viewer" dir="rtl"><div className="media-player"><video ref={videoRef} src={assetUrl(video.src)} poster={assetUrl(video.poster)} playsInline preload="metadata" aria-label={video.title} onClick={togglePlayback} onEnded={() => setPlaying(false)} /><button className={`media-control${playing ? " is-playing" : ""}`} onClick={togglePlayback}>{playing ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}<span>{playing ? pauseLabel : playLabel}</span></button></div></div>;
}

function ModalShell({ children, language, onClose, large = false, media = false }: { children: ReactNode; language: Language; onClose: () => void; large?: boolean; media?: boolean }) {
  return <div className="modal-backdrop" onMouseDown={onClose}><div className={`modal${large ? " modal-large" : ""}${media ? " modal-media" : ""}`} role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><button className="icon-button modal-close" onClick={onClose} aria-label={tr(language, "إغلاق")}><X /></button>{children}</div></div>;
}

function AuthGate({ language, service, onAuthenticated }: { language: Language; service: ServiceModal | null; onAuthenticated: (session: { token: string; user: PublicUser }) => void }) {
  const [stage, setStage] = useState<"details" | "code">("details");
  const [details, setDetails] = useState({ name: "", phone: "", email: "" });
  const [challengeId, setChallengeId] = useState("");
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [notice, setNotice] = useState("");
  const t = copy[language];
  const serviceName = service ? ({ booking: t.book, assistant: t.assistant, library: t.library, memo: t.memo } satisfies Record<ServiceModal, string>)[service] : "";
  const ui = {
    ar: {
      title: "تسجيل الدخول الآمن",
      intro: serviceName ? `يلزم التحقق من حسابك قبل استخدام خدمة «${serviceName}».` : "يلزم التحقق من حسابك قبل طلب الخدمة.",
      name: "الاسم الكامل",
      phone: "رقم الهاتف",
      email: "البريد الإلكتروني",
      send: "إرسال رمز التحقق",
      sending: "جارٍ إرسال الرمز...",
      privacy: "جميع الحقول إلزامية. سنرسل رمزاً من ستة أرقام إلى بريدك، ولن نطلب كلمة مرور.",
      verifyTitle: "تحقق من بريدك الإلكتروني",
      verifyText: `أدخل الرمز المرسل إلى ${details.email}`,
      code: "رمز التحقق",
      verify: "تحقق وتابع",
      verifying: "جارٍ التحقق...",
      edit: "تعديل البيانات",
      sent: "تم إرسال الرمز. تحقق من صندوق الوارد والبريد غير المرغوب فيه.",
      error: "تعذر إكمال التحقق حالياً.",
    },
    en: {
      title: "Secure sign-in",
      intro: serviceName ? `Verify your account before using “${serviceName}”.` : "Verify your account before requesting a service.",
      name: "Full name",
      phone: "Phone number",
      email: "Email address",
      send: "Send verification code",
      sending: "Sending code...",
      privacy: "All fields are required. We will email a six-digit code; no password is needed.",
      verifyTitle: "Verify your email",
      verifyText: `Enter the code sent to ${details.email}`,
      code: "Verification code",
      verify: "Verify and continue",
      verifying: "Verifying...",
      edit: "Edit details",
      sent: "Code sent. Check your inbox and spam folder.",
      error: "Verification could not be completed right now.",
    },
    ur: {
      title: "محفوظ سائن اِن",
      intro: serviceName ? `«${serviceName}» استعمال کرنے سے پہلے اپنے اکاؤنٹ کی تصدیق کریں۔` : "خدمت کی درخواست سے پہلے اپنے اکاؤنٹ کی تصدیق کریں۔",
      name: "پورا نام",
      phone: "فون نمبر",
      email: "ای میل",
      send: "تصدیقی کوڈ بھیجیں",
      sending: "کوڈ بھیجا جا رہا ہے...",
      privacy: "تمام خانے لازمی ہیں۔ چھ ہندسوں کا کوڈ ای میل کیا جائے گا؛ پاس ورڈ درکار نہیں۔",
      verifyTitle: "ای میل کی تصدیق کریں",
      verifyText: `${details.email} پر بھیجا گیا کوڈ درج کریں۔`,
      code: "تصدیقی کوڈ",
      verify: "تصدیق کرکے جاری رکھیں",
      verifying: "تصدیق جاری ہے...",
      edit: "معلومات تبدیل کریں",
      sent: "کوڈ بھیج دیا گیا۔ اِن باکس اور اسپیم فولڈر دیکھیں۔",
      error: "اس وقت تصدیق مکمل نہیں ہو سکی۔",
    },
  }[language];

  async function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setNotice("");
    try {
      const form = new FormData(event.currentTarget);
      const nextDetails = {
        name: String(form.get("name") || "").trim(),
        phone: String(form.get("phone") || "").trim(),
        email: String(form.get("email") || "").trim().toLowerCase(),
      };
      const response = await fetch(apiUrl("/api/auth/request-code"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...nextDetails, language }),
      });
      const data = await response.json() as { challengeId?: string; error?: string };
      if (!response.ok || !data.challengeId) throw new Error(data.error || ui.error);
      setDetails(nextDetails);
      setChallengeId(data.challengeId);
      setStage("code");
      setNotice(ui.sent);
    } catch (error) {
      setNotice(interfaceError(error, language, ui.error));
    } finally {
      setStatus("idle");
    }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setNotice("");
    try {
      const code = String(new FormData(event.currentTarget).get("code") || "").trim();
      const response = await fetch(apiUrl("/api/auth/verify-code"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId, email: details.email, code }),
      });
      const data = await response.json() as { token?: string; user?: PublicUser; error?: string };
      if (!response.ok || !data.token || !data.user) throw new Error(data.error || ui.error);
      onAuthenticated({ token: data.token, user: data.user });
    } catch (error) {
      setNotice(interfaceError(error, language, ui.error));
    } finally {
      setStatus("idle");
    }
  }

  return <div className="modal-content auth-gate">
    <div className="modal-icon"><KeyRound /></div>
    <h2>{stage === "details" ? ui.title : ui.verifyTitle}</h2>
    <p>{stage === "details" ? ui.intro : ui.verifyText}</p>
    {stage === "details" ? <form onSubmit={requestCode}>
      <div className="form-grid">
        <Field label={ui.name}><input name="name" required minLength={2} autoComplete="name" /></Field>
        <Field label={ui.phone}><input name="phone" required minLength={6} inputMode="tel" autoComplete="tel" dir="ltr" /></Field>
        <Field label={ui.email} wide><input name="email" required type="email" autoComplete="email" dir="ltr" /></Field>
      </div>
      <p className="auth-privacy"><ShieldCheck size={17} />{ui.privacy}</p>
      <button className="button button-primary button-block" disabled={status === "loading"}>{status === "loading" ? ui.sending : ui.send}</button>
    </form> : <form onSubmit={verifyCode}>
      <Field label={ui.code}><input className="verification-code" name="code" required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} dir="ltr" /></Field>
      <button className="button button-primary button-block" disabled={status === "loading"}>{status === "loading" ? ui.verifying : ui.verify}</button>
      <button className="text-button auth-edit" type="button" onClick={() => { setStage("details"); setNotice(""); }}>{ui.edit}</button>
    </form>}
    {notice && <p className={`auth-notice${stage === "code" && notice === ui.sent ? " success" : ""}`} aria-live="polite">{notice}</p>}
  </div>;
}

function Booking({ t, language, status, submit }: { t: SiteCopy; language: Language; status: string; submit: (event: FormEvent<HTMLFormElement>, endpoint: string) => Promise<void> }) {
  return <div className="modal-content"><div className="modal-icon"><CalendarDays /></div><h2>{t.bookingTitle}</h2><p>{t.bookingText}</p><form onSubmit={(event) => submit(event, "/api/consultations")}><div className="form-grid"><Field label={t.form.name}><input name="name" required /></Field><Field label={t.form.phone}><input name="phone" required dir="ltr" /></Field><Field label={t.form.email}><input name="email" type="email" required dir="ltr" /></Field><Field label={t.caseType}><CustomSelect name="caseType" ariaLabel={t.caseType} options={t.caseTypes.map((item) => ({ value: item, label: item }))} /></Field><Field label={t.preferred}><CustomSelect name="preferredContact" ariaLabel={t.preferred} options={[{ value: "WhatsApp", label: "WhatsApp" }, { value: t.phone, label: t.phone }, { value: t.email, label: t.email }]} /></Field><Field label={t.form.message} wide><textarea name="message" rows={4} /></Field></div><label className="honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label><input type="hidden" name="language" value={language} /><button className="button button-primary button-block" disabled={status === "loading"}>{status === "loading" ? t.loading : t.submitBooking}</button><FormNotice status={status} t={t} /></form></div>;
}

type IntakeState = ConnectedIntakeState;
type AssistantSession = { question: string; messages: Array<{ role: "user" | "assistant"; content: string }>; intake: IntakeState | null };

function Assistant({ t, language, token, initialSession, onSession, openBooking, startMemo }: { t: SiteCopy; language: Language; token: string; initialSession: AssistantSession | null; onSession: (session: AssistantSession) => void; openBooking: () => void; startMemo: (prefill: MemoPrefill) => void }) {
  const [streamedAnswer, setStreamedAnswer] = useState("");
  const [question, setQuestion] = useState(initialSession?.question || "");
  const [messages, setMessages] = useState<AssistantSession["messages"]>(initialSession?.messages || []);
  const [intake, setIntake] = useState<IntakeState | null>(initialSession?.intake || null);
  const [analysisStages, setAnalysisStages] = useState<AnalysisStage[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [voicePhase, setVoicePhase] = useState<VoicePhase>("idle");
  const [voiceError, setVoiceError] = useState("");
  const [continuousVoice, setContinuousVoice] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState<LegalVoice>(DEFAULT_LEGAL_VOICE);
  const [toolNotice, setToolNotice] = useState("");
  const [toolSession, setToolSession] = useState(0);
  const voiceRef = useRef<LegalVoiceConversation | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const operationRef = useRef(0);
  const busyRef = useRef(false);
  const voiceLanguageRef = useRef(language);
  const conversationRef = useRef({ messages, intake });
  const optionsRef = useRef({ language, voice: resolveLegalVoice(language, selectedVoice), continuous: continuousVoice, request: (path: string, init: RequestInit) => memoFetch(path, token, init), context: () => ({ messages: conversationRef.current.messages.slice(-16), currentState: cleanIntakeContext(conversationRef.current.intake) }), onAnalysis: acceptVoiceAnalysis, onText: setStreamedAnswer, onTranscript: (text: string) => { setQuestion(text); setStreamedAnswer(""); }, onState: (phase: VoicePhase, message: string) => { setVoicePhase(phase); setVoiceError(message); if (["idle", "stopped", "error"].includes(phase)) setStreamedAnswer(""); } });
  optionsRef.current = { ...optionsRef.current, language, voice: resolveLegalVoice(language, selectedVoice), continuous: continuousVoice, request: (path, init) => memoFetch(path, token, init), onAnalysis: acceptVoiceAnalysis };
  conversationRef.current = { messages, intake };
  const voiceUi = voiceCopy[language];
  const voiceActive = !["idle", "stopped", "error"].includes(voicePhase);
  const voiceLabel = voicePhase === "listening" ? voiceUi.finish : voicePhase === "blocked" ? voiceUi.play : voiceActive ? voiceUi.stop : voiceUi.start;
  const intro = language === "ar" ? "السلام عليكم، أنا سابق مساعدك القانوني. اشرح لي قضيتك بتأني، وسأساعدك خطوة بخطوة حتى تتضح الوقائع والطلبات." : language === "en" ? "Welcome, I’m Sabeq, your legal assistant. Tell me about your case, and I will help you clarify the facts and requested relief step by step." : "السلام علیکم، میں سابق، آپ کا قانونی معاون ہوں۔ اپنا مقدمہ بتائیں؛ میں حقائق اور مطالبات واضح کرنے میں مرحلہ وار مدد کروں گا۔";
  useEffect(() => {
    voiceRef.current = new LegalVoiceConversation(() => optionsRef.current);
    try { const saved = localStorage.getItem("sabeq-assistant-voice"); if (isLegalVoice(saved)) setSelectedVoice(saved); } catch {}
    return () => {
      operationRef.current++;
      requestRef.current?.abort();
      voiceRef.current?.dispose();
      voiceRef.current = null;
    };
  }, []);
  useEffect(() => { if (voiceLanguageRef.current !== language) { voiceRef.current?.stop(); voiceLanguageRef.current = language; } }, [language]);
  useEffect(() => { onSession({ question, messages, intake }); }, [question, messages, intake, onSession]);

  function stopSpeaking() { voiceRef.current?.stop(); }
  function selectVoice(value: string) {
    if (!isLegalVoice(value)) return;
    stopSpeaking(); setSelectedVoice(value);
    try { localStorage.setItem("sabeq-assistant-voice", value); } catch {}
  }
  function newConversation() {
    operationRef.current++; requestRef.current?.abort(); stopSpeaking(); busyRef.current = false;
    conversationRef.current = { messages: [], intake: null };
    setToolSession(current => current + 1);
    setMessages([]); setIntake(null); setQuestion(""); setError(""); setToolNotice(""); setAnalysisStages([]); setStreamedAnswer(""); setLoading(false);
  }

  function acceptVoiceAnalysis(text: string, result: VoiceAnalysisResult) {
    const nextMessages = [...conversationRef.current.messages, { role: "user" as const, content: text }, { role: "assistant" as const, content: result.state.assistantMessage }];
    conversationRef.current = { messages: nextMessages, intake: result.state };
    setMessages(nextMessages); setIntake(result.state); setQuestion(""); setError(""); setStreamedAnswer("");
  }

  function conversationText() {
    return conversationTranscript(messages, language);
  }

  function editMessage(index: number) {
    const item = messages[index];
    if (!item || item.role !== "user" || loading) return;
    stopSpeaking();
    setQuestion(item.content);
    setMessages((current) => current.slice(0, index));
    setIntake(null); setToolNotice(tr(language, "تم نقل الرسالة إلى خانة الكتابة لتعديلها وإعادة إرسالها."));
  }

  function deleteMessage(index: number) {
    if (loading || !window.confirm(tr(language, "هل تريد حذف هذه الرسالة من المحادثة؟"))) return;
    stopSpeaking();
    setMessages((current) => current.filter((_, messageIndex) => messageIndex !== index));
    setIntake(null); setToolNotice(tr(language, "تم حذف الرسالة. سيُعاد بناء التحليل عند رسالتك التالية."));
  }

  function exportConversation() {
    if (!messages.length) return;
    const blob = new Blob([`${tr(language, "محادثة المساعد القانوني")} – ${t.brand}\n${new Date().toLocaleString(language === "en" ? "en-GB" : language === "ur" ? "ur-PK" : "ar-KW")}\n\n${conversationText()}`], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a");
    link.href = url; link.download = `sabeq-conversation-${new Date().toISOString().slice(0, 10)}.txt`; link.click(); URL.revokeObjectURL(url);
    setToolNotice(tr(language, "تم تصدير المحادثة إلى ملف نصي."));
  }

  async function shareConversation() {
    if (!messages.length) return;
    const text = conversationText();
    try {
      if (navigator.share) await navigator.share({ title: tr(language, "محادثة المساعد القانوني"), text });
      else { await navigator.clipboard.writeText(text); setToolNotice(tr(language, "تم نسخ المحادثة، ويمكنك إرسالها في التطبيق الذي تختاره.")); }
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      setError(tr(language, "تعذرت المشاركة. جرّب تصدير المحادثة بدلاً من ذلك."));
    }
  }

  async function submitMessage(rawMessage: string, voiceTurn = false, externalSignal?: AbortSignal): Promise<string> {
    const message = rawMessage.trim();
    if (busyRef.current) throw new Error(tr(language, "انتظر اكتمال الرد الحالي."));
    try { validateAssistantInput(message, conversationRef.current.messages, language); }
    catch (caught) {
      setQuestion(rawMessage);
      setError(caught instanceof Error ? caught.message : t.error);
      throw caught;
    }
    const operation = ++operationRef.current;
    const request = new AbortController(); requestRef.current = request;
    const signal = externalSignal ? AbortSignal.any([externalSignal, request.signal, AbortSignal.timeout(60_000)]) : AbortSignal.any([request.signal, AbortSignal.timeout(60_000)]);
    const previous = conversationRef.current;
    busyRef.current = true;
    setLoading(true); setStreamedAnswer(""); setAnalysisStages([]); setError("");
    if (!voiceTurn) setQuestion("");
    try {
      const response = await memoFetch("/api/legal/assistant", token, { method: "POST", signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message, messages: previous.messages.slice(-16), currentState: cleanIntakeContext(previous.intake), language, voiceTurn, stream: true }) });
      let data: { state?: IntakeState; error?: string } = {};
      if (response.ok && response.headers.get("Content-Type")?.includes("text/event-stream") && response.body) {
        let completed = false;
        for await (const event of readSSE(response.body)) {
          signal.throwIfAborted();
          if (operation !== operationRef.current) throw new DOMException("Cancelled", "AbortError");
          if (event.type === "text") setStreamedAnswer(event.text);
          if (event.type === "stage") setAnalysisStages(current => [...current.filter(stage => stage.id !== event.stage.id), event.stage]);
          if (event.type === "error") throw new Error(event.error);
          if (event.type === "done") { data = event; completed = true; }
        }
        if (!completed) throw new Error(tr(language, "انقطع الرد قبل اكتماله. يرجى المحاولة مجدداً."));
      } else data = await readServiceJson(response);
      signal.throwIfAborted();
      if (operation !== operationRef.current) throw new DOMException("Cancelled", "AbortError");
      if (!response.ok || !data.state) throw new Error(data.error || t.error);
      const nextMessages = [...previous.messages, { role: "user" as const, content: message }, { role: "assistant" as const, content: data.state.assistantMessage }];
      conversationRef.current = { messages: nextMessages, intake: data.state };
      setMessages(nextMessages); setIntake(data.state); setQuestion("");
      return data.state.assistantMessage;
    } catch (caught) {
      if (operation === operationRef.current) {
        setQuestion(message);
        if (!externalSignal?.aborted && !request.signal.aborted) setError(interfaceError(caught, language, t.error));
      }
      throw caught;
    } finally {
      if (operation === operationRef.current) { busyRef.current = false; requestRef.current = null; setLoading(false); setStreamedAnswer(""); }
    }
  }
  async function ask(event: FormEvent) {
    event.preventDefault(); stopSpeaking();
    try { await submitMessage(question); } catch { /* Error remains beside the preserved input. */ }
  }
  return <div className="modal-content legal-intake"><div className="assistant-opening-identity"><span className="assistant-portrait assistant-header-portrait"><img src={assetUrl("/images/sabeq-assistant-avatar.jpg")} alt="" width={84} height={84} decoding="async" /></span><h2>{t.assistant}</h2></div><p className="assistant-welcome">{intro}</p>
    <div className="intake-progress"><span><b>{intake?.progress || 0}%</b>{` ${tr(language, "اكتمال فهم القضية")}`}</span><i><em style={{ width: `${intake?.progress || 0}%` }} /></i></div>
    <div className="conversation-toolbar" aria-label={tr(language, "أدوات المحادثة")}><button type="button" onClick={newConversation} title={voiceUi.newChat}><Trash2 size={18} /><span>{voiceUi.newChat}</span></button><button type="button" onClick={exportConversation} disabled={!messages.length} title={tr(language, "تصدير المحادثة")}><Download size={18} /><span>{tr(language, "تصدير")}</span></button><button type="button" onClick={shareConversation} disabled={!messages.length} title={tr(language, "إرسال أو مشاركة المحادثة")}><Share2 size={18} /><span>{tr(language, "إرسال")}</span></button></div>
    <LegalToolsPanel key={toolSession} language={language} disabled={loading || voiceActive} request={(path, init) => memoFetch(path, token, init)} caseText={intake ? [...intake.facts, ...intake.requests].join("\n") : ""} onUseText={text => { setQuestion(text); setToolNotice(tr(language, "راجع النص المنقول ثم أرسله. لم يُضف إلى وقائع القضية تلقائياً.")); }} />
    <div className="intake-chat"><div className="chat-welcome"><Sparkles size={17} />{intro}</div>{messages.map((item, index) => <div key={`${item.role}-${index}`} className={`intake-message ${item.role}`}><b><span>{item.role === "user" ? tr(language, "أنت") : t.assistant}</span><span className="message-tools">{item.role === "user" && <button type="button" className="message-tool" onClick={() => editMessage(index)} aria-label={tr(language, "تعديل الرسالة")} title={tr(language, "تعديل")}><Pencil size={17} /></button>}<button type="button" className="message-tool danger" onClick={() => deleteMessage(index)} aria-label={tr(language, "حذف الرسالة")} title={tr(language, "حذف")}><Trash2 size={17} /></button></span></b><p>{item.content}</p></div>)}{(loading || voiceActive) && streamedAnswer && <div className="intake-message assistant" aria-live="polite"><b>{t.assistant}</b><p>{streamedAnswer}</p></div>}{loading && !streamedAnswer && <div className="intake-thinking"><Sparkles size={16} />{tr(language, "أحلل المعلومات وأحدد السؤال التالي…")}</div>}</div>
    {intake && <div className="intake-dashboard">
      <div className="intake-classification"><span><small>{tr(language, "نوع القضية")}</small><b>{interfaceLabel(intake.caseType, language) || tr(language, "قيد التحليل")}</b></span><span><small>{tr(language, "المرحلة")}</small><b>{interfaceLabel(intake.caseStage, language) || tr(language, "غير محددة")}</b></span><span><small>{tr(language, "المحكمة المبدئية")}</small><b>{[intake.court, intake.courtCircuit].filter(Boolean).map(value => interfaceLabel(value, language)).join(" - ") || tr(language, "تحتاج معلومات إضافية")}</b></span><span><small>{tr(language, "درجة الثقة")}</small><b>{intake.jurisdictionConfidence === "high" ? tr(language, "مرتفعة") : intake.jurisdictionConfidence === "medium" ? tr(language, "متوسطة") : tr(language, "منخفضة")}</b></span></div>
      {intake.jurisdictionReason && <p className="jurisdiction-note"><Landmark size={17} />{intake.jurisdictionReason}</p>}
      <p className="form-notice">{language === "ar" ? "راجع وقائع قضيتك وأسماء الأطراف فقط. البحث عن القوانين والمواد وأحكام التمييز ومراجعتها من مهام المساعد والمجموعة، ولا يلزمك إرفاقها." : language === "en" ? "Review your case facts and names. The assistant and legal team research and verify legislation and precedents; you do not need to attach them." : "اپنے مقدمے کے حقائق اور نام دیکھیں۔ قانونی دفعات اور نظائر کی تحقیق معاون اور قانونی ٹیم کریں گے؛ آپ کو انہیں منسلک کرنے کی ضرورت نہیں۔"}</p>
      {intake.missingInformation.length > 0 && <details open><summary>{tr(language, "وقائع تحتاج توضيحاً منك")}</summary><ul>{intake.missingInformation.map((item) => <li key={item}>{item}</li>)}</ul></details>}
      {intake.documentsNeeded.length > 0 && <details><summary>{tr(language, "مستندات تخص وقائع قضيتك")}</summary><ul>{intake.documentsNeeded.map((item) => <li key={item}>{item}</li>)}</ul></details>}
      <IntakeAnalysisView state={intake} language={language} />
      {canOfferMemoHandoff(intake) && <div className="memo-consent"><ShieldCheck size={22} /><div><b>{tr(language, "نقل بيانات القضية إلى مولد المذكرات")}</b><p>{tr(language, "ستُنقل البيانات المستخلصة من المحادثة لمراجعتها وتصحيحها، مع استكمال أي بيانات ناقصة قبل التوليد.")}</p><p role="note">{memoApprovalNotice[language]}</p></div><button className="button button-primary" onClick={() => { if (!window.confirm(memoApprovalNotice[language])) return; stopSpeaking(); startMemo({ ...buildMemoHandoff(intake, messages), conversationTranscript: conversationTranscript(messages, language) }); }}><FileText size={18} />{tr(language, "أفهم وأوافق، انتقل إلى مولد المذكرات")}</button></div>}
    </div>}
    {loading && analysisStages.length > 0 && <IntakeStages stages={analysisStages} language={language} />}
    <div className="assistant-voice-settings">
      <label><input type="checkbox" checked={continuousVoice} onChange={event => setContinuousVoice(event.target.checked)} />{voiceUi.auto}</label>
      {language !== "ar" && <label className="assistant-voice-select">{voiceUi.voice}<select value={selectedVoice} onChange={event => selectVoice(event.target.value)} disabled={voiceActive}>{LEGAL_VOICES.map(voice => <option key={voice} value={voice}>{voice[0].toUpperCase() + voice.slice(1)}</option>)}</select></label>}
    </div>
    <form className="chat-form voice-chat-form" onSubmit={ask}>
      <textarea aria-label={tr(language, "رسالتك للمساعد القانوني")} value={question} onChange={event => setQuestion(event.target.value)} placeholder={voiceUi.placeholder} rows={4} disabled={voiceActive || loading} />
      <div className="voice-chat-actions"><button type="button" className={`voice-chat-button voice-wave-button phase-${voicePhase}`} onClick={() => { void voiceRef.current?.toggle(); }} disabled={loading && !voiceActive} aria-label={voiceLabel} title={voiceLabel} aria-pressed={voiceActive} aria-describedby="assistant-voice-status"><VoiceWaveform /></button><button type="submit" className="voice-chat-send" aria-label={tr(language, "إرسال الرسالة")} disabled={loading || voiceActive || !question.trim()}><Send size={21} /></button></div>
    </form>
    <p className="assistant-input-limit" aria-live="polite">{question.trim().length.toLocaleString(language)} / {ASSISTANT_MESSAGE_LIMIT.toLocaleString(language)} — {assistantInputCopy(language).hint}</p>
    <p id="assistant-voice-status" className={`assistant-voice-status phase-${voicePhase}`} role="status" aria-live="polite">{voiceUi.phases[voicePhase]}{voicePhase === "listening" && <small>{voiceUi.hint}</small>}</p>
    {["transcribing", "analyzing", "preparing"].includes(voicePhase) && <VoiceCountdown language={language} />}
    {voicePhase === "listening" && <div className="voice-chat-actions"><button type="button" className="button button-primary" onClick={() => voiceRef.current?.finish()}><Send size={18} />{voiceUi.finish}</button><button type="button" className="text-button" onClick={stopSpeaking}>{voiceUi.stop}</button></div>}
    <p className="assistant-voice-disclosure">{voiceUi.disclosure}</p>
    {voiceError && <p className="form-notice error" role="alert">{interfaceError(voiceError, language, voiceUi.failed)}</p>}
    {toolNotice && <p className="conversation-tool-notice" role="status">{toolNotice}</p>}
    {error && <p className="form-notice error">{error}</p>}<p className="disclaimer"><ShieldCheck size={15} />{tr(language, "التوجيه للمحكمة مبدئي، ويجب اعتماده من محامٍ بعد مراجعة المستندات والمواعيد.")}</p><button className="text-button" onClick={openBooking}>{t.book}<ArrowLeft size={15} /></button></div>;
}

function Library({ t, language, token }: { t: SiteCopy; language: Language; token: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ title: string; lawNumber?: string; lawYear?: number; summary?: string; sourceUrl: string }>>([]);
  const [searched, setSearched] = useState(false);
  async function search(event: FormEvent) { event.preventDefault(); if (!query.trim()) return; const response = await authenticatedFetch(`/api/legal/search?q=${encodeURIComponent(query)}&language=${language}`, token); const data = await response.json() as { results?: typeof results }; setResults(data.results || []); setSearched(true); }
  return <div className="modal-content"><div className="modal-icon"><BookOpen /></div><h2>{t.library}</h2><p>{t.libraryText}</p><form className="library-search" onSubmit={search}><Search size={20} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.searchPlaceholder} /><button className="button button-primary">{t.search}</button></form><div className="search-results">{results.map((item) => <article key={item.sourceUrl}><h3>{item.title}</h3><p>{item.summary}</p><a href={item.sourceUrl} target="_blank" rel="noreferrer">{item.lawNumber ? `${item.lawNumber}/${item.lawYear}` : t.search}<ArrowLeft size={14} /></a></article>)}{searched && results.length === 0 && <p>{language === "ar" ? "لا توجد نتيجة موثقة مطابقة." : language === "en" ? "No matching verified result was found." : "کوئی مطابق مصدقہ نتیجہ نہیں ملا۔"}</p>}{!searched && <div className="empty-search"><BookOpen size={28} /><p>{t.emptySearch}</p></div>}</div></div>;
}

type AnalysisParty = { name: string; role: string };
type AnalysisFields = Partial<Record<keyof typeof pleadingFields,string>> & {
  caseType: string;
  caseNumber: string;
  court: string;
  clientName: string;
  phone: string;
  partyRole: string;
  otherParty: string;
  legalIssues: string;
};

const emptyAnalysisFields: AnalysisFields = {
  caseType: "",
  caseNumber: "",
  court: "",
  clientName: "",
  phone: "",
  partyRole: "",
  otherParty: "",
  legalIssues: "",
};

function MemoWizard({ t, language, token, initialData = null }: { t: SiteCopy; language: Language; token: string; initialData?: MemoPrefill | null }) {
  const [step, setStep] = useState(() => isCompleteMemoHandoff(initialData) ? 3 : 0);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [memoError, setMemoError] = useState("");
  const [memoApproved, setMemoApproved] = useState(false);
  const [generationSeconds, setGenerationSeconds] = useState(0);
  const generationRequest = useRef<AbortController | null>(null);
  const generationMounted = useRef(true);
  const generationUi = memoGenerationCopy(language);
  useEffect(() => { generationMounted.current = true; return () => { generationMounted.current = false; generationRequest.current?.abort(); }; }, []);
  useEffect(() => {
    if (status !== "loading") return;
    const start = Date.now(); setGenerationSeconds(0);
    const interval = window.setInterval(() => setGenerationSeconds(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => window.clearInterval(interval);
  }, [status]);
  const [memo, setMemo] = useState("");
  const [memoQuality,setMemoQuality] = useState<{status:string;notices:string[]} | null>(null);
  const [memoDocument,setMemoDocument] = useState<PleadingDocument | null>(null);
  const [resultNotice, setResultNotice] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [voiceEntryBusy, setVoiceEntryBusy] = useState(false);
  const [voiceFormVersion, setVoiceFormVersion] = useState(0);
  const memoFormRef = useRef<HTMLFormElement | null>(null);
  const [memoAnalysis, setMemoAnalysis] = useState<{ sourceCount: number; lawCount: number; cassationCount: number; sources: Array<{ marker: string; title: string; reference: string; kind: "cassation" | "legislation"; officialSource: string; sourceUrl?: string; libraryUpdatedAt?: string | null }> } | null>(null);
  const [facts, setFacts] = useState(initialData?.facts || "");
  const [requests, setRequests] = useState(initialData?.requests || "");
  const [recordingField, setRecordingField] = useState<"facts" | "requests" | null>(null);
  const [transcribingField, setTranscribingField] = useState<"facts" | "requests" | null>(null);
  const [draftAction, setDraftAction] = useState<"improve_facts" | "extract_requests" | "improve_requests" | null>(null);
  const [draftNotice, setDraftNotice] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [draftSources, setDraftSources] = useState<Array<{ title: string; reference: string }>>([]);
  const [memoData, setMemoData] = useState<Record<string, string>>(initialData || {});
  const [documents, setDocuments] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [analysisNotice, setAnalysisNotice] = useState("");
  const [analysisFields, setAnalysisFields] = useState<AnalysisFields>(emptyAnalysisFields);
  const [analysisParties, setAnalysisParties] = useState<AnalysisParty[]>([]);
  const [analysisWarnings, setAnalysisWarnings] = useState<string[]>([]);
  const documentInputRef = useRef<HTMLInputElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ui = {
    ar: {
      uploadTitle: "ارفع مستندات القضية أولاً",
      uploadText: "PDF أو Word أو نصوص أو صور واضحة — بحد أقصى 25 مستندًا وإجمالي 50 ميغابايت.",
      chooseFiles: "اختيار المستندات",
      analyze: "تحليل المستندات واستخراج البيانات",
      analyzing: "جارٍ تحليل المستندات...",
      analysisReady: "اكتمل التحليل. راجع البيانات المستخرجة وعدّلها أو أضف إليها قبل المتابعة.",
      analysisTitle: "البيانات المستخرجة والقابلة للتعديل",
      parties: "الخصوم والأطراف",
      partyName: "اسم الطرف",
      partyRole: "صفة الطرف",
      addParty: "إضافة طرف",
      removeFile: "حذف المستند",
      caseNumber: tr(language, "رقم القضية"),
      continueManual: "المتابعة بالإدخال اليدوي",
      filesRequired: "اختر مستنداً واحداً على الأقل للتحليل.",
      fileTypeError: "صيغة الملف غير مدعومة. استخدم PDF أو DOCX أو TXT أو RTF أو JPG أو PNG أو WEBP.",
      fileCountError: "يمكن رفع 25 مستندًا كحد أقصى.",
      fileSizeError: "إجمالي حجم المستندات يجب ألا يتجاوز 50 ميغابايت.",
      privacyUpload: "تُستخدم المستندات للتحليل فقط وتُحذف من خدمة التحليل فور اكتماله.",
      allParties: "جميع الأطراف والصفات",
      allPartiesHint: "يمكنك تعديل القائمة أو إضافة أي طرف لم يظهر في المستندات.",
      analysisWarnings: "ملاحظات تحتاج إلى مراجعتك",
      improve: "تحسين الصياغة القانونية",
      extract: "استخراج الطلبات",
      record: "ابدأ التسجيل الصوتي",
      stop: "إيقاف التسجيل",
      recording: "جارٍ التسجيل... اضغط زر الميكروفون للإيقاف.",
      transcribing: "جارٍ تحويل التسجيل إلى نص...",
      micUnavailable: "التسجيل الصوتي غير متاح في هذا المتصفح. جرّب فتح الموقع في Chrome أو Safari واسمح باستخدام الميكروفون.",
      micDenied: "تعذر تشغيل الميكروفون. تأكد من منح الموقع إذن استخدام الميكروفون.",
      shortText: "أدخل عشرة أحرف على الأقل قبل استخدام أداة الصياغة.",
      sources: (count: number) => `استُرجعت ${count} مقاطع من مكتبة الموقع. يتولى المساعد مراجعة الأسانيد والمجموعة اعتمادها.`,
      noSources: "تمت معالجة النص من الوقائع المدخلة فقط من دون إضافة سند قانوني لعدم وجود تطابق موثق.",
      sourceList: "المراجع القانونية المستخدمة",
    },
    en: {
      uploadTitle: "Upload the case documents first",
      uploadText: "PDF, Word, text, or clear images — up to 25 documents and 50 MB in total.",
      chooseFiles: "Choose documents",
      analyze: "Analyse documents and extract details",
      analyzing: "Analysing documents...",
      analysisReady: "Analysis complete. Review, edit, or add to the extracted details before continuing.",
      analysisTitle: "Editable extracted details",
      parties: "Parties and opponents",
      partyName: "Party name",
      partyRole: "Party role",
      addParty: "Add party",
      removeFile: "Remove document",
      caseNumber: "Case number",
      continueManual: "Continue with manual entry",
      filesRequired: "Choose at least one document to analyse.",
      fileTypeError: "Unsupported format. Use PDF, DOCX, TXT, RTF, JPG, PNG, or WEBP.",
      fileCountError: "You can upload up to 25 documents.",
      fileSizeError: "The total document size must not exceed 50 MB.",
      privacyUpload: "Documents are used only for analysis and deleted from the analysis service immediately afterwards.",
      allParties: "All parties and roles",
      allPartiesHint: "Edit the list or add any party that was not found in the documents.",
      analysisWarnings: "Items that need your review",
      improve: "Improve legal drafting",
      extract: "Extract requests",
      record: "Start voice recording",
      stop: "Stop recording",
      recording: "Recording... press the microphone again to stop.",
      transcribing: "Converting the recording to text...",
      micUnavailable: "Voice recording is unavailable in this browser. Open the site in Chrome or Safari and allow microphone access.",
      micDenied: "The microphone could not start. Check this site's microphone permission.",
      shortText: "Enter at least ten characters before using a drafting tool.",
      sources: (count: number) => `${count} verified legal passages from the site library were used. Review the result before relying on it.`,
      noSources: "The text was processed from your facts only; no legal authority was added because no verified match was found.",
      sourceList: "Legal references used",
    },
    ur: {
      uploadTitle: "سب سے پہلے مقدمے کی دستاویزات اپ لوڈ کریں",
      uploadText: "PDF، Word، متن یا واضح تصاویر — زیادہ سے زیادہ 25 فائلیں اور مجموعی حجم 50 MB۔",
      chooseFiles: "دستاویزات منتخب کریں",
      analyze: "دستاویزات کا تجزیہ اور معلومات اخذ کریں",
      analyzing: "دستاویزات کا تجزیہ جاری ہے...",
      analysisReady: "تجزیہ مکمل ہوگیا۔ آگے بڑھنے سے پہلے معلومات کا جائزہ لے کر ترمیم یا اضافہ کریں۔",
      analysisTitle: "قابلِ ترمیم اخذ شدہ معلومات",
      parties: "فریقین اور مخالفین",
      partyName: "فریق کا نام",
      partyRole: "فریق کی حیثیت",
      addParty: "فریق شامل کریں",
      removeFile: "دستاویز حذف کریں",
      caseNumber: "مقدمہ نمبر",
      continueManual: "دستی اندراج کے ساتھ آگے بڑھیں",
      filesRequired: "تجزیے کے لیے کم از کم ایک دستاویز منتخب کریں۔",
      fileTypeError: "یہ فارمیٹ قابلِ قبول نہیں۔ PDF، DOCX، TXT، RTF، JPG، PNG یا WEBP استعمال کریں۔",
      fileCountError: "زیادہ سے زیادہ 25 دستاویزات اپ لوڈ کی جا سکتی ہیں۔",
      fileSizeError: "دستاویزات کا مجموعی حجم 50 MB سے زیادہ نہیں ہونا چاہیے۔",
      privacyUpload: "دستاویزات صرف تجزیے کے لیے استعمال ہوتی ہیں اور مکمل ہوتے ہی تجزیاتی خدمت سے حذف کردی جاتی ہیں۔",
      allParties: "تمام فریقین اور حیثیتیں",
      allPartiesHint: "فہرست میں ترمیم کریں یا کوئی غائب فریق شامل کریں۔",
      analysisWarnings: "وہ نکات جن کا آپ کو جائزہ لینا ہے",
      improve: "قانونی عبارت بہتر کریں",
      extract: "درخواستیں اخذ کریں",
      record: "آواز ریکارڈ کریں",
      stop: "ریکارڈنگ روکیں",
      recording: "ریکارڈنگ جاری ہے... روکنے کے لیے مائیک دوبارہ دبائیں۔",
      transcribing: "ریکارڈنگ کو متن میں بدلا جا رہا ہے...",
      micUnavailable: "اس براؤزر میں آواز ریکارڈ نہیں ہو سکتی۔ سائٹ Chrome یا Safari میں کھولیں اور مائیک کی اجازت دیں۔",
      micDenied: "مائیک شروع نہیں ہو سکا۔ سائٹ کے لیے مائیک کی اجازت چیک کریں۔",
      shortText: "تحریری آلہ استعمال کرنے سے پہلے کم از کم دس حروف درج کریں۔",
      sources: (count: number) => `سائٹ کی لائبریری سے ${count} مصدقہ قانونی اقتباسات استعمال ہوئے۔ نتیجہ اپنانے سے پہلے جائزہ لیں۔`,
      noSources: "مصدقہ مطابقت نہ ملنے پر صرف درج حقائق سے متن تیار ہوا اور کوئی قانونی حوالہ شامل نہیں کیا گیا۔",
      sourceList: "استعمال شدہ قانونی حوالے",
    },
  }[language];

  useEffect(() => () => {
    if (autoStopRef.current) clearTimeout(autoStopRef.current);
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.onstop = null;
      recorderRef.current.stop();
    }
    audioStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  function formatDocumentSize(bytes: number) {
    return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  function invalidateAnalysis() {
    setAnalysisStatus("idle");
    setAnalysisNotice("");
    setAnalysisWarnings([]);
  }

  function addDocuments(incoming: File[]) {
    const supported = new Set(["pdf", "docx", "txt", "rtf", "jpg", "jpeg", "png", "webp"]);
    const supportedMimeTypes = new Set([
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "text/rtf",
      "application/rtf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ]);
    const unique = incoming.filter((file) => !documents.some((current) => current.name === file.name && current.size === file.size && current.lastModified === file.lastModified));
    if (unique.some((file) => {
      const extension = file.name.toLowerCase().split(".").pop() || "";
      return !supported.has(extension) && !supportedMimeTypes.has(file.type.toLowerCase());
    })) {
      setAnalysisStatus("error");
      setAnalysisNotice(ui.fileTypeError);
      return;
    }
    const next = [...documents, ...unique];
    if (next.length > 25) {
      setAnalysisStatus("error");
      setAnalysisNotice(ui.fileCountError);
      return;
    }
    if (next.reduce((sum, file) => sum + file.size, 0) > 50 * 1024 * 1024) {
      setAnalysisStatus("error");
      setAnalysisNotice(ui.fileSizeError);
      return;
    }
    setDocuments(next);
    invalidateAnalysis();
  }

  function removeDocument(index: number) {
    setDocuments((current) => current.filter((_, itemIndex) => itemIndex !== index));
    invalidateAnalysis();
    if (documentInputRef.current) documentInputRef.current.value = "";
  }

  function updateAnalysisParty(index: number, field: keyof AnalysisParty, value: string) {
    setAnalysisParties((current) => current.map((party, itemIndex) => itemIndex === index ? { ...party, [field]: value } : party));
  }

  async function analyzeDocuments() {
    if (!documents.length) {
      setAnalysisStatus("error");
      setAnalysisNotice(ui.filesRequired);
      return;
    }
    setAnalysisStatus("loading");
    setAnalysisNotice("");
    setAnalysisWarnings([]);
    try {
      const form = new FormData();
      documents.forEach((file) => form.append("documents", file, file.name));
      form.set("language", language);
      const response = await memoFetch("/api/legal/analyze-documents", token, { method: "POST", body: form });
      const data = await readServiceJson<{
        analysis?: AnalysisFields & {
          parties: AnalysisParty[];
          facts: string;
          requests: string;
          warnings: string[];
        };
        error?: string;
      }>(response);
      if (!response.ok || !data.analysis) throw new Error(data.error || t.error);
      const extracted = data.analysis;
      const parties = extracted.parties?.length
        ? extracted.parties
        : [
            ...(extracted.clientName ? [{ name: extracted.clientName, role: extracted.partyRole }] : []),
            ...(extracted.otherParty ? [{ name: extracted.otherParty, role: language === "en" ? "Other party" : language === "ur" ? "دوسرا فریق" : "الطرف الآخر" }] : []),
          ];
      setAnalysisFields({
        ...Object.fromEntries(Object.keys(pleadingFields).map(key=>[key,extracted[key as keyof typeof pleadingFields] || ""])),
        caseType: extracted.caseType || "",
        caseNumber: extracted.caseNumber || "",
          court: extracted.court || "",
          clientName: extracted.clientName || "",
          phone: extracted.phone || "",
          partyRole: extracted.partyRole || "",
        otherParty: extracted.otherParty || "",
        legalIssues: extracted.legalIssues || "",
      });
      setAnalysisParties(parties);
      setFacts(extracted.facts || "");
      setRequests(extracted.requests || "");
      setAnalysisWarnings(extracted.warnings || []);
      setAnalysisStatus("success");
      setAnalysisNotice(ui.analysisReady);
    } catch (error) {
      setAnalysisStatus("error");
      setAnalysisNotice(interfaceError(error, language, t.error));
    }
  }

  function editGeneratedMemo() {
    setMemo("");
    setMemoDocument(null);
    setMemoAnalysis(null);
    setResultNotice(null);
    setStatus("idle");
    setStep(1);
  }

  function deleteGeneratedMemo() {
    const ok = window.confirm(language === "ar" ? "حذف المذكرة الحالية من الشاشة؟" : language === "en" ? "Delete the current draft from the screen?" : "موجودہ مسودہ اسکرین سے حذف کریں؟");
    if (!ok) return;
    setMemo("");
    setMemoDocument(null);
    setMemoAnalysis(null);
    setResultNotice(null);
    setStatus("idle");
    setStep(3);
  }

  function exportGeneratedMemo() {
    const filename = memoDocument ? `sabeq-${memoDocument.kind}-draft.docx` : "sabeq-legal-draft.html";
    const blob = memoDocument
      ? new Blob([new Uint8Array(exportPleadingDocx(memoDocument))], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" })
      : new Blob([renderArabicMemoHtml(memo)], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function printGeneratedMemo() {
    const html = memoDocument ? renderPleadingHtml(memoDocument) : renderArabicMemoHtml(memo);
    const frame = window.document.createElement("iframe");
    frame.style.position = "fixed";
    frame.style.inset = "0";
    frame.style.width = "1px";
    frame.style.height = "1px";
    frame.style.opacity = "0";
    frame.style.pointerEvents = "none";
    frame.srcdoc = html;
    window.document.body.appendChild(frame);
    frame.onload = async () => {
      try {
        await frame.contentWindow?.document.fonts.ready;
        frame.contentWindow?.focus();
        frame.contentWindow?.print();
        setResultNotice({ kind: "success", message: language === "ar" ? "تم فتح نافذة الطباعة." : language === "en" ? "Print dialog opened." : "پرنٹ ونڈو کھل گئی۔" });
      } catch {
        setResultNotice({ kind: "error", message: language === "ar" ? "تعذر فتح الطباعة في هذا المتصفح." : language === "en" ? "Printing is unavailable in this browser." : "اس براؤزر میں پرنٹ دستیاب نہیں۔" });
      } finally {
        window.setTimeout(() => frame.remove(), 1500);
      }
    };
  }

  async function archiveGeneratedMemo() {
    if (!token) {
      setResultNotice({ kind: "error", message: language === "ar" ? "الأرشفة تحتاج تسجيل دخول حتى تُحفظ في حسابك." : language === "en" ? "Archiving requires sign-in so it can be saved to your account." : "آرکائیو کے لیے سائن اِن ضروری ہے۔" });
      return;
    }
    setArchiving(true);
    setResultNotice(null);
    try {
      const response = await memoFetch("/api/legal/archive-memo", token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memo, title: memoDocument?.title || tr(language, "المذكرة القانونية"), documentKind: memoDocument?.kind || "", template: memoDocument?.template?.sourceFilename || "" }),
      });
      const data = await readServiceJson<{ ok?: boolean; error?: string }>(response);
      if (!response.ok || !data.ok) throw new Error(data.error || t.error);
      setResultNotice({ kind: "success", message: language === "ar" ? "تمت أرشفة المذكرة في حسابك." : language === "en" ? "Draft archived to your account." : "مسودہ آپ کے اکاؤنٹ میں محفوظ ہو گیا۔" });
    } catch (error) {
      setResultNotice({ kind: "error", message: interfaceError(error, language, t.error) });
    } finally {
      setArchiving(false);
    }
  }

  function stopRecording() {
    if (autoStopRef.current) clearTimeout(autoStopRef.current);
    autoStopRef.current = null;
    if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
  }

  async function startRecording(field: "facts" | "requests") {
    setDraftNotice(null);
    setDraftSources([]);
    if (recordingField === field) {
      stopRecording();
      return;
    }
    if (recordingField || transcribingField || draftAction) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setDraftNotice({ kind: "error", message: ui.micUnavailable });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
      });
      audioStreamRef.current = stream;
      const preferredTypes = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
      const supportsMimeType = typeof MediaRecorder.isTypeSupported === "function";
      const mimeType = supportsMimeType ? preferredTypes.find((type) => MediaRecorder.isTypeSupported(type)) : undefined;
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 32_000 })
        : new MediaRecorder(stream, { audioBitsPerSecond: 32_000 });
      recorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) audioChunksRef.current.push(event.data); };
      recorder.onerror = () => {
        setDraftNotice({ kind: "error", message: tr(language, "انقطع التسجيل الصوتي. اضغط الميكروفون مرة أخرى لإعادة المحاولة.") });
      };
      recorder.onstop = async () => {
        const recordedType = recorder.mimeType || mimeType || "audio/webm";
        const audio = new Blob(audioChunksRef.current, { type: recordedType });
        audioStreamRef.current?.getTracks().forEach((track) => track.stop());
        audioStreamRef.current = null;
        recorderRef.current = null;
        setRecordingField(null);
        if (!audio.size) {
          setDraftNotice({ kind: "error", message: ui.micDenied });
          return;
        }
        setTranscribingField(field);
        try {
          const form = new FormData();
          const extension = recordedType.includes("mp4") ? "m4a" : "webm";
          form.append("audio", audio, `legal-dictation.${extension}`);
          form.set("language", language);
          const response = await memoFetch("/api/legal/transcribe", token, { method: "POST", body: form });
          const data = await readServiceJson<{ text?: string; error?: string }>(response);
          if (!response.ok || !data.text) throw new Error(data.error || t.error);
          const append = (current: string) => current.trim() ? `${current.trim()}\n${data.text}` : data.text || current;
          if (field === "facts") setFacts(append);
          else setRequests(append);
          setDraftNotice({ kind: "success", message: tr(language, "تم تحويل التسجيل إلى نص. راجعه وعدّله قبل المتابعة.") });
        } catch (error) {
          setDraftNotice({ kind: "error", message: interfaceError(error, language, t.error) });
        } finally {
          setTranscribingField(null);
        }
      };
      recorder.start(1_000);
      setRecordingField(field);
      // Eight minutes at the configured mono bitrate remains comfortably below the upload limit.
      autoStopRef.current = setTimeout(stopRecording, 8 * 60_000);
    } catch {
      audioStreamRef.current?.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
      setRecordingField(null);
      setDraftNotice({ kind: "error", message: ui.micDenied });
    }
  }

  async function applyDraftTool(action: "improve_facts" | "extract_requests" | "improve_requests") {
    const sourceText = action === "improve_requests" ? requests : facts;
    if (sourceText.trim().length < 10) {
      setDraftNotice({ kind: "error", message: ui.shortText });
      return;
    }
    setDraftNotice(null);
    setDraftSources([]);
    setDraftAction(action);
    try {
      const response = await memoFetch("/api/legal/draft-tools", token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          language,
          text: sourceText,
          context: action === "improve_requests" ? facts : requests,
          caseType: memoData.caseType || "",
        }),
      });
      const data = await readServiceJson<{ text?: string; error?: string; sourceCount?: number; sources?: Array<{ title: string; reference: string }> }>(response);
      if (!response.ok || !data.text) throw new Error(data.error || t.error);
      if (action === "improve_facts") setFacts(data.text);
      else setRequests(data.text);
      setDraftSources(data.sources || []);
      setDraftNotice({ kind: "success", message: data.sourceCount ? ui.sources(data.sourceCount) : ui.noSources });
    } catch (error) {
      setDraftNotice({ kind: "error", message: interfaceError(error, language, t.error) });
    } finally {
      setDraftAction(null);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (voiceEntryBusy || generationRequest.current) return;
    const stepData = Object.fromEntries(Array.from(new FormData(event.currentTarget).entries(), ([key, value]) => [key, String(value)]));
    const allParties = analysisParties
      .filter((party) => party.name.trim() || party.role.trim())
      .map((party) => `${party.name.trim()}${party.role.trim() ? ` — ${party.role.trim()}` : ""}`)
      .join("\n");
    // Analysis supplements data entered by the user. Empty values extracted
    // from a document must never erase required case details entered earlier.
    const analysisData = analysisStatus === "success"
      ? Object.fromEntries(Object.entries({ ...analysisFields, allParties, facts, requests }).filter(([, value]) => typeof value === "string" && value.trim().length > 0))
      : {};
    const nextData: Record<string, string> = { ...memoData, ...analysisData, ...stepData, ...(step === 1 ? { facts, requests } : {}) };
    for (const key of ["caseType", "court", "courtCircuit", "partyRole"]) if (nextData[key]) nextData[key] = canonicalLegalValue(nextData[key]);
    setMemoData(nextData);
    if (step < 3) {
      setDraftNotice(null);
      setStep(step + 1);
      return;
    }
    const requiredCaseFields: Array<[string, 0 | 1]> = [
      ["caseType", 0], ["court", 0], ["clientName", 0], ["otherParty", 0], ["partyRole", 0], ["facts", 1], ["requests", 1],
    ];
    const missing = requiredCaseFields.find(([field]) => !nextData[field]?.trim());
    if (missing) {
      setStatus("error");
      setMemoError(`${tr(language, "أكمل الحقل قبل التوليد")}: ${missing[0] === "caseType" ? t.caseType : missing[0] === "court" ? t.court : missing[0] === "clientName" ? t.clientName : missing[0] === "otherParty" ? t.otherParty : missing[0] === "partyRole" ? t.role : missing[0] === "facts" ? t.facts : t.requests}.`);
      setStep(missing[1]);
      return;
    }
    if (!memoApproved) { setStatus("error"); setMemoError(generationUi.required); return; }
    const controller = new AbortController();
    generationRequest.current = controller;
    setStatus("loading");
    setMemoError("");
    try {
      const data = await runMemoGeneration(async (signal) => {
      const response = await memoFetch("/api/legal/memo", token, {
        method: "POST", signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...nextData, interfaceLanguage: language, outputLanguage: "ar" }),
      });
      const data = await readServiceJson<{ memo?: string; document?: PleadingDocument; caseQuality?: {status:string;notices:string[]}; error?: string; analysis?: { sourceCount: number; lawCount: number; cassationCount: number; sources: Array<{ marker: string; title: string; reference: string; kind: "cassation" | "legislation"; officialSource: string; sourceUrl?: string; libraryUpdatedAt?: string | null }> } }>(response);
      if (!response.ok || !data.memo) throw new Error(data.error || t.error);
      return data;
      }, controller);
      if (!generationMounted.current || generationRequest.current !== controller) return;
      setMemo(data.memo!);
      setMemoDocument(data.document || null);
      setMemoQuality(data.caseQuality || null);
      setMemoAnalysis(data.analysis || null);
      setStatus("idle");
    } catch (error) {
      if (!generationMounted.current || generationRequest.current !== controller) return;
      setStatus("error");
      setMemoError(error instanceof MemoGenerationStopped ? (error.reason === "timeout" ? generationUi.timeout : generationUi.cancelled) : interfaceError(error, language, t.error));
    } finally {
      if (generationRequest.current === controller) generationRequest.current = null;
    }
  }

  if (memo) return <div className="memo-result" lang={language} dir={language === "en" ? "ltr" : "rtl"}><p role="note" className="form-notice">{memoApprovalNotice[language]}</p>{memoQuality && <div className="form-notice" role="status"><strong>{language === "ar" ? (memoQuality.status === "incomplete" ? "المذكرة غير مكتملة: توجد وقائع أو أسانيد تحتاج استكمالًا" : "اجتازت المسودة مراجعة الاتساق الآلية وتحتاج مراجعة قانونية") : language === "en" ? (memoQuality.status === "incomplete" ? "Incomplete draft: facts or legal sources need review" : "Draft passed automated consistency review; legal review is required") : (memoQuality.status === "incomplete" ? "مسودہ نامکمل ہے؛ حقائق یا قانونی ماخذ کی جانچ درکار ہے" : "مسودے کی خودکار مطابقت جانچ مکمل؛ قانونی جائزہ ضروری ہے")}</strong>{language === "ar" && <ul>{memoQuality.notices.map((notice,index)=><li key={index}>{notice}</li>)}</ul>}</div>}<div className="modal-icon"><FileCheck2 /></div><h2>{memoDocument ? interfaceLabel(memoDocument.title, language) : tr(language, "المذكرة القانونية")}</h2>{memoAnalysis && <div className="memo-analysis-summary"><strong><Sparkles size={18} /> {tr(language, "مصادر استشهدت بها المسودة")}</strong><span>{tr(language, "مراجع تشريعية مستشهد بها")}: {memoAnalysis.lawCount}</span><span>{tr(language, "استشهادات بمبادئ وأحكام تمييز")}: {memoAnalysis.cassationCount}</span><small>{tr(language, "لا يُدرج النظام مادة أو حكماً غير موجود في المكتبة الموثقة، وتبقى المراجعة النهائية للمجموعة.")}</small><ul>{memoAnalysis.sources.map(source => <li key={source.marker}><strong>{source.marker} — {source.title}</strong><span>{source.officialSource} · {source.reference}</span>{source.sourceUrl ? <a href={source.sourceUrl} target="_blank" rel="noopener noreferrer">{tr(language, "فتح المصدر الأصلي")}</a> : <small>{tr(language, "نص من المكتبة المرفوعة؛ لا يتوفر رابط عام للأصل.")}</small>}{source.libraryUpdatedAt && <small>{tr(language, "تحديث الفهرسة")}: {source.libraryUpdatedAt.slice(0, 10)} — {tr(language, "لا يثبت سريان النص.")}</small>}</li>)}</ul></div>}<>{memoDocument ? <PleadingPreview document={memoDocument} text={memo} language={language}/> : <pre lang="ar" dir="rtl">{memo}</pre>}</><div className="memo-result-tools" aria-label={tr(language, "أدوات المذكرة")}><button type="button" onClick={editGeneratedMemo}><Pencil size={18} />{tr(language, "تعديل")}</button><button type="button" onClick={archiveGeneratedMemo} disabled={archiving}><Archive size={18} />{archiving ? tr(language, "جارٍ الأرشفة") : tr(language, "أرشفة")}</button><button type="button" className="danger" onClick={deleteGeneratedMemo}><Trash2 size={18} />{tr(language, "حذف")}</button><button type="button" onClick={exportGeneratedMemo}><Download size={18} />{tr(language, "تصدير كملف")}</button><button type="button" onClick={() => void printGeneratedMemo()}><Printer size={18} />{tr(language, "طباعة")}</button></div>{resultNotice && <p role="status" className={`form-notice ${resultNotice.kind}`}>{resultNotice.message}</p>}</div>;
  return (
    <div className="memo-modal">
      <div className="memo-modal-title"><div className="modal-icon"><FileText /></div><span><h2>{t.memoModal}</h2><p><Languages size={15} />{t.arabicOnly}</p><small className="memo-guest-notice">{language === "ar" ? "وضع تجريبي: متاح مؤقتاً دون تسجيل دخول، ولا تُحفظ بياناتك في الأرشيف." : language === "en" ? "Pilot mode: temporarily available without sign-in; your data is not archived." : "آزمائشی موڈ: عارضی طور پر بغیر سائن اِن دستیاب ہے؛ آپ کا ڈیٹا محفوظ نہیں کیا جاتا۔"}</small></span></div>
      {memoData.conversationTranscript && <details className="memo-conversation-review" open>
        <summary>{language === "ar" ? "المحادثة وملخص القضية المنقولان من المساعد" : language === "en" ? "Conversation and case summary from the assistant" : "معاون سے منتقل گفتگو اور مقدمے کا خلاصہ"}</summary>
        <p>{language === "ar" ? "راجع الأسماء والأرقام والوقائع والطلبات أدناه. يتولى المساعد التصحيح اللغوي والبحث القانوني؛ كلام المساعد ليس مصدراً قانونياً." : language === "en" ? "Confirm names, numbers and case facts. The assistant corrects the language and researches legal sources; assistant messages are not legal authorities." : "گفتگو اور خلاصے کی تصحیح کریں۔ منظور شدہ حقائق اور مطالبات بنیاد ہیں؛ معاون کی بات قانونی ماخذ نہیں۔"}</p>
        <Field label={language === "ar" ? "ملخص ما فهمه المساعد" : language === "en" ? "Understood case summary" : "مقدمے کا خلاصہ"}><textarea rows={4} value={memoData.conversationSummary || ""} maxLength={6000} onChange={event => setMemoData(current => ({ ...current, conversationSummary: event.target.value }))} /></Field>
        <Field label={language === "ar" ? "تفريغ كلام الطرفين" : language === "en" ? "Both sides of the conversation" : "دونوں طرف کی گفتگو"}><textarea rows={7} value={memoData.conversationTranscript} onChange={event => setMemoData(current => ({ ...current, conversationTranscript: event.target.value }))} /></Field>
        {memoData.conversationTranscript.length > 30000 && <p role="alert">{tr(language, "التفريغ طويل. صدّر النسخة الكاملة ثم اختصر النص إلى 30,000 حرف قبل التوليد؛ لن يُحذف جزء منه تلقائياً.")}</p>}
      </details>}
      <div className="steps">{t.steps.map((item, index) => <div key={item} className={index === step ? "active" : index < step ? "done" : ""}><i>{index < step ? <Check size={14} /> : index + 1}</i><span>{item}</span></div>)}</div>
      <MemoVoiceInput language={language} disabled={status === "loading" || analysisStatus === "loading" || Boolean(recordingField || transcribingField || draftAction)} onBusy={setVoiceEntryBusy} request={(path, init) => memoFetch(path, token, init)} apply={patch => {
        const currentFields = memoFormRef.current ? Object.fromEntries(Array.from(new FormData(memoFormRef.current).entries(), ([key,value]) => [key,String(value)])) : {};
        setMemoData(current => ({ ...current, ...currentFields, facts, requests, ...patch }));
        if (patch.facts !== undefined) setFacts(patch.facts);
        if (patch.requests !== undefined) setRequests(patch.requests);
        setAnalysisFields(current => ({ ...current, ...Object.fromEntries(Object.entries(patch).filter(([key]) => key in current)) }));
        if (patch.allParties) setAnalysisParties([]);
        setVoiceFormVersion(version => version + 1);
      }} />
      <form ref={memoFormRef} key={voiceFormVersion} onSubmit={submit}>
        <div className="step-content">
          {step === 1 && (
            <div className="document-analysis-step">
              <label
                className={`document-dropzone${dragActive ? " is-dragging" : ""}${analysisStatus === "loading" ? " is-busy" : ""}`}
                onDragEnter={(event) => { event.preventDefault(); setDragActive(true); }}
                onDragOver={(event) => { event.preventDefault(); setDragActive(true); }}
                onDragLeave={(event) => { event.preventDefault(); setDragActive(false); }}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragActive(false);
                  addDocuments(Array.from(event.dataTransfer.files));
                }}
              >
                <input
                  id="memo-document-input"
                  ref={documentInputRef}
                  type="file"
                  multiple
                  disabled={analysisStatus === "loading"}
                  accept=".pdf,.docx,.txt,.rtf,.jpg,.jpeg,.png,.webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/rtf,image/jpeg,image/png,image/webp"
                  onChange={(event) => addDocuments(Array.from(event.target.files || []))}
                />
                <UploadCloud size={40} />
                <div><h3>{ui.uploadTitle}</h3><p>{ui.uploadText}</p></div>
                <span className="document-picker">{ui.chooseFiles}</span>
              </label>

              {documents.length > 0 && (
                <div className="document-list">
                  {documents.map((file, index) => (
                    <div key={`${file.name}-${file.size}-${file.lastModified}`}>
                      <FileText size={20} />
                      <span><b>{file.name}</b><small>{formatDocumentSize(file.size)}</small></span>
                      <button type="button" onClick={() => removeDocument(index)} aria-label={`${ui.removeFile}: ${file.name}`} disabled={analysisStatus === "loading"}><X size={17} /></button>
                    </div>
                  ))}
                </div>
              )}

              <div className="analysis-controls">
                <button type="button" className="button button-primary" onClick={analyzeDocuments} disabled={!documents.length || analysisStatus === "loading"}>
                  {analysisStatus === "loading" ? <><Sparkles size={17} />{ui.analyzing}</> : <><Search size={17} />{ui.analyze}</>}
                </button>
                <p><ShieldCheck size={16} />{ui.privacyUpload}</p>
              </div>

              {analysisNotice && <p className={`analysis-notice ${analysisStatus}`}><ShieldCheck size={17} />{analysisNotice}</p>}

              {analysisStatus === "success" && (
                <div className="analysis-editor">
                  <div className="analysis-editor-title"><Sparkles size={20} /><div><h3>{ui.analysisTitle}</h3><p>{ui.allPartiesHint}</p></div></div>
                  <div className="form-grid">
                    <Field label={t.caseType}><input value={interfaceLabel(analysisFields.caseType, language)} onChange={(event) => setAnalysisFields((current) => ({ ...current, caseType: event.target.value }))} /></Field>
                    <Field label={ui.caseNumber}><input value={analysisFields.caseNumber} onChange={(event) => setAnalysisFields((current) => ({ ...current, caseNumber: event.target.value }))} /></Field>
                    <Field label={t.court}><input value={interfaceLabel(analysisFields.court, language)} onChange={(event) => setAnalysisFields((current) => ({ ...current, court: event.target.value }))} /></Field>
                    <Field label={t.clientName}><input value={analysisFields.clientName} onChange={(event) => setAnalysisFields((current) => ({ ...current, clientName: event.target.value }))} /></Field>
                    <Field label={t.otherParty}><input value={analysisFields.otherParty} onChange={(event) => setAnalysisFields((current) => ({ ...current, otherParty: event.target.value }))} /></Field>
                    <Field label={t.role}><input value={interfaceLabel(analysisFields.partyRole, language)} onChange={(event) => setAnalysisFields((current) => ({ ...current, partyRole: event.target.value }))} /></Field>
                  </div>
                  <div className="party-editor">
                    <div className="party-editor-heading"><h4>{ui.parties}</h4><button type="button" onClick={() => setAnalysisParties((current) => [...current, { name: "", role: "" }])}><span>+</span>{ui.addParty}</button></div>
                    {analysisParties.length === 0 && <button type="button" className="empty-party-button" onClick={() => setAnalysisParties([{ name: "", role: "" }])}>+ {ui.addParty}</button>}
                    {analysisParties.map((party, index) => (
                      <div className="party-row" key={`party-${index}`}>
                        <input aria-label={ui.partyName} placeholder={ui.partyName} value={party.name} onChange={(event) => updateAnalysisParty(index, "name", event.target.value)} />
                        <input aria-label={ui.partyRole} placeholder={ui.partyRole} value={interfaceLabel(party.role, language)} onChange={(event) => updateAnalysisParty(index, "role", event.target.value)} />
                        <button type="button" onClick={() => setAnalysisParties((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`${ui.removeFile}: ${party.name || index + 1}`}><X size={17} /></button>
                      </div>
                    ))}
                  </div>
                  <div className="memo-textareas">
                    <Field label={t.facts}><textarea rows={7} value={facts} onChange={(event) => setFacts(event.target.value)} /></Field>
                    <Field label={t.requests}><textarea rows={5} value={requests} onChange={(event) => setRequests(event.target.value)} /></Field>
                    <Field label={t.issues}><textarea rows={4} value={analysisFields.legalIssues} onChange={(event) => setAnalysisFields((current) => ({ ...current, legalIssues: event.target.value }))} /></Field>
                  </div>
                  {analysisWarnings.length > 0 && <div className="analysis-warnings"><h4>{ui.analysisWarnings}</h4><ul>{analysisWarnings.map((warning, index) => <li key={`${warning}-${index}`}>{warning}</li>)}</ul></div>}
                </div>
              )}
            </div>
          )}
          {step === 0 && (
            <div className="form-grid">
              <Field label={t.caseType}><CustomComboBox name="caseType" ariaLabel={t.caseType} options={t.caseTypes} defaultValue={interfaceLabel(memoData.caseType || "", language)} required /></Field>
              <Field label={ui.caseNumber}><input name="caseNumber" defaultValue={memoData.caseNumber} /></Field>
              <Field label={t.court}><CustomComboBox name="court" ariaLabel={t.court} options={t.courts} defaultValue={interfaceLabel(memoData.court || "", language)} required /></Field>
              <Field label={language === "ar" ? "الدائرة (إن عُرفت)" : language === "en" ? "Court circuit (if known)" : "عدالتی شعبہ (اگر معلوم ہو)"}><input name="courtCircuit" defaultValue={memoData.courtCircuit} /></Field><Field label={t.clientName}><input name="clientName" defaultValue={memoData.clientName} required /></Field>
              <Field label={t.otherParty}><input name="otherParty" defaultValue={memoData.otherParty} required /></Field>
              <Field label={t.role}><CustomComboBox name="partyRole" ariaLabel={t.role} options={t.roles} defaultValue={interfaceLabel(memoData.partyRole || "", language)} required /></Field>
              <Field label={ui.allParties} wide><textarea name="allParties" rows={5} defaultValue={memoData.allParties} /><small className="field-hint">{ui.allPartiesHint}</small></Field>
            </div>
          )}
          {(step === 0 || step === 3) && <details className="pleading-fields">
            <summary>{language === "ar" ? "الصيغة المعتمدة وبيانات الصحيفة" : language === "en" ? "Approved form and pleading details" : "منظور شدہ قالب اور درخواست کی معلومات"}</summary>
            <p>{language === "ar" ? "يعتمد المحرك صحيفة الدعوى أو الاستئناف المحفوظة بحسب المرحلة والصفة. تُعبأ البيانات المتاحة من الوقائع، وتبقى مواعيد الإعلان والتوقيعات للمراجعة." : language === "en" ? "The engine uses the stored claim or appeal form according to the case stage and party role. Known facts fill the form; service dates and signatures remain for review." : "مقدمے کے مرحلے اور حیثیت کے مطابق محفوظ دعویٰ یا اپیل کا قالب استعمال ہوگا۔ دستیاب حقائق بھریں گے؛ تاریخیں اور دستخط جائزے کے لیے ہیں۔"}</p>
            <div className="form-grid"><Field label={language === "en" ? "Document format" : language === "ur" ? "دستاویز کا قالب" : "صيغة المستند"}><select name="documentKind" defaultValue={memoData.documentKind || "auto"}><option value="auto">{tr(language, "تلقائي بحسب القضية والصفة")}</option><option value="claim">{tr(language, "صحيفة دعوى")}</option><option value="appeal">{tr(language, "صحيفة استئناف")}</option><option value="memorandum">{tr(language, "مذكرة بدفاع")}</option></select></Field>
            {Object.entries(pleadingFields).map(([key,label])=><Field key={key} label={interfaceLabel(label, language)}><textarea name={key} rows={/Grounds|Requests|Operative/.test(key)?3:1} defaultValue={memoData[key] || analysisFields[key as keyof typeof pleadingFields] || ""} maxLength={5000}/></Field>)}</div>
          </details>}
          {step === 1 && (
            <div className="memo-textareas">
              <Field label={t.facts}>
                <div className="voice-input">
                  <textarea name="facts" rows={7} required value={facts} onChange={(event) => setFacts(event.target.value)} />
                  <button type="button" className={recordingField === "facts" ? "is-recording" : ""} onClick={() => startRecording("facts")} disabled={voiceEntryBusy || Boolean((recordingField && recordingField !== "facts") || transcribingField || draftAction)} aria-label={recordingField === "facts" ? ui.stop : ui.record} aria-pressed={recordingField === "facts"}><Mic size={18} /></button>
                </div>
                <div className="draft-tools-row">
                  <button type="button" onClick={() => applyDraftTool("improve_facts")} disabled={Boolean(draftAction || recordingField || transcribingField)}><Sparkles size={16} />{draftAction === "improve_facts" ? t.loading : ui.improve}</button>
                  <button type="button" onClick={() => applyDraftTool("extract_requests")} disabled={Boolean(draftAction || recordingField || transcribingField)}><FileCheck2 size={16} />{draftAction === "extract_requests" ? t.loading : ui.extract}</button>
                  <label className="document-attach-inline"><UploadCloud size={16} />{tr(language, "إرفاق مستندات")}<input className="document-attach-input" type="file" multiple disabled={analysisStatus === "loading"} accept=".pdf,.docx,.txt,.rtf,.jpg,.jpeg,.png,.webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/rtf,image/jpeg,image/png,image/webp" onChange={(event) => addDocuments(Array.from(event.target.files || []))} /></label>
                </div>
              </Field>
              <Field label={t.requests}>
                <div className="voice-input">
                  <textarea name="requests" rows={5} required value={requests} onChange={(event) => setRequests(event.target.value)} />
                  <button type="button" className={recordingField === "requests" ? "is-recording" : ""} onClick={() => startRecording("requests")} disabled={voiceEntryBusy || Boolean((recordingField && recordingField !== "requests") || transcribingField || draftAction)} aria-label={recordingField === "requests" ? ui.stop : ui.record} aria-pressed={recordingField === "requests"}><Mic size={18} /></button>
                </div>
                <div className="draft-tools-row">
                  <button type="button" onClick={() => applyDraftTool("improve_requests")} disabled={Boolean(draftAction || recordingField || transcribingField)}><Sparkles size={16} />{draftAction === "improve_requests" ? t.loading : ui.improve}</button>
                </div>
              </Field>
              {(recordingField || transcribingField) && <p className="voice-status"><Mic size={15} />{recordingField ? ui.recording : ui.transcribing}</p>}
              {draftNotice && <p className={`draft-notice ${draftNotice.kind}`}><ShieldCheck size={16} />{draftNotice.message}</p>}
              {draftSources.length > 0 && <details className="draft-sources"><summary>{ui.sourceList}</summary><ul>{draftSources.map((source, index) => <li key={`${source.title}-${source.reference}-${index}`}><b>{language === "ar" ? "م" : language === "ur" ? "حوالہ " : "Ref "}{index + 1}</b><span>{source.title}<small>{source.reference}</small></span></li>)}</ul></details>}
            </div>
          )}
          {step === 2 && <div className="research-box"><Search size={30} /><h3>{language === "ar" ? "مسار التحليل القانوني للمذكرة" : t.steps[2]}</h3><p>{language === "ar" ? "يحلّل المحرك الوقائع والطلبات، يصنّف المسائل القانونية، يطابقها مع القوانين والمواد الكويتية، ثم يبحث عن مبادئ وأحكام التمييز المتصلة بذات المسألة والسبب قبل بناء الدفوع بصياغة المحاكم الكويتية." : language === "en" ? "The engine classifies the issues, matches verified Kuwaiti laws and provisions, then retrieves materially related Court of Cassation principles before drafting each argument." : "انجن قانونی مسائل کی درجہ بندی کرتا ہے، مصدقہ کویتی قوانین اور متعلقہ امتیازی عدالتی اصولوں سے مطابقت کرتا ہے، پھر ہر دلیل تیار کرتا ہے۔"}</p><div className="analysis-pipeline"><span>1. {tr(language, "تحليل الوقائع")}</span><span>2. {tr(language, "تحديد المواد")}</span><span>3. {tr(language, "مطابقة أحكام التمييز")}</span><span>4. {tr(language, "بناء الدفوع والطلبات")}</span></div><Field label={language === "ar" ? "ملاحظات قانونية إضافية (اختيارية)" : language === "en" ? "Additional legal notes (optional)" : "اضافی قانونی نوٹس (اختیاری)"}><textarea name="legalIssues" rows={6} defaultValue={memoData.legalIssues} placeholder={tr(language, "اتركها فارغة إن لم تكن لديك ملاحظة؛ سيستنتج النظام المسائل القانونية تلقائياً.")} /></Field><div><ShieldCheck size={18} />{language === "ar" ? "لن تُدرج مادة أو حكم تمييز إلا من مصدر موثق، وسيصرّح النظام عند عدم العثور على تطابق." : language === "en" ? "No law or judgment is included unless it is found in the verified legal database." : "کوئی قانون یا فیصلہ شامل نہیں ہوگا جب تک وہ مصدقہ قانونی ڈیٹابیس میں نہ ہو۔"}</div></div>}
          {step === 3 && <div className="review-box"><FileCheck2 size={34} /><h3>{t.review}</h3><p>{t.arabicOnly}</p><p className="template-badge">{tr(language, "الصيغة")}: {tr(language, selectPleadingKind(memoData) === "appeal" ? "صحيفة استئناف" : selectPleadingKind(memoData) === "claim" ? "صحيفة دعوى" : "مذكرة بدفاع")}</p><p role="note" className="form-notice">{memoApprovalNotice[language]}</p>
            {memoData.conversationTranscript && <dl className="memo-handoff-details">{[[t.caseType, "caseType"], [t.court, "court"], [tr(language, "الدائرة"), "courtCircuit"], [tr(language, "مرحلة القضية"), "caseStage"], [t.clientName, "clientName"], [t.role, "partyRole"], [t.otherParty, "otherParty"], [ui.allParties, "allParties"], [t.facts, "facts"], [t.requests, "requests"]].map(([label, key]) => <div key={key}><dt>{label}</dt><dd>{["caseType", "court", "partyRole", "caseStage"].includes(key) ? interfaceLabel(memoData[key] || "", language) : memoData[key]}</dd></div>)}</dl>}
            <div><ShieldCheck size={18} />{t.privacy}</div><div><BookOpen size={18} />{t.libraryText}</div>
            <label className="memo-generation-approval"><input type="checkbox" checked={memoApproved} onChange={event => setMemoApproved(event.target.checked)} disabled={status === "loading"} />{generationUi.approval}</label></div>}
        </div>
        <div className="memo-actions">{step > 0 ? <button type="button" className="button button-outline" disabled={status === "loading"} onClick={() => { setMemoApproved(false); setStep(step - 1); }}>{t.previous}</button> : <span />}<button className="button button-primary" disabled={voiceEntryBusy || status === "loading" || analysisStatus === "loading" || Boolean(step === 1 && documents.length && analysisStatus !== "success") || Boolean(recordingField || transcribingField || draftAction)}>{status === "loading" ? t.loading : step === 3 ? t.generate : step === 1 && documents.length === 0 ? ui.continueManual : t.next}<ArrowLeft size={17} /></button></div>
        {status === "loading" && <div className="memo-generation-pending"><p role="status" aria-live="polite">{generationUi.pending}</p><span>{generationSeconds} {generationUi.seconds}</span><small>{generationUi.limit}</small><button type="button" className="button button-outline" onClick={() => generationRequest.current?.abort()}>{generationUi.cancel}</button></div>}
        {status === "error" && <p className="form-notice error">{memoError || t.error}</p>}
      </form>
    </div>
  );
}

function FormNotice({ status, t }: { status: string; t: SiteCopy }) {
  if (status !== "success" && status !== "error") return null;
  return <p className={`form-notice ${status}`}>{status === "success" ? t.sent : t.error}</p>;
}
