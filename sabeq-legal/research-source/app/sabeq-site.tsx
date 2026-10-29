"use client";
import { AssistantMemoAction } from "./assistant-memo-action";

import type { SitePublicSettings } from "@/lib/site-controls";

import { ASSISTANT_MESSAGE_LIMIT, assistantInputCopy, validateAssistantInput } from "@/lib/assistant-input";
import { runMemoGeneration, MemoGenerationStopped, memoGenerationCopy } from "@/lib/memo-generation";
import { newPaymentAttempt, loadPaymentAttempt, rememberPaymentAttempt, clearPaymentAttempt, paymentCopy, type SadadCheckout } from "@/lib/sadad-client";
import { readSSE } from "@/lib/intake-stream";
import { cleanIntakeContext } from "@/lib/intake-context";
import type { AnalysisStage } from "@/lib/intake-analysis";
import IntakeAnalysisView, { IntakeStages, type ConnectedIntakeState } from "./intake-analysis-view";
import VoiceWaveform from "./voice-waveform";
import { PrivacyLink } from "./privacy-notice";
import GroupPostsStrip from "./group-posts-strip";
import MemoVoiceInput from "./memo-voice-input";
import { memoStoryText } from "@/lib/memo-dictation";
import MemoPaymentDialog from "./memo-payment-dialog";
import ProceduralPositionView from "./procedural-position-view";
import { inferProceduralPosition } from "@/lib/procedural-position";
import { recogniseMemoProcedure, initialMemoStep, nextMemoStep } from "@/lib/memo-journey";
import PleadingPreview from "./pleading-preview";
import { pleadingFields, renderPleadingHtml, renderArabicMemoHtml, selectPleadingKind, type PleadingDocument } from "@/lib/pleading-document";
import { exportPleadingDocx } from "@/lib/pleading-docx";
import VoiceCountdown from "./voice-countdown";
import { LegalVoiceConversation, type VoiceAnalysisResult } from "@/lib/legal-voice-client";
import { DEFAULT_LEGAL_VOICE, resolveLegalVoice, LEGAL_VOICES, isLegalVoice, voiceCopy, type LegalVoice, type VoicePhase } from "@/lib/legal-voice";
import { memoApprovalNotice, conversationTranscript, importMemoDraft, type MemoPrefill } from "@/lib/memo-handoff";

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
import { startVisitorAnalytics } from "@/lib/visitor-analytics";
import { apiUrl, assetUrl } from "@/lib/runtime-urls";
import { copy, Language, mediaVideos as defaultMediaVideos, SiteCopy, team as defaultTeam } from "./site-content";
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
  throw new Error(path.startsWith("/api/payments/") ? "تعذر الاتصال بخدمة الدفع. طلبك محفوظ؛ أعد التحقق من نفس الطلب دون دفع جديد." : "تعذر الاتصال بخدمة سابق. بقيت بياناتك محفوظة؛ أعد المحاولة بعد لحظات.");
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
  useEffect(() => setText(defaultValue || ""), [defaultValue]);
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
  useEffect(() => startVisitorAnalytics(), []);
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
  const [memoVisited, setMemoVisited] = useState(false);
  const [siteSettings, setSiteSettings] = useState<SitePublicSettings | null>(null);
  const t = siteSettings?.copy[language] || copy[language];
  const team = siteSettings?.team || defaultTeam;
  const mediaVideos = siteSettings?.mediaVideos || defaultMediaVideos;
  const contact = siteSettings?.contact || {phone1:"22400420",phone2:"22020188",whatsapp:"96550668449",email:"info@sabeq.legal",mapUrl:"https://maps.app.goo.gl/cvPGfK3hvwaV5bnH8",facebook:"https://www.facebook.com/people/Sabeq-Law/pfbid0JoEEKQtwxea1k2NPuyap9VbgTcC2i7VXpaUGVyiz6gkdKHyHGuRzYGGZkMVnuFa6l/",x:"https://x.com/sabik_legal?s=21",instagram:"https://www.instagram.com/sabik_legal",linkedin:"https://www.linkedin.com/in/khalifa-alkhalifa/"};
  const branding = siteSettings?.branding || {logo:"/images/brand/sabeq-logo.png",heroDesktop:"/images/brand/sabeq-hero-kuwait.jpg",heroMobile:"/images/brand/sabeq-hero-kuwait-mobile.jpg",avatar:"/images/sabeq-assistant-avatar.jpg"};
  useEffect(() => {
    const controller = new AbortController();
    fetch(apiUrl("/api/site-settings"), {cache:"no-store",signal:controller.signal}).then(async response => {
      if (!response.ok) return;
      const settings = await response.json() as SitePublicSettings;
      if (settings.copy?.ar && Array.isArray(settings.team) && Array.isArray(settings.mediaVideos) && Array.isArray(settings.posts) && settings.contact && settings.branding) setSiteSettings(settings);
    }).catch(()=>{});
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!siteSettings) return;
    document.documentElement.style.setProperty("--sabeq-hero-desktop", `url("${assetUrl(siteSettings.branding.heroDesktop)}")`);
    document.documentElement.style.setProperty("--sabeq-hero-mobile", `url("${assetUrl(siteSettings.branding.heroMobile)}")`);
  }, [siteSettings]);
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
    window.dispatchEvent(new CustomEvent("sabeq-analytics-section", { detail: id }));
    setMobileMenu(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "auto", block: "start" });
  }

  function showModal(name: ModalName) {
    window.dispatchEvent(new CustomEvent("sabeq-analytics-section", { detail: name }));
    setFormStatus("idle");
    if (name === "memo") setMemoVisited(true);
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
    setAssistantSession(null); setAssistantMemoPrefill(null); setMemoVisited(false);
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
    setAssistantSession(null); setAssistantMemoPrefill(null); setMemoVisited(false); setModal(null);
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
              <Image src={assetUrl(branding.logo)} alt="" width={74} height={74} priority unoptimized />
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
              <button className="menu-toggle" onClick={() => setMobileMenu(true)} aria-label={language === "ar" ? "فتح القائمة" : language === "en" ? "Open menu" : "مینو کھولیں"} aria-expanded={mobileMenu} aria-controls="mobile-navigation"><Menu /></button>
            </div>
          </div>
          <nav className="header-nav" aria-label={language === "ar" ? "القائمة الرئيسية" : language === "en" ? "Primary navigation" : "مرکزی مینو"}>
            {t.nav.map((item, index) => <button key={item} onClick={() => scrollTo(sectionIds[index])}>{item}</button>)}
          </nav>
        </div>
      </header>

      {mobileMenu && (
        <div className="nav-dropdown" id="mobile-navigation" role="dialog" aria-label={language === "ar" ? "القائمة" : language === "en" ? "Menu" : "مینو"}>
          <div className="nav-dropdown-head"><strong>{t.brand}</strong><button className="icon-button" onClick={() => setMobileMenu(false)} aria-label={language === "ar" ? "إغلاق القائمة" : language === "en" ? "Close menu" : "مینو بند کریں"}><X /></button></div>
          <nav>{t.nav.map((item, index) => <button key={item} onClick={() => scrollTo(sectionIds[index])}>{item}</button>)}</nav>
          {authUser && <div className="drawer-account"><i><UserRound size={20} /></i><span><strong>{authUser.name}</strong><small dir="ltr">{authUser.email}</small></span><button type="button" onClick={signOut} aria-label={language === "ar" ? "تسجيل الخروج" : language === "en" ? "Sign out" : "سائن آؤٹ"}><LogOut size={18} /></button></div>}
        </div>
      )}

      <main id="main-content">
        <section className="hero" id="home">
          <div className="hero-brand-block" dir={t.dir}>
            <h1 className="hero-brand-title">{t.brand}</h1>
            <p className="hero-brand-tagline">
              <span>{language === "ar" ? "خبرة قانونية راسخة" : language === "en" ? "Established legal experience" : "مستحکم قانونی تجربہ"}</span>
              <span>{language === "ar" ? "تلتقي بالتقنية الحديثة" : language === "en" ? "meets modern technology" : "جدید ٹیکنالوجی کے ساتھ"}</span>
            </p>
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
              {t.services.map(([title, text], index) => { const Icon = serviceIcons[index]; return <article className="service-card" key={title}><i><Icon size={27} /></i><span aria-hidden="true">0{index + 1}</span><h3>{title}</h3><p>{text}</p><button onClick={() => showModal("booking")} aria-label={`${t.book}: ${title}`}><DirectionArrow size={19} /></button></article>; })}
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
            <GroupPostsStrip language={language} posts={siteSettings?.posts} />
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
                      <a href={`tel:${contact.phone1.length===8?"+965":"+"}${contact.phone1}`} aria-label={`${t.phone} ${contact.phone1}`}><PhoneCall size={15} />{contact.phone1}</a>
                      <a href={`tel:${contact.phone2.length===8?"+965":"+"}${contact.phone2}`} aria-label={`${t.phone} ${contact.phone2}`}><PhoneCall size={15} />{contact.phone2}</a>
                    </span>
                  </span>
                </div>
                <a className="contact-card contact-card-action contact-card-whatsapp" href={`https://wa.me/${contact.whatsapp}`} target="_blank" rel="noreferrer" aria-label={`${t.whatsapp} ${contact.whatsapp}`}>
                  <i><BrandIcon name="whatsapp" /></i><span><small>{t.whatsapp}</small><strong dir="ltr">{contact.whatsapp}</strong></span><DirectionArrow className="contact-card-arrow" size={18} />
                </a>
                <a className="contact-card contact-card-action contact-card-email" href={`mailto:${contact.email}`} aria-label={`${t.email} ${contact.email}`}>
                  <i><Mail size={22} /></i><span><small>{t.email}</small><strong dir="ltr">{contact.email}</strong></span><DirectionArrow className="contact-card-arrow" size={18} />
                </a>
                <a className="contact-card contact-card-action contact-card-address" href={contact.mapUrl} target="_blank" rel="noreferrer" aria-label={t.map}>
                  <i><MapPin size={22} /></i><span><small>{t.address}</small><strong>{t.addressText}</strong><span className="map-link">{t.map}<DirectionArrow size={15} /></span></span>
                </a>
                <div className="contact-card contact-card-hours"><i><Clock3 size={22} /></i><span><small>{t.hours}</small><strong>{t.hoursText}</strong></span></div>
              </div>
              <div className="socials" aria-label={tr(language, "وسائل التواصل الاجتماعي")}>
                <a className="social-facebook" href={contact.facebook} target="_blank" rel="noreferrer" aria-label="Facebook" title="Facebook"><BrandIcon name="facebook" /></a>
                <a className="social-x" href={contact.x} target="_blank" rel="noreferrer" aria-label="X" title="X"><BrandIcon name="x" /></a>
                <a className="social-instagram" href={contact.instagram} target="_blank" rel="noreferrer" aria-label="Instagram" title="Instagram"><BrandIcon name="instagram" /></a>
                <a className="social-linkedin" href={contact.linkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn" title="LinkedIn"><BrandIcon name="linkedin" /></a>
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
          <div className="footer-brand"><Image src={assetUrl(branding.logo)} alt="" width={92} height={92} unoptimized /><span><strong>{t.brand}</strong><small>SABEQ LEGAL GROUP</small><p>{t.footer}</p></span></div>
          <div><h3>{t.quick}</h3>{t.nav.map((item, index) => <button key={item} onClick={() => scrollTo(sectionIds[index])}>{item}</button>)}</div>
          <div className="footer-contact-list"><h3>{t.contactTitle}</h3><a href={`tel:${contact.phone1.length===8?"+965":"+"}${contact.phone1}`}><PhoneCall size={16} /><span dir="ltr">{contact.phone1}</span></a><a href={`tel:${contact.phone2.length===8?"+965":"+"}${contact.phone2}`}><PhoneCall size={16} /><span dir="ltr">{contact.phone2}</span></a><a href={`mailto:${contact.email}`}><Mail size={16} /><span dir="ltr">{contact.email}</span></a><a href={`https://wa.me/${contact.whatsapp}`} target="_blank" rel="noreferrer"><BrandIcon name="whatsapp" /><span dir="ltr">{contact.whatsapp}</span></a><a href={contact.mapUrl} target="_blank" rel="noreferrer"><MapPin size={16} /><span>{t.map}</span></a></div>
        </div>
        <div className="container footer-bottom"><span>© {year} {t.brand}. {t.rights}.</span><PrivacyLink language={language} /><a href="https://wa.me/96551231313" target="_blank" rel="noreferrer">{tr(language, "تصميم وتطوير")} <span className="digizone-name">DigiZone</span></a></div>
      </footer>

      {modal && modal !== "memo" && <ModalShell language={language} onClose={() => { if (modal === "auth") setPendingService(null); setModal(null); }} media={modal === "media"}>
        {modal === "auth" && <AuthGate language={language} service={pendingService} onAuthenticated={authenticated} />}
        {modal === "booking" && <Booking t={t} language={language} status={formStatus} submit={submitForm} />}
        {modal === "assistant" && <>{memoVisited && <div className="journey-switch"><button type="button" className="button button-outline" onClick={() => showModal("memo")}>{language === "ar" ? "العودة إلى المذكرة" : language === "en" ? "Back to the memo" : "یادداشت پر واپس"}</button></div>}<Assistant t={t} language={language} token={authToken} initialSession={assistantSession} onSession={setAssistantSession} openBooking={() => showModal("booking")} startMemo={(prefill) => { setAssistantMemoPrefill(prefill); setMemoVisited(true); setModal("memo"); }} /></>}
        {modal === "library" && <Library t={t} language={language} token={authToken} />}
        {modal === "media" && <MediaViewer video={mediaVideos[selectedVideo]} language={language} />}
      </ModalShell>}
      {(memoVisited || modal === "memo") && <ModalShell language={language} onClose={() => setModal(null)} large active={modal === "memo"}><MemoWizard t={t} language={language} token={authToken} active={modal === "memo"} initialData={assistantMemoPrefill} assistantSession={assistantSession} openAssistant={(context) => { if (!assistantSession) setAssistantSession({ question: context, messages: [], intake: null }); setModal("assistant"); }} /></ModalShell>}

      <div className="floating">
        <button type="button" className="assistant-avatar-button" onClick={() => showModal("assistant")} aria-label={t.assistant} aria-haspopup="dialog"><span className="assistant-portrait"><img src={assetUrl(branding.avatar)} alt="" width={64} height={64} decoding="async" /></span></button>
        <button type="button" className="memo-system-button" dir={t.dir} onClick={() => showModal("memo")} aria-haspopup="dialog" aria-label={language === "ar" ? "اضغط هنا للدخول على نظام كتابة المذكرات" : language === "en" ? "Click here to enter the memorandum writing system" : "قانونی یادداشت لکھنے کے نظام میں داخل ہونے کے لیے یہاں کلک کریں"}>
          <span className="memo-entry-caption">{language === "ar" ? "اضغط هنا للدخول على" : language === "en" ? "Click here to enter the" : "یہاں کلک کریں"}</span>
          <strong className="memo-entry-title">{language === "ar" ? "نظام كتابة المذكرات" : language === "en" ? "Memorandum writing system" : "قانونی یادداشت لکھنے کا نظام"}</strong>
        </button>
      </div>
      <a className="floating-whatsapp" href={`https://wa.me/${contact.whatsapp}`} target="_blank" rel="noreferrer" aria-label={t.whatsapp}><BrandIcon name="whatsapp" /></a>
    </div>
  );
}

function SectionHeading({ kicker, title, text, light = false, titleFirst = false }: { kicker: string; title: string; text?: string; light?: boolean; titleFirst?: boolean }) {
  const kickerNode = <p className={`eyebrow${titleFirst ? " eyebrow-below-title" : ""}`}>{kicker}</p>;
  return <div className={`section-heading${light ? " section-heading-light" : ""}`}>{titleFirst ? <><h2>{title}</h2>{kickerNode}</> : <>{kickerNode}<h2>{title}</h2></>}{text && <p>{text}</p>}</div>;
}

function MediaViewer({ video, language }: { video: {src:string;poster:string;title:string}; language: Language }) {
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

function ModalShell({ children, language, onClose, large = false, media = false, active = true }: { children: ReactNode; language: Language; onClose: () => void; large?: boolean; media?: boolean; active?: boolean }) {
  return <div className="modal-backdrop" hidden={!active} onMouseDown={onClose}><div className={`modal${large ? " modal-large" : ""}${media ? " modal-media" : ""}`} role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><button className="icon-button modal-close" onClick={onClose} aria-label={tr(language, "إغلاق")}><X /></button>{children}</div></div>;
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
  const intro = language === "ar" ? "السلام عليكم، أنا سابق مساعدك القانوني. سأرتب معلومات قضيتك خطوة بخطوة. ما الذي حدث بينك وبين الطرف الآخر؟" : language === "en" ? "Welcome, I’m Sabeq, your legal assistant. I will help you organise the case details step by step. What happened between you and the other party?" : "السلام علیکم، میں سابق، آپ کا قانونی معاون ہوں۔ اپنا مقدمہ بتائیں؛ میں حقائق اور مطالبات واضح کرنے میں مرحلہ وار مدد کروں گا۔";
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
  return <div className="modal-content legal-intake"><div className="assistant-opening-identity"><span className="assistant-portrait assistant-header-portrait"><img src={assetUrl("/images/sabeq-assistant-avatar.jpg")} alt="" width={84} height={84} decoding="async" /></span><h2>{t.assistant}</h2></div>
    <div className="intake-progress"><span><b>{intake?.progress || 0}%</b>{` ${tr(language, "اكتمال فهم القضية")}`}</span><i><em style={{ width: `${intake?.progress || 0}%` }} /></i></div>
    <div className="conversation-toolbar" aria-label={tr(language, "أدوات المحادثة")}><button type="button" onClick={newConversation} title={voiceUi.newChat}><Trash2 size={18} /><span>{voiceUi.newChat}</span></button><button type="button" onClick={exportConversation} disabled={!messages.length} title={tr(language, "تصدير المحادثة")}><Download size={18} /><span>{tr(language, "تصدير")}</span></button><button type="button" onClick={shareConversation} disabled={!messages.length} title={tr(language, "إرسال أو مشاركة المحادثة")}><Share2 size={18} /><span>{tr(language, "إرسال")}</span></button></div>

    <AssistantMemoAction language={language} intake={intake} messages={messages} busy={loading || voiceActive} onContinue={data => { stopSpeaking(); startMemo(data); }} />
    <div className="intake-chat"><div className="chat-welcome"><Sparkles size={17} />{intro}</div>{messages.map((item, index) => <div key={`${item.role}-${index}`} className={`intake-message ${item.role}`}><b><span>{item.role === "user" ? tr(language, "أنت") : t.assistant}</span><span className="message-tools">{item.role === "user" && <button type="button" className="message-tool" onClick={() => editMessage(index)} aria-label={tr(language, "تعديل الرسالة")} title={tr(language, "تعديل")}><Pencil size={17} /></button>}<button type="button" className="message-tool danger" onClick={() => deleteMessage(index)} aria-label={tr(language, "حذف الرسالة")} title={tr(language, "حذف")}><Trash2 size={17} /></button></span></b><p>{item.content}</p></div>)}{(loading || voiceActive) && streamedAnswer && <div className="intake-message assistant" aria-live="polite"><b>{t.assistant}</b><p>{streamedAnswer}</p></div>}{loading && !streamedAnswer && <div className="intake-thinking"><Sparkles size={16} />{tr(language, "أحلل المعلومات وأحدد السؤال التالي…")}</div>}</div>
    {intake && <div className="intake-dashboard">
      <div className="intake-classification"><span><small>{tr(language, "نوع القضية")}</small><b>{interfaceLabel(intake.caseType, language) || tr(language, "قيد التحليل")}</b></span><span><small>{tr(language, "المرحلة")}</small><b>{interfaceLabel(intake.caseStage, language) || tr(language, "غير محددة")}</b></span><span><small>{tr(language, "المحكمة المبدئية")}</small><b>{[intake.court, intake.courtCircuit].filter(Boolean).map(value => interfaceLabel(value, language)).join(" - ") || tr(language, "تحتاج معلومات إضافية")}</b></span><span><small>{tr(language, "درجة الثقة")}</small><b>{intake.jurisdictionConfidence === "high" ? tr(language, "مرتفعة") : intake.jurisdictionConfidence === "medium" ? tr(language, "متوسطة") : tr(language, "منخفضة")}</b></span></div>
      {intake.jurisdictionReason && <p className="jurisdiction-note"><Landmark size={17} />{intake.jurisdictionReason}</p>}
      <p className="form-notice">{language === "ar" ? "راجع وقائع قضيتك وأسماء الأطراف فقط. البحث عن القوانين والمواد وأحكام التمييز ومراجعتها من مهام المساعد والمجموعة، ولا يلزمك إرفاقها." : language === "en" ? "Review your case facts and names. The assistant and legal team research and verify legislation and precedents; you do not need to attach them." : "اپنے مقدمے کے حقائق اور نام دیکھیں۔ قانونی دفعات اور نظائر کی تحقیق معاون اور قانونی ٹیم کریں گے؛ آپ کو انہیں منسلک کرنے کی ضرورت نہیں۔"}</p>
      {intake.missingInformation.length > 0 && <details open><summary>{tr(language, "وقائع تحتاج توضيحاً منك")}</summary><ul>{intake.missingInformation.map((item) => <li key={item}>{item}</li>)}</ul></details>}
      {intake.documentsNeeded.length > 0 && <details><summary>{tr(language, "مستندات تخص وقائع قضيتك")}</summary><ul>{intake.documentsNeeded.map((item) => <li key={item}>{item}</li>)}</ul></details>}
      <IntakeAnalysisView state={intake} language={language} />
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

function MemoWizard({ t, language, token, initialData = null, assistantSession, active, openAssistant }: { t: SiteCopy; language: Language; token: string; initialData?: MemoPrefill | null; assistantSession: AssistantSession | null; active: boolean; openAssistant: (context: string) => void }) {
  const [paymentPolicy, setPaymentPolicy] = useState<{ required: boolean; publicCheckoutEnabled: boolean; priceFils: number; ready: boolean; environment: string } | null>(null);
  const [checkout, setCheckout] = useState<SadadCheckout | null>(null);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const automaticProcedure = useRef<Record<string, string>>({});
  const appliedHandoff = useRef(initialData);
  const paymentAttempt = useRef<ReturnType<typeof newPaymentAttempt> | null>(null);
  const payUi = paymentCopy[language];
  useEffect(() => {
    const controller = new AbortController();
    memoFetch("/api/payments/sadad", token, { signal: controller.signal }).then(async response => {
      if (response.ok) setPaymentPolicy(await response.json());
    }).catch(() => undefined);
    return () => controller.abort();
  }, [token]);
  const [openingData] = useState(() => importMemoDraft(initialData || {}, assistantSession?.intake, assistantSession?.messages));
  const [memoData, setMemoData] = useState<Record<string, string>>(openingData);
  const importedSession = useRef(assistantSession);
  const fromAssistant = Boolean(memoData.conversationTranscript?.trim());
  const [step, setStep] = useState(() => initialMemoStep(fromAssistant));
  const assistantReview = fromAssistant && step === 1;
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [memoError, setMemoError] = useState("");
  const [memoApproved, setMemoApproved] = useState(false);
  const [generationSeconds, setGenerationSeconds] = useState(0);
  const generationRequest = useRef<AbortController | null>(null);
  const storyRequest = useRef<AbortController | null>(null);
  const generationMounted = useRef(true);
  const generationUi = memoGenerationCopy(language);
  useEffect(() => { generationMounted.current = true; return () => { generationMounted.current = false; generationRequest.current?.abort(); storyRequest.current?.abort(); }; }, []);
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
  const [storyBusy, setStoryBusy] = useState(false);
  const [voiceFormVersion, setVoiceFormVersion] = useState(0);
  const memoFormRef = useRef<HTMLFormElement | null>(null);
  useEffect(() => { memoFormRef.current?.closest(".modal")?.scrollTo({ top: 0 }); }, [step]);
  const [memoAnalysis, setMemoAnalysis] = useState<{ sourceCount: number; lawCount: number; cassationCount: number; sources: Array<{ marker: string; title: string; reference: string; kind: "cassation" | "legislation"; officialSource: string; sourceUrl?: string; libraryUpdatedAt?: string | null }> } | null>(null);
  const [facts, setFacts] = useState(openingData.facts || "");
  const [requests, setRequests] = useState(openingData.requests || "");
  const lastUnderstoodStory = useRef(openingData.facts && openingData.requests ? memoStoryText(openingData.facts, openingData.requests) : "");
  const recognisedPosition = useMemo(() => inferProceduralPosition(`${facts}\n${requests}`, memoData.clientName || "", memoData.otherParty || ""), [facts, requests, memoData.clientName, memoData.otherParty, initialData]);
  const [documents, setDocuments] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [analysisNotice, setAnalysisNotice] = useState("");
  const [analysisFields, setAnalysisFields] = useState<AnalysisFields>(emptyAnalysisFields);
  const [analysisParties, setAnalysisParties] = useState<AnalysisParty[]>([]);
  const lastAppliedAnalysis = useRef<{ fields: AnalysisFields; parties: AnalysisParty[] } | null>(null);
  const [analysisWarnings, setAnalysisWarnings] = useState<string[]>([]);
  const documentInputRef = useRef<HTMLInputElement | null>(null);
  const journeySteps = language === "ar" ? ["الوقائع والمستندات", "الصفة وبيانات القضية", "المراجعة والدفع"] : language === "en" ? ["Facts and documents", "Role and case details", "Review and payment"] : ["حقائق اور دستاویزات", "حیثیت اور مقدمے کی تفصیل", "جائزہ اور ادائیگی"];
  function captureDraft(): Record<string, string> {
    const visible = memoFormRef.current ? Object.fromEntries(Array.from(new FormData(memoFormRef.current).entries()).filter((entry): entry is [string, string] => typeof entry[1] === "string")) : {};
    const next = { ...memoData, ...visible, facts, requests };
    setMemoData(next);
    return next;
  }
  useEffect(() => {
    if (!initialData || appliedHandoff.current === initialData) return;
    appliedHandoff.current = initialData;
    importedSession.current = assistantSession;
    if (paymentAttempt.current || checkout || memo) {
      setStatus("error"); setMemoError(payUi.changed); return;
    }
    const story = memoStoryText(initialData.facts, initialData.requests);
    setMemoData(current => ({ ...current, ...initialData, caseStory: story }));
    lastUnderstoodStory.current = initialData.facts && initialData.requests ? story : "";
    setFacts(initialData.facts || ""); setRequests(initialData.requests || "");
    setMemoApproved(false); setVoiceFormVersion(version => version + 1);
    automaticProcedure.current = {};
    setStep(initialMemoStep(Boolean(initialData.conversationTranscript?.trim())));
  }, [initialData, checkout, memo, payUi.changed]);
  useEffect(() => {
    if (!active || !assistantSession || importedSession.current === assistantSession || paymentAttempt.current || checkout || memo) return;
    importedSession.current = assistantSession;
    const next = importMemoDraft(captureDraft(), assistantSession.intake, assistantSession.messages);
    setMemoData(next); setFacts(next.facts || ""); setRequests(next.requests || "");
    if (!next.caseStory && next.facts && next.requests) lastUnderstoodStory.current = memoStoryText(next.facts, next.requests);
    setMemoApproved(false); setVoiceFormVersion(version => version + 1);
    if (next.conversationTranscript?.trim()) setStep(initialMemoStep(true));
  }, [active, assistantSession, checkout, memo]);
  useEffect(() => {
    if (active) return;
    setPaymentOpen(false);
    storyRequest.current?.abort();
  }, [active]);
  useEffect(() => {
    const saved = loadPaymentAttempt();
    if (!saved) return;
    paymentAttempt.current = saved;
    const controller = new AbortController();
    (async () => {
      const response = await memoFetch(`/api/payments/sadad?id=${saved.attemptId}`, saved.paymentToken, { signal: controller.signal });
      if (!response.ok || controller.signal.aborted) return;
      const payment = await response.json() as SadadCheckout;
      setCheckout(payment);
      if (payment.status === "consumed") {
        const recovered = await memoFetch(`/api/payments/sadad?id=${saved.attemptId}&result=1`, saved.paymentToken, { signal: controller.signal });
        if (recovered.ok && !controller.signal.aborted) {
          const result = await recovered.json();
          setMemo(result.memo || ""); setMemoDocument(result.document || null); setMemoAnalysis(result.analysis || null); setMemoQuality(result.caseQuality || null);
        }
      }
    })().catch(() => undefined);
    return () => controller.abort();
  }, [initialData]);
  const ui = {
    ar: {
      uploadTitle: "ارفع مستندات القضية أولاً",
      uploadText: "PDF أو Word أو نصوص أو صور واضحة — بحد أقصى 25 مستندًا وإجمالي 50 ميغابايت.",
      chooseFiles: "اختيار المستندات",
      analyze: "استخراج الوقائع والبيانات من المستندات",
      analyzing: "جارٍ تحليل المستندات...",
      analysisReady: "اكتمل التحليل. راجع البيانات المستخرجة وعدّلها أو أضف إليها قبل المتابعة.",
      analysisTitle: "البيانات المستخرجة والقابلة للتعديل",
      parties: "الخصوم والأطراف",
      partyName: "اسم الطرف",
      partyRole: "صفة الطرف",
      addParty: "إضافة طرف",
      removeFile: "حذف المستند",
      caseNumber: tr(language, "رقم القضية"),
      continueManual: "فهم القضية والمتابعة",
      filesRequired: "اختر مستنداً واحداً على الأقل للتحليل.",
      fileTypeError: "صيغة الملف غير مدعومة. استخدم PDF أو DOCX أو TXT أو RTF أو JPG أو PNG أو WEBP.",
      fileCountError: "يمكن رفع 25 مستندًا كحد أقصى.",
      fileSizeError: "إجمالي حجم المستندات يجب ألا يتجاوز 50 ميغابايت.",

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
      continueManual: "Understand the case and continue",
      filesRequired: "Choose at least one document to analyse.",
      fileTypeError: "Unsupported format. Use PDF, DOCX, TXT, RTF, JPG, PNG, or WEBP.",
      fileCountError: "You can upload up to 25 documents.",
      fileSizeError: "The total document size must not exceed 50 MB.",

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
      continueManual: "معاملہ سمجھ کر آگے بڑھیں",
      filesRequired: "تجزیے کے لیے کم از کم ایک دستاویز منتخب کریں۔",
      fileTypeError: "یہ فارمیٹ قابلِ قبول نہیں۔ PDF، DOCX، TXT، RTF، JPG، PNG یا WEBP استعمال کریں۔",
      fileCountError: "زیادہ سے زیادہ 25 دستاویزات اپ لوڈ کی جا سکتی ہیں۔",
      fileSizeError: "دستاویزات کا مجموعی حجم 50 MB سے زیادہ نہیں ہونا چاہیے۔",

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

  function applyCaseStory(patch: Record<string, string>, story: string) {
    setFacts(patch.facts || ""); setRequests(patch.requests || "");
    setMemoData(current => ({ ...current, ...patch, facts: patch.facts || "", requests: patch.requests || "", caseStory: story }));
    lastUnderstoodStory.current = story;
    setMemoApproved(false); setStatus("idle"); setMemoError("");
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
      const story = memoStoryText(extracted.facts, extracted.requests);
      setMemoData(current => ({ ...current, caseStory: story }));
      lastUnderstoodStory.current = story;
      setAnalysisWarnings(extracted.warnings || []);
      setAnalysisStatus("success");
      setAnalysisNotice(ui.analysisReady);
      const patch = Object.fromEntries(Object.entries(extracted).filter(([,value]) => typeof value === "string" && value.trim())) as Record<string,string>;
      patch.allParties = parties.map(party => `${party.name}${party.role ? ` — ${party.role}` : ""}`).join("\n");
      return patch;
    } catch (error) {
      setAnalysisStatus("error");
      setAnalysisNotice(interfaceError(error, language, t.error));
    }
  }

  function editGeneratedMemo() {
    clearPaymentAttempt(); paymentAttempt.current = null; setCheckout(null);
    setMemo("");
    setMemoDocument(null);
    setMemoAnalysis(null);
    setResultNotice(null);
    setStatus("idle");
    setStep(0);
  }

  function deleteGeneratedMemo() {
    const ok = window.confirm(language === "ar" ? "حذف المذكرة الحالية من الشاشة؟" : language === "en" ? "Delete the current draft from the screen?" : "موجودہ مسودہ اسکرین سے حذف کریں؟");
    if (!ok) return;
    clearPaymentAttempt(); paymentAttempt.current = null; setCheckout(null);
    setMemo("");
    setMemoDocument(null);
    setMemoAnalysis(null);
    setResultNotice(null);
    setStatus("idle");
    setStep(2);
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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!active || voiceEntryBusy || storyBusy || generationRequest.current) return;
    const stepData = Object.fromEntries(Array.from(new FormData(event.currentTarget).entries(), ([key, value]) => [key, String(value)]));
    let nextFacts = facts, nextRequests = requests;
    let documentData: Record<string, string> = {};
    if (documents.length && analysisStatus !== "success") {
      const extracted = await analyzeDocuments();
      if (!extracted) return;
      documentData = extracted;
      nextFacts = nextFacts.trim() ? nextFacts : extracted.facts || "";
      nextRequests = nextRequests.trim() ? nextRequests : extracted.requests || "";
    }
    if (step === 0 || assistantReview) {
      const story = stepData.caseStory?.trim() || memoStoryText(nextFacts, nextRequests);
      // The preparation endpoint extracts missing fields once. Keep the
      // visitor's words when extraction is unavailable rather than blocking.
      if (story && story !== lastUnderstoodStory.current) nextFacts = story;
      if (!nextFacts.trim() && !documents.length) {
        setStatus("error");
        setMemoError(language === "ar" ? "أضف في المربع ما حدث وما تريد الوصول إليه؛ لم تتضح الوقائع أو الطلبات بعد." : language === "en" ? "Add what happened and the outcome you want in the same box; facts or requests are still missing." : "اسی خانے میں واقعہ اور مطلوبہ نتیجہ بتائیں؛ حقائق یا مطالبات ابھی واضح نہیں۔");
        return;
      }
    }
    const allParties = analysisParties
      .filter((party) => party.name.trim() || party.role.trim())
      .map((party) => `${party.name.trim()}${party.role.trim() ? ` — ${party.role.trim()}` : ""}`)
      .join("\n");
    // Analysis supplements data entered by the user. Empty values extracted
    // from a document must never erase required case details entered earlier.
    const hasNewAnalysis = lastAppliedAnalysis.current?.fields !== analysisFields || lastAppliedAnalysis.current?.parties !== analysisParties;
    const analysisData = analysisStatus === "success" && step === 0 && hasNewAnalysis
      ? Object.fromEntries(Object.entries({ ...analysisFields, allParties, facts, requests }).filter(([, value]) => typeof value === "string" && value.trim().length > 0))
      : {};
    const recognised = recogniseMemoProcedure(importMemoDraft({ ...memoData, ...analysisData, ...stepData, facts: nextFacts, requests: nextRequests,
      ...(Object.keys(documentData).length ? { documentContext: JSON.stringify(documentData) } : {}),
    }, { memoPrefill: documentData }), automaticProcedure.current);
    let nextData = recognised.fields;
    if (step === 0 && analysisStatus === "success") lastAppliedAnalysis.current = { fields: analysisFields, parties: analysisParties };
    automaticProcedure.current = recognised.automatic;
    for (const key of ["caseType", "court", "courtCircuit", "partyRole"]) if (nextData[key]) nextData[key] = canonicalLegalValue(nextData[key]);
    setMemoData(nextData);
    // Prepare once before invoicing; formal gaps stay with the office review.
    const preparationController = new AbortController();
    storyRequest.current = preparationController; setStoryBusy(true); setMemoError("");
    try {
      const response = await memoFetch("/api/legal/prepare-memo", token, {
        method: "POST", headers: { "Content-Type": "application/json" },
        signal: AbortSignal.any([preparationController.signal, AbortSignal.timeout(75000)]),
        body: JSON.stringify({ ...nextData, interfaceLanguage: language }),
      });
      const prepared = await readServiceJson<{ input?: Record<string, string>; error?: string }>(response);
      if (preparationController.signal.aborted || !generationMounted.current) return;
      if (!response.ok || !prepared.input) throw new Error(prepared.error || t.error);
      nextData = prepared.input;
      setMemoData(nextData); setFacts(nextData.facts || ""); setRequests(nextData.requests || "");
    } catch (error) {
      if (!preparationController.signal.aborted) { setStatus("error"); setMemoError(interfaceError(error, language, t.error)); }
      return;
    } finally {
      if (storyRequest.current === preparationController) storyRequest.current = null;
      setStoryBusy(false);
    }
    const nextStep = nextMemoStep(step, fromAssistant);
    if (nextStep !== null) {
      setStep(nextStep);
      return;
    }
    const requiredCaseFields: Array<[string, 0 | 1]> = [
      ["caseType", 1], ["court", 1], ["clientName", 1], ["otherParty", 1], ["partyRole", 1], ["facts", 0], ["requests", 0],
    ];
    const missing = requiredCaseFields.find(([field]) => !nextData[field]?.trim());
    if (missing) {
      setStatus("error");
      setMemoError(`${tr(language, "أكمل الحقل قبل التوليد")}: ${missing[0] === "caseType" ? t.caseType : missing[0] === "court" ? t.court : missing[0] === "clientName" ? t.clientName : missing[0] === "otherParty" ? t.otherParty : missing[0] === "partyRole" ? t.role : missing[0] === "facts" ? t.facts : t.requests}.`);
      setStep(fromAssistant ? 1 : missing[1]);
      return;
    }
    if (!memoApproved && !assistantReview) { setStatus("error"); setMemoError(generationUi.required); return; }
    const controller = new AbortController();
    generationRequest.current = controller;
    setStatus("loading");
    setMemoError("");
    try {
      const { caseStory: _story, ...memoInput } = nextData;
      const input: Record<string, unknown> = { ...memoInput, interfaceLanguage: language, outputLanguage: "ar" };
      const policyResponse = await memoFetch("/api/payments/sadad", token, { signal: controller.signal });
      const currentPolicy = await readServiceJson<{ required: boolean; publicCheckoutEnabled: boolean; priceFils: number; ready: boolean; environment: string; error?: string }>(policyResponse);
      if (!policyResponse.ok || typeof currentPolicy.required !== "boolean") throw new Error(currentPolicy.error || payUi.policyError);
      setPaymentPolicy(currentPolicy);
      if (currentPolicy.required || paymentAttempt.current) {
        if (currentPolicy.publicCheckoutEnabled !== true && !paymentAttempt.current) throw new Error(payUi.policyError);
        setCheckingPayment(true);
        if (!paymentAttempt.current) {
          const attempt = newPaymentAttempt();
          try { rememberPaymentAttempt(attempt); } catch { throw new Error(language === "ar" ? "يلزم تفعيل تخزين جلسة المتصفح للاحتفاظ بطلب الدفع. لم تُنشأ فاتورة." : "Enable browser session storage to retain your payment request. No invoice was created."); }
          paymentAttempt.current = attempt;
        }
        const attempt = paymentAttempt.current;
        const createdResponse = await memoFetch("/api/payments/sadad", token, { method: "POST", signal: controller.signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ attemptId: attempt.attemptId, paymentToken: attempt.paymentToken, input }) });
        const created = await readServiceJson<SadadCheckout & { error?: string; required?: boolean }>(createdResponse);
        if (!createdResponse.ok) {
          if ([400, 413, 422].includes(createdResponse.status) && !checkout) { clearPaymentAttempt(); paymentAttempt.current = null; }
          throw new Error(created.error || payUi.policyError);
        }
        if (created.id) {
          setCheckout(created);
          const statusResponse = await memoFetch(`/api/payments/sadad?id=${encodeURIComponent(created.id)}`, attempt.paymentToken, { signal: controller.signal });
          const payment = await readServiceJson<SadadCheckout & { error?: string }>(statusResponse);
          if (!statusResponse.ok) throw new Error(payment.error || payUi.policyError);
          setCheckout(payment);
          if (!["paid", "consumed"].includes(payment.status)) { setPaymentOpen(true); setStatus("idle"); return; }
          input.paymentId = attempt.attemptId;
          input.paymentToken = attempt.paymentToken;
        }
      }
      setCheckingPayment(false);
      const data = await runMemoGeneration(async (signal) => {
      const response = await memoFetch("/api/legal/memo", token, {
        method: "POST", signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
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
      setCheckingPayment(false);
      if (generationRequest.current === controller) generationRequest.current = null;
    }
  }

  if (memo) return <div className="memo-result" lang={language} dir={language === "en" ? "ltr" : "rtl"}><p role="note" className="form-notice">{memoApprovalNotice[language]}</p>{memoQuality && <div className="form-notice" role="status"><strong>{language === "ar" ? (memoQuality.status === "incomplete" ? "المذكرة غير مكتملة: توجد وقائع أو أسانيد تحتاج استكمالًا" : "اجتازت المسودة مراجعة الاتساق الآلية وتحتاج مراجعة قانونية") : language === "en" ? (memoQuality.status === "incomplete" ? "Incomplete draft: facts or legal sources need review" : "Draft passed automated consistency review; legal review is required") : (memoQuality.status === "incomplete" ? "مسودہ نامکمل ہے؛ حقائق یا قانونی ماخذ کی جانچ درکار ہے" : "مسودے کی خودکار مطابقت جانچ مکمل؛ قانونی جائزہ ضروری ہے")}</strong>{language === "ar" && <ul>{memoQuality.notices.map((notice,index)=><li key={index}>{notice}</li>)}</ul>}</div>}<div className="modal-icon"><FileCheck2 /></div><h2>{memoDocument ? interfaceLabel(memoDocument.title, language) : tr(language, "المذكرة القانونية")}</h2>{memoAnalysis && <div className="memo-analysis-summary"><strong><Sparkles size={18} /> {tr(language, "مصادر استشهدت بها المسودة")}</strong><span>{tr(language, "مراجع تشريعية مستشهد بها")}: {memoAnalysis.lawCount}</span><span>{tr(language, "استشهادات بمبادئ وأحكام تمييز")}: {memoAnalysis.cassationCount}</span><small>{tr(language, "لا يُدرج النظام مادة أو حكماً غير موجود في المكتبة الموثقة، وتبقى المراجعة النهائية للمجموعة.")}</small><ul>{memoAnalysis.sources.map(source => <li key={source.marker}><strong>{source.marker} — {source.title}</strong><span>{source.officialSource} · {source.reference}</span>{source.sourceUrl ? <a href={source.sourceUrl} target="_blank" rel="noopener noreferrer">{tr(language, "فتح المصدر الأصلي")}</a> : <small>{tr(language, "نص من المكتبة المرفوعة؛ لا يتوفر رابط عام للأصل.")}</small>}{source.libraryUpdatedAt && <small>{tr(language, "تحديث الفهرسة")}: {source.libraryUpdatedAt.slice(0, 10)} — {tr(language, "لا يثبت سريان النص.")}</small>}</li>)}</ul></div>}<>{memoDocument ? <PleadingPreview document={memoDocument} text={memo} language={language}/> : <pre lang="ar" dir="rtl">{memo}</pre>}</><div className="memo-result-tools" aria-label={tr(language, "أدوات المذكرة")}><button type="button" onClick={editGeneratedMemo}><Pencil size={18} />{tr(language, "تعديل")}</button><button type="button" onClick={archiveGeneratedMemo} disabled={archiving}><Archive size={18} />{archiving ? tr(language, "جارٍ الأرشفة") : tr(language, "أرشفة")}</button><button type="button" className="danger" onClick={deleteGeneratedMemo}><Trash2 size={18} />{tr(language, "حذف")}</button><button type="button" onClick={exportGeneratedMemo}><Download size={18} />{tr(language, "تصدير كملف")}</button><button type="button" onClick={() => void printGeneratedMemo()}><Printer size={18} />{tr(language, "طباعة")}</button></div>{resultNotice && <p role="status" className={`form-notice ${resultNotice.kind}`}>{resultNotice.message}</p>}</div>;
  return (
    <div className="memo-modal">
      <div className="journey-switch"><button type="button" className="button button-outline" disabled={status === "loading"} onClick={() => { const draft = captureDraft(); openAssistant(draft.caseStory || memoStoryText(facts, requests)); }}>{language === "ar" ? "المتابعة مع المساعد القانوني" : language === "en" ? "Continue with the legal assistant" : "قانونی معاون کے ساتھ جاری رکھیں"}</button><small>{language === "ar" ? "تبقى مسودتك ومرفقاتك عند الرجوع خلال هذه الجلسة." : language === "en" ? "Your draft and attachments remain here while you switch during this session." : "اس نشست میں واپسی پر مسودہ اور منسلکات محفوظ رہیں گے۔"}</small></div>
      <div className="memo-modal-title"><div className="modal-icon"><FileText /></div><span><h2>{t.memoModal}</h2><p><Languages size={15} />{t.arabicOnly}</p></span></div>
      {memoData.conversationTranscript && <details className="memo-conversation-review">
        <summary>{language === "ar" ? "المحادثة وملخص القضية المنقولان من المساعد" : language === "en" ? "Conversation and case summary from the assistant" : "معاون سے منتقل گفتگو اور مقدمے کا خلاصہ"}</summary>
        <p>{language === "ar" ? "راجع الأسماء والأرقام والوقائع والطلبات أدناه. يتولى المساعد التصحيح اللغوي والبحث القانوني؛ كلام المساعد ليس مصدراً قانونياً." : language === "en" ? "Confirm names, numbers and case facts. The assistant corrects the language and researches legal sources; assistant messages are not legal authorities." : "گفتگو اور خلاصے کی تصحیح کریں۔ منظور شدہ حقائق اور مطالبات بنیاد ہیں؛ معاون کی بات قانونی ماخذ نہیں۔"}</p>
        <p>{memoData.conversationSummary}</p><pre className="memo-transcript-readonly">{memoData.conversationTranscript}</pre>
        {memoData.conversationTranscript.length > 30000 && <p role="alert">{tr(language, "التفريغ طويل. صدّر النسخة الكاملة ثم اختصر النص إلى 30,000 حرف قبل التوليد؛ لن يُحذف جزء منه تلقائياً.")}</p>}
      </details>}
      {assistantReview ? <p className="form-notice">{language === "ar" ? "راجع البيانات المنقولة وعدّل ما يلزم، ثم وافق وولّد المذكرة من هذه الصفحة." : language === "en" ? "Review the transferred details, edit if needed, then approve and generate here." : "منتقل تفصیلات دیکھیں، ضرورت ہو تو درست کریں، پھر یہیں منظوری دے کر یادداشت تیار کریں۔"}</p> : <div className="steps journey-steps" aria-label={t.memoModal}>{journeySteps.map((item, index) => <div key={item} className={index === step ? "active" : index < step ? "done" : ""}><i>{index < step ? <Check size={14} /> : index + 1}</i><span>{item}</span></div>)}</div>}

      {step > 0 && <ProceduralPositionView position={recognisedPosition} language={language} />}
      <form ref={memoFormRef} key={voiceFormVersion} noValidate onSubmit={submit} onChange={event => { if ((event.target as HTMLElement).getAttribute("name")) setMemoApproved(false); }}>
        <div className="step-content">
          {(step === 0 || assistantReview) && <>
            {assistantReview && facts.trim() && requests.trim() && <dl className="memo-handoff-details"><div><dt>{t.facts}</dt><dd>{facts}</dd></div><div><dt>{t.requests}</dt><dd>{requests}</dd></div></dl>}
            <details open={assistantReview && facts.trim() && requests.trim() ? undefined : true}>
              <summary>{language === "ar" ? "تعديل الوقائع والطلبات" : language === "en" ? "Edit facts and requests" : "حقائق اور مطالبات میں ترمیم"}</summary>
              <MemoVoiceInput language={language} active={active} disabled={!active || storyBusy || status === "loading" || analysisStatus === "loading"} initialText={memoData.caseStory || memoStoryText(facts, requests)} facts={facts} requests={requests} onBusy={setVoiceEntryBusy} request={(path, init) => memoFetch(path, token, init)} apply={applyCaseStory} />
            </details>
          </>}
          {step === 0 && (
            <div className="document-analysis-step">
              <label className="document-attach-inline"><UploadCloud size={16} />{tr(language, "إرفاق مستندات")}<input className="document-attach-input" type="file" multiple disabled={storyBusy || voiceEntryBusy || analysisStatus === "loading"} accept=".pdf,.docx,.txt,.rtf,.jpg,.jpeg,.png,.webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/rtf,image/jpeg,image/png,image/webp" onChange={event => addDocuments(Array.from(event.target.files || []))} /></label>
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

              </div>

              {analysisNotice && <p className={`analysis-notice ${analysisStatus}`}><ShieldCheck size={17} />{analysisNotice}</p>}

              {analysisStatus === "success" && analysisWarnings.length > 0 && <div className="analysis-warnings"><h4>{ui.analysisWarnings}</h4><ul>{analysisWarnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul></div>}
            </div>
          )}
          {step === 1 && (
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
          {(step === 1 || step === 2) && <details className="pleading-fields">
            <summary>{language === "ar" ? "الصيغة المعتمدة وبيانات الصحيفة" : language === "en" ? "Approved form and pleading details" : "منظور شدہ قالب اور درخواست کی معلومات"}</summary>
            <p>{language === "ar" ? "يعتمد المحرك صحيفة الدعوى أو الاستئناف المحفوظة بحسب المرحلة والصفة. تُعبأ البيانات المتاحة من الوقائع، وتبقى مواعيد الإعلان والتوقيعات للمراجعة." : language === "en" ? "The engine uses the stored claim or appeal form according to the case stage and party role. Known facts fill the form; service dates and signatures remain for review." : "مقدمے کے مرحلے اور حیثیت کے مطابق محفوظ دعویٰ یا اپیل کا قالب استعمال ہوگا۔ دستیاب حقائق بھریں گے؛ تاریخیں اور دستخط جائزے کے لیے ہیں۔"}</p>
            <div className="form-grid"><Field label={language === "en" ? "Document format" : language === "ur" ? "دستاویز کا قالب" : "صيغة المستند"}><select name="documentKind" defaultValue={memoData.documentKind || "auto"}><option value="auto">{tr(language, "تلقائي بحسب القضية والصفة")}</option><option value="claim">{tr(language, "صحيفة دعوى")}</option><option value="appeal">{tr(language, "صحيفة استئناف")}</option><option value="memorandum">{tr(language, "مذكرة بدفاع")}</option></select></Field>
            {Object.entries(pleadingFields).map(([key,label])=><Field key={key} label={interfaceLabel(label, language)}><textarea name={key} rows={/Grounds|Requests|Operative/.test(key)?3:1} defaultValue={memoData[key] || analysisFields[key as keyof typeof pleadingFields] || ""} maxLength={5000}/></Field>)}</div>
          </details>}
          {step === 1 && !assistantReview && <div className="research-box"><Search size={30} /><h3>{language === "ar" ? "مسار التحليل القانوني للمذكرة" : t.steps[2]}</h3><p>{language === "ar" ? "يحلّل المحرك الوقائع والطلبات، يصنّف المسائل القانونية، يطابقها مع القوانين والمواد الكويتية، ثم يبحث عن مبادئ وأحكام التمييز المتصلة بذات المسألة والسبب قبل بناء الدفوع بصياغة المحاكم الكويتية." : language === "en" ? "The engine classifies the issues, matches verified Kuwaiti laws and provisions, then retrieves materially related Court of Cassation principles before drafting each argument." : "انجن قانونی مسائل کی درجہ بندی کرتا ہے، مصدقہ کویتی قوانین اور متعلقہ امتیازی عدالتی اصولوں سے مطابقت کرتا ہے، پھر ہر دلیل تیار کرتا ہے۔"}</p><div className="analysis-pipeline"><span>1. {tr(language, "تحليل الوقائع")}</span><span>2. {tr(language, "تحديد المواد")}</span><span>3. {tr(language, "مطابقة أحكام التمييز")}</span><span>4. {tr(language, "بناء الدفوع والطلبات")}</span></div><Field label={language === "ar" ? "ملاحظات قانونية إضافية (اختيارية)" : language === "en" ? "Additional legal notes (optional)" : "اضافی قانونی نوٹس (اختیاری)"}><textarea name="legalIssues" rows={6} defaultValue={memoData.legalIssues} placeholder={tr(language, "اتركها فارغة إن لم تكن لديك ملاحظة؛ سيستنتج النظام المسائل القانونية تلقائياً.")} /></Field><div><ShieldCheck size={18} />{language === "ar" ? "لن تُدرج مادة أو حكم تمييز إلا من مصدر موثق، وسيصرّح النظام عند عدم العثور على تطابق." : language === "en" ? "No law or judgment is included unless it is found in the verified legal database." : "کوئی قانون یا فیصلہ شامل نہیں ہوگا جب تک وہ مصدقہ قانونی ڈیٹابیس میں نہ ہو۔"}</div></div>}
          {(step === 2 || assistantReview) && <div className="review-box"><FileCheck2 size={34} /><h3>{t.review}</h3><p>{t.arabicOnly}</p><p className="template-badge">{tr(language, "الصيغة")}: {tr(language, selectPleadingKind(memoData) === "appeal" ? "صحيفة استئناف" : selectPleadingKind(memoData) === "claim" ? "صحيفة دعوى" : "مذكرة بدفاع")}</p><p role="note" className="form-notice">{memoApprovalNotice[language]}</p>
            {!assistantReview && <dl className="memo-handoff-details">{[[t.caseType, "caseType"], [t.court, "court"], [tr(language, "الدائرة"), "courtCircuit"], [tr(language, "مرحلة القضية"), "caseStage"], [t.clientName, "clientName"], [t.role, "partyRole"], [t.otherParty, "otherParty"], [ui.allParties, "allParties"], [t.facts, "facts"], [t.requests, "requests"]].map(([label, key]) => <div key={key}><dt>{label}</dt><dd>{["caseType", "court", "partyRole", "caseStage"].includes(key) ? interfaceLabel(memoData[key] || "", language) : memoData[key]}</dd></div>)}</dl>}
            <button type="button" className="button button-outline" onClick={() => { captureDraft(); setMemoApproved(false); setStep(0); }}>{assistantReview ? (language === "ar" ? "إرفاق أو استخراج مستندات (اختياري)" : language === "en" ? "Attach or extract documents (optional)" : "دستاویزات منسلک یا اخذ کریں (اختیاری)") : (language === "ar" ? "تعديل الوقائع أو المستندات" : language === "en" ? "Edit facts or documents" : "حقائق یا دستاویزات میں ترمیم")}</button>
            {!assistantReview && <div><BookOpen size={18} />{t.libraryText}</div>}
            {((paymentPolicy?.publicCheckoutEnabled && paymentPolicy.required) || checkout) && <section className="memo-payment" aria-label={payUi.title}>
              <div><h4>{payUi.title}</h4><strong><bdi>{new Intl.NumberFormat(language === "ar" ? "ar-KW" : "en-KW", { style: "currency", currency: "KWD" }).format((checkout?.priceFils ?? paymentPolicy?.priceFils ?? 0) / 1000)}</bdi></strong></div>
              {(checkout?.environment || paymentPolicy?.environment) === "sandbox" && <p>{payUi.test}</p>}
              <p>{checkout ? payUi.waiting : payUi.safety}</p>
              {checkout && <button type="button" className="button button-primary" onClick={() => setPaymentOpen(true)}>{payUi.open}</button>}
              {checkout && ["paid", "consumed"].includes(checkout.status) && <p role="status">{language === "ar" ? "تأكد الدفع لدى سداد." : language === "en" ? "Payment verified by SADAD." : "سداد نے ادائیگی کی تصدیق کردی۔"}</p>}
              {checkout && <small dir="ltr">{checkout.id}</small>}
            </section>}
            {!assistantReview && <label className="memo-generation-approval"><input type="checkbox" checked={memoApproved} onChange={event => setMemoApproved(event.target.checked)} disabled={status === "loading"} />{generationUi.approval}</label>}</div>}
        </div>
        <div className="memo-actions">{step > 0 && !assistantReview ? <button type="button" className="button button-outline" disabled={status === "loading"} onClick={() => { captureDraft(); setMemoApproved(false); setStep(step - 1); }}>{t.previous}</button> : <span />}<button className="button button-primary" disabled={voiceEntryBusy || status === "loading" || analysisStatus === "loading" || storyBusy}>{storyBusy ? (language === "ar" ? "جارٍ فهم الوقائع والطلبات…" : language === "en" ? "Understanding facts and requests…" : "حقائق اور مطالبات سمجھ رہا ہوں…") : status === "loading" ? (checkingPayment ? payUi.checking : t.loading) : assistantReview ? (language === "ar" ? ((paymentPolicy?.required || checkout) ? "أوافق وأتابع للدفع والتوليد" : "أوافق وأولّد المذكرة") : language === "en" ? "Approve and generate memorandum" : "منظور کرکے یادداشت تیار کریں") : step === 2 ? (paymentPolicy?.publicCheckoutEnabled && paymentPolicy.required) || checkout ? checkout ? payUi.verify : payUi.pay : t.generate : step === 0 && documents.length === 0 ? ui.continueManual : t.next}<ArrowLeft size={17} /></button></div>
        {status === "loading" && <div className="memo-generation-pending"><p role="status" aria-live="polite">{checkingPayment ? payUi.checking : generationUi.pending}</p><span>{generationSeconds} {generationUi.seconds}</span><small>{checkingPayment ? payUi.safety : generationUi.limit}</small><button type="button" className="button button-outline" onClick={() => generationRequest.current?.abort()}>{generationUi.cancel}</button></div>}
        {status === "error" && <p className="form-notice error">{memoError || t.error}</p>}
      </form>
      {active && paymentOpen && checkout && paymentAttempt.current && <MemoPaymentDialog payment={checkout} paymentToken={paymentAttempt.current.paymentToken} language={language} request={memoFetch} onPayment={setCheckout} onClose={() => setPaymentOpen(false)} />}
    </div>
  );
}

function FormNotice({ status, t }: { status: string; t: SiteCopy }) {
  if (status !== "success" && status !== "error") return null;
  return <p className={`form-notice ${status}`}>{status === "success" ? t.sent : t.error}</p>;
}
