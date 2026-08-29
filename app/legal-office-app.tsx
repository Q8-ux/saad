"use client";

import {
  FormEvent,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { I18nProvider, Language, useI18n } from "./i18n";
import { resolveOfficialDocumentUrl } from "../lib/legal-source";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type VoiceTarget = HTMLInputElement | HTMLTextAreaElement;

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  [index: number]: { transcript: string };
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type BrowserSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

type SpeechRecognitionWindow = Window &
  typeof globalThis & {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  };

type PageKey =
  | "dashboard"
  | "search"
  | "library"
  | "clients"
  | "cases"
  | "hearings"
  | "invoices"
  | "memos"
  | "settings"
  | "admin";

type Viewer = {
  email: string;
  displayName: string;
};

type ActiveOffice = {
  officeId: string;
  officeName: string;
  role: "owner" | "admin" | "lawyer" | "secretary" | "finance" | "viewer";
  plan: string;
  subscriptionStatus: string;
  billingMode: string;
  seatLimit: number;
  endsAt: string;
  graceUntil: string;
};

type SaaSSession = {
  user: Viewer & {
    id: string;
    isPlatformAdmin: boolean;
  };
  memberships: Array<{
    officeId: string;
    officeName: string;
    officeStatus: string;
    role: ActiveOffice["role"];
    plan: string | null;
    subscriptionStatus: string | null;
    billingMode: string | null;
    seatLimit: number | null;
    endsAt: string | null;
    graceUntil: string | null;
  }>;
  activeOffice: ActiveOffice | null;
};

type OfficeMember = {
  id: string;
  userId: string;
  email: string;
  displayName: string;
  role: ActiveOffice["role"];
  status: "active" | "inactive";
  createdAt: string;
};

type SubscriptionOffice = {
  id: string;
  name: string;
  status: string;
  plan: string;
  subscriptionStatus: string;
  billingMode: string;
  seatLimit: number;
  endsAt: string;
  graceUntil: string;
  ownerEmail: string | null;
  memberCount: number;
  createdAt: string;
};

type Client = {
  id: number;
  name: string;
  phone: string;
  email: string;
  notes: string;
  createdAt: string;
};

type LegalCase = {
  id: number;
  caseNumber: string;
  clientId: number | null;
  clientName: string | null;
  court: string;
  type: string;
  status: string;
  opposingParty: string;
  notes: string;
  createdAt: string;
};

type Hearing = {
  id: number;
  caseId: number | null;
  caseNumber: string | null;
  title: string;
  date: string;
  time: string;
  location: string;
  kind: string;
  status: string;
  notes: string;
};

type Invoice = {
  id: number;
  clientId: number | null;
  clientName: string | null;
  caseId: number | null;
  caseNumber: string | null;
  amountFils: number;
  status: string;
  issueDate: string;
  dueDate: string;
  description: string;
};

type Memo = {
  id: number;
  caseId: number | null;
  title: string;
  memoType: string;
  court: string;
  facts: string;
  legalBasis: string;
  requests: string;
  content: string;
  citationsJson: string;
  createdAt: string;
};

type OfficeData = {
  clients: Client[];
  cases: LegalCase[];
  hearings: Hearing[];
  invoices: Invoice[];
  memos: Memo[];
  settings: {
    id: number;
    officeName: string;
    currency: string;
    updatedAt?: string;
  };
};

type CategoryCount = { category: string; count: number };
type TypeCount = { document_type: string; count: number };
type RecentDocument = {
  id: number;
  title: string;
  category: string;
  document_type: string;
  law_number: number | null;
  law_year: number | null;
  official_source: string;
  source_url: string;
};

type LegalStats = {
  documents: number;
  chunks: number;
  officialDocuments: number;
  libraryDocuments: number;
  categories: CategoryCount[];
  types: TypeCount[];
  recent: RecentDocument[];
  indexedAt: string;
};

type SearchResult = {
  id: number;
  documentId: number;
  chunkIndex: number;
  reference: string | null;
  excerpt: string;
  title: string;
  category: string;
  documentType: string;
  lawNumber: number | null;
  lawYear: number | null;
  sourceUrl: string;
  sourcePage: string;
  officialSource: string;
  summary: string;
  pageCount: number | null;
  articleCount: number;
  sourceType: string;
  score: number;
  qualityScore: number;
  qualityLabel: string;
  amendmentAlert: boolean;
};

type SearchAnalysis = {
  query: string;
  resultCount: number;
  documentCount: number;
  officialResultCount: number;
  categories: string[];
  averageQuality: number;
  confidence: string;
  amendmentWarning: string | null;
  evidenceNote: string;
  strongestDocuments: Array<{
    id: number;
    title: string;
    sourceType: string;
    qualityScore: number;
  }>;
  nextChecks: string[];
};

type DocumentRow = {
  id: number;
  title: string;
  category: string;
  document_type: string;
  law_number: number | null;
  law_year: number | null;
  summary: string;
  official_source: string;
  source_url: string;
  source_page: string;
  page_count: number | null;
  article_count: number;
  source_type: string;
};

type LegalSourceDocument = DocumentRow;

type LegalSourceChunk = {
  id: number;
  chunk_index: number;
  reference: string | null;
  text: string;
};

type LegalSourceResponse = {
  document: LegalSourceDocument;
  chunks: LegalSourceChunk[];
  page: number;
  pageSize: number;
  totalChunks: number;
  rejectedChunks: number;
  needsReindex: boolean;
  hasMore: boolean;
};

type Resource = "clients" | "cases" | "hearings" | "invoices";
type ModalState = { resource: Resource; record?: Record<string, unknown> } | null;
type DeletionRequest = { resource: Resource | "memos"; id: number } | null;

const EMPTY_OFFICE: OfficeData = {
  clients: [],
  cases: [],
  hearings: [],
  invoices: [],
  memos: [],
  settings: {
    id: 1,
    officeName: "المكتب القانوني",
    currency: "KWD",
  },
};

const EMPTY_STATS: LegalStats = {
  documents: 0,
  chunks: 0,
  officialDocuments: 0,
  libraryDocuments: 0,
  categories: [],
  types: [],
  recent: [],
  indexedAt: "",
};

const WHATSAPP_URL = "https://wa.me/96551231313";

const SPEECH_LANGUAGE: Record<Language, string> = {
  ar: "ar-KW",
  en: "en-US",
  ur: "ur-PK",
};

const DASHBOARD_QUERY_SUGGESTIONS = [
  "تقديم أصل العقد",
  "بطلان الإعلان",
  "حجية التوقيع الإلكتروني",
  "فسخ عقد الإيجار",
  "إخلاء العين المؤجرة",
  "المطالبة بالأجرة المتأخرة",
  "التعويض عن الإخلال بالعقد",
  "تنفيذ الشرط الجزائي",
  "بطلان العقد للتدليس",
  "صحة التوقيع",
  "الطعن بالتزوير",
  "دعوى نفقة الزوجة والأولاد",
  "حضانة الصغير وتنظيم الزيارة",
  "إثبات الطلاق والرجعة",
  "قسمة التركة وتحديد الأنصبة",
  "بطلان القبض والتفتيش",
  "انتفاء القصد الجنائي",
  "انقضاء الدعوى الجزائية بالتقادم",
  "مكافأة نهاية الخدمة",
  "الفصل التعسفي ومستحقات العامل",
  "إصابة العمل والتعويض",
  "إلغاء القرار الإداري",
  "وقف تنفيذ القرار الإداري",
  "منازعة تنفيذ حكم",
  "صحة ونفاذ عقد بيع عقار",
  "إزالة التعدي على عقار",
  "التعويض عن حادث مروري",
  "المطالبة بقيمة شيك",
  "حماية العلامة التجارية",
  "حقوق المؤلف والنشر",
] as const;

const NAV: Array<{
  key: PageKey;
  label: string;
  short: Record<Language, string>;
}> = [
  { key: "dashboard", label: "لوحة التحكم", short: { ar: "لو", en: "DB", ur: "ڈیش" } },
  { key: "search", label: "البحث القانوني", short: { ar: "بح", en: "SR", ur: "تلاش" } },
  { key: "library", label: "قاعدة القوانين", short: { ar: "قا", en: "LB", ur: "لا" } },
  { key: "clients", label: "العملاء", short: { ar: "عم", en: "CL", ur: "مؤ" } },
  { key: "cases", label: "القضايا", short: { ar: "قض", en: "CA", ur: "مق" } },
  { key: "hearings", label: "الجلسات والمهام", short: { ar: "جل", en: "HT", ur: "سم" } },
  { key: "invoices", label: "الفواتير", short: { ar: "فو", en: "IN", ur: "ان" } },
  { key: "memos", label: "مولّد المذكرات", short: { ar: "مذ", en: "ME", ur: "یا" } },
  { key: "settings", label: "الإعدادات", short: { ar: "ضب", en: "ST", ur: "تر" } },
  { key: "admin", label: "إدارة الاشتراكات", short: { ar: "إد", en: "SA", ur: "انت" } },
];

const PAGE_META: Record<PageKey, { title: string; sub: string }> = {
  dashboard: {
    title: "لوحة التحكم",
    sub: "إدارة المكتب والمعرفة القانونية في مكان واحد",
  },
  search: {
    title: "محرك البحث القانوني",
    sub: "ابحث في التشريعات والمبادئ القضائية مع فحص المصدر وجودة النص",
  },
  library: {
    title: "قاعدة القوانين",
    sub: "فهرس الوثائق المستخرجة من وزارة العدل وملفات المكتب",
  },
  clients: { title: "العملاء", sub: "إدارة بيانات العملاء بصورة مركزية" },
  cases: { title: "القضايا", sub: "متابعة القضايا والخصوم وحالة كل ملف" },
  hearings: { title: "الجلسات والمهام", sub: "المواعيد والاستحقاقات القادمة" },
  invoices: { title: "الفواتير", sub: "الأتعاب والمبالغ المحصّلة والمستحقة" },
  memos: {
    title: "مولّد المذكرات",
    sub: "مسودة قانونية مسندة إلى نتائج قاعدة القوانين",
  },
  settings: { title: "الإعدادات", sub: "بيانات المكتب وتفضيلات العرض" },
  admin: { title: "إدارة الاشتراكات", sub: "إنشاء المكاتب ومتابعة الخطط والمقاعد" },
};

const CASE_STATUS: Record<string, { label: string; tone: string }> = {
  active: { label: "نشطة", tone: "good" },
  pending: { label: "معلّقة", tone: "warning" },
  urgent: { label: "عاجلة", tone: "danger" },
  closed: { label: "مغلقة", tone: "neutral" },
};

const INVOICE_STATUS: Record<string, { label: string; tone: string }> = {
  paid: { label: "مدفوعة", tone: "good" },
  unpaid: { label: "غير مدفوعة", tone: "warning" },
  overdue: { label: "متأخرة", tone: "danger" },
};

function roleCan(
  role: ActiveOffice["role"],
  capability:
    | "manageSettings"
    | "manageMembers"
    | "manageClients"
    | "manageCases"
    | "manageHearings"
    | "manageInvoices"
    | "manageMemos",
) {
  if (role === "owner" || role === "admin") return true;
  if (role === "viewer") return false;
  if (capability === "manageSettings" || capability === "manageMembers") return false;
  if (role === "finance") return capability === "manageInvoices";
  if (role === "secretary") {
    return ["manageClients", "manageCases", "manageHearings"].includes(capability);
  }
  return ["manageClients", "manageCases", "manageHearings", "manageMemos"].includes(capability);
}

function formatMoney(fils: number, currency: string, locale = "ar-KW") {
  return (Number(fils || 0) / 1000).toLocaleString(locale, {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }) + " " + currency;
}

function formatDate(value: string, locale = "ar-KW") {
  if (!value) return "—";
  const date = new Date(value.length === 10 ? value + "T00:00:00" : value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function StatusBadge({
  value,
  map,
}: {
  value: string;
  map: Record<string, { label: string; tone: string }>;
}) {
  const { t } = useI18n();
  const status = map[value] ?? { label: value || "غير محدد", tone: "neutral" };
  return (
    <span className={"status-badge tone-" + status.tone}>
      <span className="status-dot" />
      {t(status.label)}
    </span>
  );
}

function LoadingState({ label }: { label?: string }) {
  const { t } = useI18n();
  return (
    <div className="loading-state" role="status">
      <span className="spinner" />
      {label ? t(label) : t("جارٍ تحميل البيانات...")}
    </div>
  );
}

function EmptyState({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-mark">ق</div>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}

async function readJson<T>(response: Response): Promise<T> {
  const body = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(body.error || "تعذّر إكمال الطلب.");
  }
  return body;
}

function normalizeOfficeSearch(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("تعذّر النسخ");
}

function speechRecognitionConstructor(): BrowserSpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const speechWindow = window as SpeechRecognitionWindow;
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

function insertVoiceTranscript(field: VoiceTarget, transcript: string) {
  const text = transcript.trim();
  if (!text) return;

  const start = field.selectionStart ?? field.value.length;
  const end = field.selectionEnd ?? field.value.length;
  const before = field.value.slice(0, start);
  const after = field.value.slice(end);
  const separator = before && !/\s$/.test(before) && !/^[،.;:!?]/.test(text) ? " " : "";
  const nextValue = `${before}${separator}${text}${after}`;
  const prototype = field instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype;
  const setValue = Object.getOwnPropertyDescriptor(prototype, "value")?.set;

  if (setValue) {
    setValue.call(field, nextValue);
  } else {
    field.value = nextValue;
  }

  field.dispatchEvent(new Event("input", { bubbles: true }));
  field.focus();
  try {
    const caret = before.length + separator.length + text.length;
    field.setSelectionRange(caret, caret);
  } catch {
    // Some structured browser fields do not expose a text selection range.
  }
}

function VoiceDictationButton({
  getField,
}: {
  getField: () => VoiceTarget | null;
}) {
  const { language, t } = useI18n();
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setSupported(Boolean(speechRecognitionConstructor()));
    });
    return () => {
      window.cancelAnimationFrame(frame);
      recognitionRef.current?.abort();
    };
  }, []);

  function toggleDictation() {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const Recognition = speechRecognitionConstructor();
    const field = getField();
    if (!Recognition || !field || field.disabled || field.readOnly) return;

    const recognition = new Recognition();
    recognition.lang = SPEECH_LANGUAGE[language];
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      let transcript = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result.isFinal) transcript += `${result[0]?.transcript ?? ""} `;
      }
      const activeField = getField();
      if (activeField) insertVoiceTranscript(activeField, transcript);
    };
    recognition.onerror = () => {
      if (recognitionRef.current === recognition) recognitionRef.current = null;
      setListening(false);
    };
    recognition.onend = () => {
      if (recognitionRef.current === recognition) recognitionRef.current = null;
      setListening(false);
    };

    try {
      field.focus();
      recognitionRef.current = recognition;
      recognition.start();
      setListening(true);
    } catch {
      recognitionRef.current = null;
      setListening(false);
    }
  }

  if (!supported) return null;

  const label = t(listening ? "إيقاف الإملاء الصوتي" : "بدء الإملاء الصوتي");
  return (
    <button
      type="button"
      className={"voice-input-button" + (listening ? " is-listening" : "")}
      onPointerDown={(event) => event.preventDefault()}
      onClick={toggleDictation}
      aria-label={label}
      aria-pressed={listening}
      title={label}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M12 14.2a3.7 3.7 0 0 0 3.7-3.7V6.7a3.7 3.7 0 0 0-7.4 0v3.8a3.7 3.7 0 0 0 3.7 3.7Z" />
        <path fill="none" d="M5.8 10.5a6.2 6.2 0 0 0 12.4 0M12 16.7v3.1M8.5 19.8h7" />
      </svg>
    </button>
  );
}

function VoiceInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const fieldRef = useRef<HTMLInputElement>(null);
  if (props.disabled || props.readOnly) return <input {...props} />;

  return (
    <span className="voice-field">
      <input ref={fieldRef} {...props} />
      <VoiceDictationButton getField={() => fieldRef.current} />
    </span>
  );
}

function VoiceTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  if (props.disabled || props.readOnly) return <textarea {...props} />;

  return (
    <span className="voice-field">
      <textarea ref={fieldRef} {...props} />
      <VoiceDictationButton getField={() => fieldRef.current} />
    </span>
  );
}

export default function LegalOfficeApp({
  viewer,
  signInPath,
  signOutPath,
}: {
  viewer: Viewer | null;
  signInPath: string;
  signOutPath: string;
}) {
  return (
    <I18nProvider>
      <LegalOfficeAppContent
        viewer={viewer}
        signInPath={signInPath}
        signOutPath={signOutPath}
      />
    </I18nProvider>
  );
}

function LegalOfficeAppContent({
  viewer,
  signInPath,
  signOutPath,
}: {
  viewer: Viewer | null;
  signInPath: string;
  signOutPath: string;
}) {
  const { language, setLanguage, t } = useI18n();
  const [page, setPage] = useState<PageKey>("dashboard");
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    return window.localStorage.getItem("legal-office-theme") === "dark" ? "dark" : "light";
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [office, setOffice] = useState<OfficeData>(EMPTY_OFFICE);
  const [stats, setStats] = useState<LegalStats>(EMPTY_STATS);
  const [officeLoading, setOfficeLoading] = useState(Boolean(viewer));
  const [statsLoading, setStatsLoading] = useState(Boolean(viewer));
  const [session, setSession] = useState<SaaSSession | null>(null);
  const [sessionLoading, setSessionLoading] = useState(Boolean(viewer));
  const [sessionError, setSessionError] = useState("");
  const [modal, setModal] = useState<ModalState>(null);
  const [deletionRequest, setDeletionRequest] = useState<DeletionRequest>(null);
  const [sourceDocumentId, setSourceDocumentId] = useState<number | null>(null);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<number | null>(null);
  const [searchSeed, setSearchSeed] = useState("");
  const [memoSeed, setMemoSeed] = useState("");
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [appInstalled, setAppInstalled] = useState(() => {
    if (typeof window === "undefined") return false;
    const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      navigatorWithStandalone.standalone === true
    );
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("legal-office-theme", theme);
  }, [theme]);

  useEffect(() => () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadSession() {
      if (!viewer) {
        setSession(null);
        setSessionLoading(false);
        setOfficeLoading(false);
        setStatsLoading(false);
        return;
      }
      setSessionLoading(true);
      setSessionError("");
      try {
        const data = await readJson<SaaSSession>(
          await fetch("/api/auth/me", { cache: "no-store" }),
        );
        if (cancelled) return;
        setSession(data);
      } catch (error) {
        if (!cancelled) {
          setSessionError(error instanceof Error ? error.message : "تعذّر تهيئة حسابك.");
        }
      } finally {
        if (!cancelled) setSessionLoading(false);
      }
    }
    void loadSession();
    return () => {
      cancelled = true;
    };
  }, [viewer]);

  useEffect(() => {
    if (!session?.activeOffice) return;
    void loadOffice();
    void loadStats();
  }, [session?.activeOffice?.officeId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    const onInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setAppInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    const shouldLock = menuOpen || Boolean(modal) || Boolean(deletionRequest) || Boolean(sourceDocumentId);
    document.body.classList.toggle("app-scroll-locked", shouldLock);
    return () => document.body.classList.remove("app-scroll-locked");
  }, [menuOpen, modal, deletionRequest, sourceDocumentId]);

  async function loadOffice() {
    setOfficeLoading(true);
    try {
      const data = await readJson<OfficeData>(
        await fetch("/api/office", { cache: "no-store" }),
      );
      setOffice(data);
    } catch (error) {
      showToast(t(error instanceof Error ? error.message : "تعذّر تحميل بيانات المكتب"));
    } finally {
      setOfficeLoading(false);
    }
  }

  async function loadStats() {
    setStatsLoading(true);
    try {
      const data = await readJson<LegalStats>(await fetch("/api/legal/stats"));
      setStats(data);
    } catch (error) {
      showToast(t(error instanceof Error ? error.message : "تعذّر تحميل قاعدة القوانين"));
    } finally {
      setStatsLoading(false);
    }
  }

  function showToast(message: string) {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = window.setTimeout(() => {
      setToast("");
      toastTimer.current = null;
    }, 3600);
  }

  async function installAndroidApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    if (choice.outcome === "accepted") {
      setAppInstalled(true);
      showToast(t("تم تثبيت التطبيق على الجهاز."));
    }
  }

  function goTo(next: PageKey) {
    setPage(next);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "auto" });
    document.getElementById("main-content")?.focus({ preventScroll: true });
  }

  function startSearch(query: string) {
    setSearchSeed(query.trim());
    goTo("search");
  }

  function useInMemo(result: SearchResult) {
    setMemoSeed(
      result.title +
        "\n" +
        result.excerpt +
        "\n" + t("المصدر") + ": " +
        result.officialSource,
    );
    goTo("memos");
  }

  async function refreshSession() {
    if (!viewer) return;
    setSessionLoading(true);
    setSessionError("");
    try {
      const data = await readJson<SaaSSession>(
        await fetch("/api/auth/me", { cache: "no-store" }),
      );
      setSession(data);
    } catch (error) {
      setSessionError(error instanceof Error ? error.message : "تعذّر تهيئة حسابك.");
    } finally {
      setSessionLoading(false);
    }
  }

  if (!viewer) {
    return <AccessGate signInPath={signInPath} />;
  }

  if (sessionLoading) {
    return <AccountLoadingGate />;
  }

  if (sessionError || !session) {
    return <AccountProblemGate message={sessionError || "تعذّر التحقق من صلاحية الحساب."} signOutPath={signOutPath} onRetry={refreshSession} />;
  }

  if (!session.activeOffice) {
    return <AccountProblemGate message="تعذّر تجهيز مساحة العمل تلقائياً." signOutPath={signOutPath} onRetry={refreshSession} />;
  }

  const activeOffice = session.activeOffice;
  // تبقى إدارة الاشتراكات في الكود لإعادتها لاحقاً، لكنها ليست جزءاً من
  // تجربة التشغيل الحالية.
  const availableNav = NAV.filter((item) => item.key !== "admin");

  const meta = PAGE_META[page];
  const topAction =
    page === "clients" && roleCan(activeOffice.role, "manageClients")
      ? { label: "عميل جديد", resource: "clients" as Resource }
      : page === "cases" && roleCan(activeOffice.role, "manageCases")
        ? { label: "قضية جديدة", resource: "cases" as Resource }
        : page === "hearings" && roleCan(activeOffice.role, "manageHearings")
          ? { label: "موعد جديد", resource: "hearings" as Resource }
          : page === "invoices" && roleCan(activeOffice.role, "manageInvoices")
            ? { label: "فاتورة جديدة", resource: "invoices" as Resource }
            : null;

  return (
    <div className="legal-office-shell">
      <a className="skip-link" href="#main-content">{t("انتقل إلى المحتوى")}</a>
      <aside id="legal-office-main-navigation" className={"sidebar " + (menuOpen ? "is-open" : "")}>
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">ق</div>
          <div className="brand-copy">
            <strong>{t("منصة العقود والترجمة القانونية")}</strong>
            <span>{office.settings.officeName || activeOffice.officeName}</span>
          </div>
          <button
            type="button"
            className="icon-button sidebar-close"
            onClick={() => setMenuOpen(false)}
            aria-label={t("إغلاق القائمة")}
          >
            ×
          </button>
        </div>

        <nav className="main-nav" aria-label={t("القائمة الرئيسية")}>
          {availableNav.map((item) => (
            <button
              key={item.key}
              type="button"
              className={"nav-button " + (page === item.key ? "active" : "")}
              onClick={() => goTo(item.key)}
              aria-current={page === item.key ? "page" : undefined}
            >
              <span className="nav-short">{item.short[language]}</span>
              <span>{t(item.label)}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-status">
          <div className="db-line">
            <span className={"live-dot " + (stats.documents ? "online" : "")} />
            <span>{t("قاعدة القوانين")}</span>
            <strong>{stats.documents ? stats.documents + " " + t("وثيقة") : t("جارٍ التحقق")}</strong>
          </div>
          <div className="sidebar-account">
            <div className="sidebar-account-identity">
              <span>{session.user.displayName}</span>
              <small>{t(activeOffice.role === "owner" ? "مالك المكتب" : activeOffice.role === "admin" ? "مدير المكتب" : "عضو المكتب")}</small>
            </div>
            <a
              className="sidebar-whatsapp-link"
              href={WHATSAPP_URL}
              aria-label={`${t("تواصل عبر واتساب")}: saad.alnabhan`}
            >
              <span className="sidebar-whatsapp-icon" aria-hidden="true">
                <svg viewBox="0 0 32 32" focusable="false">
                  <path d="M16 3.2a12.55 12.55 0 0 0-10.78 19l-1.48 6.59 6.75-1.39A12.55 12.55 0 1 0 16 3.2Zm0 22.79c-1.72 0-3.41-.45-4.89-1.3l-.4-.23-4 .82.88-3.86-.27-.4a10.3 10.3 0 1 1 8.68 4.97Zm5.65-7.72c-.31-.16-1.82-.9-2.1-1-.28-.1-.49-.16-.69.16-.2.31-.79 1-.97 1.2-.18.2-.36.22-.67.07-1.83-.91-3.03-1.62-4.24-3.67-.32-.55.32-.51.92-1.7.1-.2.05-.38-.03-.54-.08-.16-.69-1.66-.95-2.27-.25-.6-.51-.51-.69-.52h-.59c-.2 0-.54.08-.82.38-.28.31-1.08 1.05-1.08 2.56 0 1.5 1.1 2.96 1.25 3.17.15.2 2.16 3.3 5.23 4.63.73.31 1.3.5 1.74.64.73.23 1.39.2 1.92.12.59-.09 1.82-.74 2.08-1.45.26-.7.26-1.31.18-1.44-.08-.13-.28-.2-.59-.36Z" />
                </svg>
              </span>
              <span dir="ltr">saad.alnabhan</span>
            </a>
            <a className="sidebar-signout" href={signOutPath}>{t("تسجيل الخروج")}</a>
          </div>
          <button
            type="button"
            className="theme-button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <span>{t(theme === "dark" ? "الوضع الفاتح" : "الوضع الداكن")}</span>
            <span className={"theme-track " + (theme === "dark" ? "on" : "")}>
              <span />
            </span>
          </button>
        </div>
      </aside>

      {menuOpen && <button type="button" className="sidebar-scrim" onClick={() => setMenuOpen(false)} aria-label={t("إغلاق القائمة")} />}

      <main id="main-content" className="main-area" tabIndex={-1}>
        <header className="topbar">
          <button
            type="button"
            className="icon-button menu-button"
            onClick={() => setMenuOpen(true)}
            aria-label={t("فتح القائمة")}
            aria-expanded={menuOpen}
            aria-controls="legal-office-main-navigation"
          >
            ☰
          </button>
          <div>
            <h1>{t(meta.title)}</h1>
            <p>{t(meta.sub)}</p>
          </div>
          <div className="topbar-actions">
            {!appInstalled && installPrompt && (
              <button
                type="button"
                className="install-app-button"
                onClick={() => void installAndroidApp()}
                aria-label={t("تثبيت تطبيق أندرويد")}
                title={t("تثبيت تطبيق أندرويد")}
              >
                <span className="install-app-icon" aria-hidden="true">↓</span>
                <span className="install-app-label">{t("تثبيت التطبيق")}</span>
              </button>
            )}
            <button
              type="button"
              className="quick-search-button"
              onClick={() => goTo("search")}
            >
              {t("بحث قانوني")}
            </button>
            <label className="language-control">
              <span className="sr-only">{t("اللغة")}</span>
              <select
                value={language}
                onChange={(event) => setLanguage(event.target.value as Language)}
                aria-label={t("اللغة")}
              >
                <option value="ar">العربية</option>
                <option value="en">English</option>
                <option value="ur">اردو</option>
              </select>
            </label>
            <div className="account-summary" title={session.user.email}>
              <span>{session.user.displayName}</span>
              <small>{t(activeOffice.role === "owner" ? "مالك المكتب" : activeOffice.role === "admin" ? "مدير المكتب" : "عضو المكتب")}</small>
            </div>
            <a className="signout-button" href={signOutPath}>{t("تسجيل الخروج")}</a>
            {topAction && (
              <button
                type="button"
                className="button primary"
                onClick={() => setModal({ resource: topAction.resource })}
              >
                <span className="button-plus">+</span>
                <span className="top-action-label">{t(topAction.label)}</span>
              </button>
            )}
          </div>
        </header>

        <div className="page-content">
          {page === "dashboard" && (
            <Dashboard
              office={office}
              stats={stats}
              officeLoading={officeLoading}
              statsLoading={statsLoading}
              onSearch={startSearch}
              onNavigate={goTo}
            />
          )}
          {page === "search" && (
            <LegalSearchPage
              key={searchSeed || "empty-search"}
              initialQuery={searchSeed}
              stats={stats}
              onUseInMemo={useInMemo}
              onOpenSource={setSourceDocumentId}
              onToast={showToast}
            />
          )}
          {page === "library" && (
            <LegalLibrary
              stats={stats}
              onSearch={startSearch}
              onOpenSource={setSourceDocumentId}
            />
          )}
          {page === "clients" && (
            <ClientsPage
              clients={office.clients}
              loading={officeLoading}
              canManage={roleCan(activeOffice.role, "manageClients")}
              onEdit={(record) => setModal({ resource: "clients", record })}
              onDelete={(id) => setDeletionRequest({ resource: "clients", id })}
              onAdd={() => setModal({ resource: "clients" })}
            />
          )}
          {page === "cases" && (
            <CasesPage
              cases={office.cases}
              loading={officeLoading}
              canManage={roleCan(activeOffice.role, "manageCases")}
              onEdit={(record) => setModal({ resource: "cases", record })}
              onDelete={(id) => setDeletionRequest({ resource: "cases", id })}
              onAdd={() => setModal({ resource: "cases" })}
            />
          )}
          {page === "hearings" && (
            <HearingsPage
              hearings={office.hearings}
              loading={officeLoading}
              canManage={roleCan(activeOffice.role, "manageHearings")}
              onEdit={(record) => setModal({ resource: "hearings", record })}
              onDelete={(id) => setDeletionRequest({ resource: "hearings", id })}
              onAdd={() => setModal({ resource: "hearings" })}
            />
          )}
          {page === "invoices" && (
            <InvoicesPage
              invoices={office.invoices}
              currency={office.settings.currency}
              loading={officeLoading}
              canManage={roleCan(activeOffice.role, "manageInvoices")}
              onEdit={(record) => setModal({ resource: "invoices", record })}
              onDelete={(id) => setDeletionRequest({ resource: "invoices", id })}
              onAdd={() => setModal({ resource: "invoices" })}
            />
          )}
          {page === "memos" && (
            <MemoGenerator
              key={memoSeed || "memo"}
              initialBasis={memoSeed}
              cases={office.cases}
              memos={office.memos}
              onGenerated={loadOffice}
              onDelete={(id) => setDeletionRequest({ resource: "memos", id })}
              onToast={showToast}
              canManage={roleCan(activeOffice.role, "manageMemos")}
            />
          )}
          {page === "settings" && (
            <SettingsPage
              office={office}
              theme={theme}
              onThemeChange={setTheme}
              onSaved={loadOffice}
              onToast={showToast}
              stats={stats}
              canManageSettings={roleCan(activeOffice.role, "manageSettings")}
              canManageMembers={roleCan(activeOffice.role, "manageMembers")}
            />
          )}
          {page === "admin" && session.user.isPlatformAdmin && (
            <PlatformAdminPage onSessionRefresh={refreshSession} />
          )}
        </div>
      </main>

      <nav className="mobile-nav" aria-label={t("التنقل السريع")}>
        {availableNav.filter((item) => item.key !== "admin").slice(0, 5).map((item) => (
          <button
            key={item.key}
            type="button"
            className={page === item.key ? "active" : ""}
            onClick={() => goTo(item.key)}
            aria-current={page === item.key ? "page" : undefined}
          >
            <span>{item.short[language]}</span>
            <small className="mobile-nav-label">{t(item.label).split(" ")[0]}</small>
          </button>
        ))}
      </nav>

      {modal && (
        <RecordModal
          modal={modal}
          office={office}
          onClose={() => setModal(null)}
          onSaved={async () => {
            setModal(null);
            await loadOffice();
            showToast(t("تم حفظ البيانات بنجاح."));
          }}
        />
      )}

      {sourceDocumentId && (
        <LegalSourceDialog
          documentId={sourceDocumentId}
          onClose={() => setSourceDocumentId(null)}
          onToast={showToast}
        />
      )}

      {deletionRequest && (
        <ConfirmDialog
          onClose={() => setDeletionRequest(null)}
          onConfirm={async () => {
            const deleted = await deleteRecord(
              deletionRequest.resource,
              deletionRequest.id,
            );
            if (deleted) setDeletionRequest(null);
          }}
        />
      )}

      {toast && <div className="toast" role="status" aria-live="polite">{toast}</div>}
    </div>
  );

  async function deleteRecord(resource: Resource | "memos", id: number) {
    try {
      const params = new URLSearchParams({ resource, id: String(id) });
      await readJson(await fetch("/api/office?" + params.toString(), { method: "DELETE" }));
      await loadOffice();
      showToast(t("تم حذف السجل."));
      return true;
    } catch (error) {
      showToast(t(error instanceof Error ? error.message : "تعذّر الحذف"));
      return false;
    }
  }
}

function Dashboard({
  office,
  stats,
  officeLoading,
  statsLoading,
  onSearch,
  onNavigate,
}: {
  office: OfficeData;
  stats: LegalStats;
  officeLoading: boolean;
  statsLoading: boolean;
  onSearch: (query: string) => void;
  onNavigate: (page: PageKey) => void;
}) {
  const { language, locale, t } = useI18n();
  const [query, setQuery] = useState("");
  const activeCases = office.cases.filter((item) => item.status === "active").length;
  const upcoming = office.hearings.filter((item) => item.status === "pending").length;
  const unpaid = office.invoices
    .filter((item) => item.status !== "paid")
    .reduce((total, item) => total + Number(item.amountFils), 0);
  const currency = office.settings.currency;
  const maxCategory = Math.max(1, ...stats.categories.map((item) => item.count));

  function submit(event: FormEvent) {
    event.preventDefault();
    if (query.trim().length >= 2) onSearch(query);
  }

  return (
    <div className="dashboard-page">
      <section className="search-hero">
        <div className="hero-kicker">{t("المحرك القانوني المرتبط بملف «قوانين»")}</div>
        <h2>{t("ابدأ بالسؤال القانوني، ثم راجع الدليل والمصدر")}</h2>
        <p>{t("ابحث في النصوص والمبادئ القضائية، وافحص درجة جودة الاستخراج قبل استخدام النتيجة في المذكرة.")}</p>
        <form className="hero-search" onSubmit={submit}>
          <VoiceInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("مثال: وقف الدعوى لحين الفصل في التمييز")}
            aria-label={t("نص البحث القانوني")}
          />
          <button className="button primary" type="submit">{t("ابحث الآن")}</button>
        </form>
        <div className="query-examples">
          {DASHBOARD_QUERY_SUGGESTIONS.map((item) => (
            <button type="button" key={item} onClick={() => onSearch(item)}>{t(item)}</button>
          ))}
        </div>
        {language !== "ar" && (
          <div className="legal-language-note">
            {t("النصوص القانونية ونتائج البحث تبقى بالعربية لأنها تعرض المصدر الرسمي كما هو.")}
          </div>
        )}
      </section>

      <section className="kpi-grid">
        <KpiCard
          label={t("الوثائق القانونية")}
          value={statsLoading ? "…" : stats.documents.toLocaleString(locale)}
          note={stats.officialDocuments.toLocaleString(locale) + " " + t("وثيقة بمصدر رسمي")}
          accent="blue"
        />
        <KpiCard
          label={t("المقاطع المفهرسة")}
          value={statsLoading ? "…" : stats.chunks.toLocaleString(locale)}
          note={t("بحث نصي مع ترتيب الصلة")}
          accent="violet"
        />
        <KpiCard
          label={t("القضايا النشطة")}
          value={officeLoading ? "…" : activeCases.toLocaleString(locale)}
          note={t("من إجمالي") + " " + office.cases.length.toLocaleString(locale) + " " + t("قضية")}
          accent="green"
        />
        <KpiCard
          label={t("مستحقات غير محصّلة")}
          value={officeLoading ? "…" : formatMoney(unpaid, currency, locale)}
          note={upcoming.toLocaleString(locale) + " " + t("جلسة أو مهمة قادمة")}
          accent="orange"
        />
      </section>

      <section className="dashboard-grid">
        <div className="panel span-two">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">{t("تغطية قاعدة المعرفة")}</span>
              <h3>{t("الوثائق حسب المجال القانوني")}</h3>
            </div>
            <button type="button" className="text-button" onClick={() => onNavigate("library")}>
              {t("عرض المكتبة")}
            </button>
          </div>
          {statsLoading ? (
            <LoadingState />
          ) : (
            <div className="category-bars">
              {stats.categories.slice(0, 8).map((item) => (
                <div className="category-row" key={item.category}>
                  <div className="category-label">
                    <span>{t(item.category)}</span>
                    <strong>{item.count.toLocaleString(locale)}</strong>
                  </div>
                  <div className="bar-track">
                    <span style={{ width: Math.max(5, (item.count / maxCategory) * 100) + "%" }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">{t("مراقبة الجودة")}</span>
              <h3>{t("حالة المصادر")}</h3>
            </div>
          </div>
          <div className="quality-stack">
            <div className="quality-item">
              <span className="quality-icon verified">✓</span>
              <div>
                <strong>{stats.officialDocuments.toLocaleString(locale)} {t("وثيقة رسمية")}</strong>
                <p>{t("مرتبطة بمصدر وزارة العدل ضمن القاعدة")}</p>
              </div>
            </div>
            <div className="quality-item">
              <span className="quality-icon review">!</span>
              <div>
                <strong>{stats.libraryDocuments.toLocaleString(locale)} {t("وثيقة من ملفات المكتب")}</strong>
                <p>{t("تحتاج مطابقة الأصل قبل الاقتباس القضائي")}</p>
              </div>
            </div>
            <div className="quality-callout">
              {t("المحرك لا يساوي بين النص الرسمي والنص المستخرج ضوئياً؛ تظهر درجة الفحص مع كل نتيجة.")}
            </div>
          </div>
        </div>

        <div className="panel span-three">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">{t("الأقرب زمنياً")}</span>
              <h3>{t("أحدث التشريعات المدرجة")}</h3>
            </div>
          </div>
          <div className="recent-documents">
            {stats.recent.slice(0, 6).map((document) => (
              <button
                type="button"
                className="recent-document"
                key={document.id}
                onClick={() => onSearch(document.title)}
              >
                <span className="document-year">{document.law_year || t("مرجع")}</span>
                <span className="document-copy">
                  <strong>{document.title}</strong>
                  <small>{t(document.category)} · {t(document.document_type)}</small>
                </span>
                <span className="arrow-mark">←</span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function KpiCard({
  label,
  value,
  note,
  accent,
}: {
  label: string;
  value: string;
  note: string;
  accent: string;
}) {
  return (
    <article className={"kpi-card accent-" + accent}>
      <div className="kpi-top">
        <span>{label}</span>
        <span className="kpi-spark" />
      </div>
      <strong>{value}</strong>
      <p>{note}</p>
    </article>
  );
}

function LegalSearchPage({
  initialQuery,
  stats,
  onUseInMemo,
  onOpenSource,
  onToast,
}: {
  initialQuery: string;
  stats: LegalStats;
  onUseInMemo: (result: SearchResult) => void;
  onOpenSource: (documentId: number) => void;
  onToast: (message: string) => void;
}) {
  const { language, locale, t } = useI18n();
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [year, setYear] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [analysis, setAnalysis] = useState<SearchAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (initialQuery.trim().length >= 2) void performSearch(initialQuery);
  }, [initialQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  async function performSearch(value = query) {
    const cleanQuery = value.trim();
    if (cleanQuery.length < 2) {
      setError(t("اكتب كلمتين على الأقل للبحث."));
      return;
    }
    if (cleanQuery.length > 240) {
      setError(t("اجعل عبارة البحث أقصر من 240 حرفاً."));
      return;
    }
    setLoading(true);
    setError("");
    setSearched(true);
    try {
      const params = new URLSearchParams({ q: cleanQuery });
      if (category) params.set("category", category);
      if (documentType) params.set("type", documentType);
      if (year) params.set("year", year);
      const data = await readJson<{ results: SearchResult[]; analysis: SearchAnalysis }>(
        await fetch("/api/legal/search?" + params.toString()),
      );
      setResults(data.results);
      setAnalysis(data.analysis);
    } catch (searchError) {
      setResults([]);
      setAnalysis(null);
      setError(t(searchError instanceof Error ? searchError.message : "تعذّر البحث"));
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void performSearch();
  }

  return (
    <div className="search-page">
      <section className="search-console">
        <form onSubmit={submit}>
          <div className="search-input-row">
            <VoiceInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            maxLength={240}
              placeholder={t("اكتب الوقائع أو المادة أو المبدأ المطلوب...")}
              aria-label={t("البحث في قاعدة القوانين")}
            />
            <button type="submit" className="button primary" disabled={loading}>
              {t(loading ? "جارٍ البحث..." : "بحث وتحليل")}
            </button>
          </div>
          <div className="search-filters">
            <label>
              <span>{t("المجال")}</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                <option value="">{t("كل المجالات")}</option>
                {stats.categories.map((item) => (
                  <option key={item.category} value={item.category}>
                    {t(item.category)} ({item.count.toLocaleString(locale)})
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{t("نوع الوثيقة")}</span>
              <select value={documentType} onChange={(event) => setDocumentType(event.target.value)}>
                <option value="">{t("كل الأنواع")}</option>
                {stats.types.map((item) => (
                  <option key={item.document_type} value={item.document_type}>
                    {t(item.document_type)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{t("السنة")}</span>
              <input
                type="number"
              inputMode="numeric"
                min="1800"
                max="2200"
                value={year}
                onChange={(event) => setYear(event.target.value)}
                placeholder={t("مثال 2025")}
              />
            </label>
          </div>
        </form>
        <div className="search-scope">
          <span className="live-dot online" />
          {t("البحث داخل")} {stats.documents ? stats.documents.toLocaleString(locale) : "—"} {t("وثيقة")} {t("و")} {stats.chunks ? stats.chunks.toLocaleString(locale) : "—"} {t("مقطع قانوني")}
        </div>
        {language !== "ar" && <div className="search-source-note">{t("النصوص القانونية ونتائج البحث تبقى بالعربية لأنها تعرض المصدر الرسمي كما هو.")}</div>}
      </section>

      {error && <div className="alert danger">{error}</div>}
      {loading && <LoadingState label="يفحص المحرك النصوص والمصادر ويرتّب النتائج..." />}

      {!loading && !searched && (
        <EmptyState
          title={t("اكتب المسألة بصياغة طبيعية")}
          text={t("يمكنك البحث برقم القانون أو موضوع الدفع أو عبارة من حكم تمييز. كل نتيجة ستظهر مع المصدر ودرجة جودة النص.")}
          action={
            <div className="starter-queries">
              {[
                "إلزام الخصم بتقديم أصل العقد",
                "وقف الدعوى لحين الفصل في الطعن",
                "أثر بطلان الإعلان على الخصومة",
                "حجية المحرر الإلكتروني",
              ].map((item) => (
                <button
                  key={item}
                  onClick={() => {
                    setQuery(item);
                    void performSearch(item);
                  }}
                >
                  {t(item)}
                </button>
              ))}
            </div>
          }
        />
      )}

      {!loading && searched && analysis && (
        <SearchAnalysisCard analysis={analysis} />
      )}

      {!loading && searched && !error && results.length === 0 && (
        <EmptyState
          title={t("لم نجد نتيجة مطابقة")}
          text={t("جرّب كلمات قانونية أقصر، أو احذف فلتر السنة والمجال، أو ابحث برقم القانون.")}
        />
      )}

      {!loading && results.length > 0 && (
        <section className="results-section">
          <div className="results-heading">
            <div>
              <span className="eyebrow">{t("نتائج مسندة")}</span>
              <h2>{results.length.toLocaleString(locale)} {t("نتيجة مرتبة حسب الصلة")}</h2>
            </div>
            <span className="results-note">{t("لا تعتمد النص دون فتح المصدر ومراجعته")}</span>
          </div>
          <div className="search-results">
            {results.map((result) => (
              <article className="result-card" key={result.id}>
                <div className="result-topline">
                  <div className="result-tags">
                    <span className="tag blue">{t(result.category)}</span>
                    <span className="tag">{t(result.documentType)}</span>
                    {result.lawYear && <span className="tag">{result.lawYear}</span>}
                    {result.amendmentAlert && <span className="tag orange">{t("تنبيه تعديل/إلغاء")}</span>}
                  </div>
                  <span className={"quality-pill " + (result.qualityScore >= 88 ? "high" : result.qualityScore >= 68 ? "medium" : "low")}>
                    {result.qualityScore}% · {t(result.qualityLabel)}
                  </span>
                </div>
                <h3>{result.title}</h3>
                <div className="result-source">
                  <span className={"source-mark " + (result.sourceType === "official_moj" ? "official" : "library")}>
                    {t(result.sourceType === "official_moj" ? "مصدر رسمي" : "ملف المكتب")}
                  </span>
                  <span>{result.officialSource}</span>
                  {result.reference && <span>· {result.reference}</span>}
                </div>
                <p className="result-excerpt legal-source-text" lang="ar" dir="rtl">{result.excerpt}</p>
                <div className="result-actions">
                  <button type="button" className="button subtle" onClick={() => onOpenSource(result.documentId)}>
                    {t("فتح المصدر")}
                  </button>
                  <button type="button" className="button subtle" onClick={() => onUseInMemo(result)}>
                    {t("استخدام في مذكرة")}
                  </button>
                  <button
                    type="button"
                    className="text-button"
                    onClick={async () => {
                      try {
                        await copyText(result.excerpt);
                        onToast(t("تم نسخ المقطع."));
                      } catch {
                        onToast(t("تعذّر النسخ"));
                      }
                    }}
                  >
                    {t("نسخ النص")}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SearchAnalysisCard({ analysis }: { analysis: SearchAnalysis }) {
  const { language, locale, t } = useI18n();
  return (
    <section className="analysis-card">
      <div className="analysis-title">
        <span className="analysis-mark">{language === "en" ? "AN" : language === "ur" ? "تج" : "تح"}</span>
        <div>
          <span className="eyebrow">{t("تحليل قوة الأدلة")}</span>
          <h2>{t("درجة الثقة الأولية")}: {t(analysis.confidence)}</h2>
        </div>
        <div className="analysis-score">{analysis.averageQuality}%</div>
      </div>
      <div className="analysis-grid">
        <div>
          <strong>{analysis.documentCount.toLocaleString(locale)}</strong>
          <span>{t("وثيقة مختلفة")}</span>
        </div>
        <div>
          <strong>{analysis.officialResultCount.toLocaleString(locale)}</strong>
          <span>{t("نتيجة من مصدر رسمي")}</span>
        </div>
        <div>
          <strong>{analysis.categories.length.toLocaleString(locale)}</strong>
          <span>{t("مجال قانوني متصل")}</span>
        </div>
      </div>
      <p className="evidence-note">{t(analysis.evidenceNote)}</p>
      {analysis.amendmentWarning && (
        <div className="alert warning">{t(analysis.amendmentWarning)}</div>
      )}
      <details>
        <summary>{t("فحوص ما قبل الاعتماد")}</summary>
        <ul>
          {analysis.nextChecks.map((item) => <li key={item}>{t(item)}</li>)}
        </ul>
      </details>
    </section>
  );
}

function LegalLibrary({
  stats,
  onSearch,
  onOpenSource,
}: {
  stats: LegalStats;
  onSearch: (query: string) => void;
  onOpenSource: (documentId: number) => void;
}) {
  const { locale, t } = useI18n();
  const [input, setInput] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDocuments() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        q: activeQuery,
        category,
        page: String(page),
      });
      const data = await readJson<{
        documents: DocumentRow[];
        total: number;
        page: number;
        pageSize: number;
      }>(await fetch("/api/legal/documents?" + params.toString()));
      setDocuments(data.documents);
      setTotal(data.total);
    } catch (loadError) {
      setError(t(loadError instanceof Error ? loadError.message : "تعذّر تحميل الوثائق"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Loading is intentionally keyed to the active server-side filters.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadDocuments();
  }, [activeQuery, category, page]); // eslint-disable-line react-hooks/exhaustive-deps

  function submit(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setActiveQuery(input.trim());
  }

  const totalPages = Math.max(1, Math.ceil(total / 20));
  return (
    <div className="library-page">
      <section className="library-summary">
        <div>
          <span className="eyebrow">{t("فهرس حيّ")}</span>
          <h2>{(stats.documents || total).toLocaleString(locale)} {t("الوثائق القانونية")}</h2>
          <p>{t("النصوص مصنفة موضوعياً، مع فصل المصدر الرسمي عن ملفات المكتب المستخرجة.")}</p>
        </div>
        <div className="library-metrics">
          <span><strong>{stats.officialDocuments.toLocaleString(locale)}</strong> {t("رسمي")}</span>
          <span><strong>{stats.libraryDocuments.toLocaleString(locale)}</strong> {t("ملف مكتب")}</span>
          <span><strong>{stats.categories.length.toLocaleString(locale)}</strong> {t("تصنيف")}</span>
        </div>
      </section>

      <section className="panel">
        <form className="library-toolbar" onSubmit={submit}>
          <VoiceInput
            value={input}
            onChange={(event) => setInput(event.target.value)}
            maxLength={240}
            placeholder={t("ابحث في عنوان الوثيقة أو ملخصها...")}
          />
          <select
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              setPage(1);
            }}
          >
            <option value="">{t("كل المجالات")}</option>
            {stats.categories.map((item) => (
              <option key={item.category} value={item.category}>{t(item.category)}</option>
            ))}
          </select>
          <button className="button primary">{t("تصفية")}</button>
        </form>

        {error && <div className="alert danger">{error}</div>}
        {loading ? (
          <LoadingState />
        ) : documents.length === 0 ? (
          <EmptyState title={t("لا توجد وثائق مطابقة")} text={t("غيّر كلمات البحث أو المجال.")} />
        ) : (
          <div className="document-list">
            {documents.map((document) => (
              <article className="document-card" key={document.id}>
                <div className="document-main">
                  <div className="document-icon">{document.document_type.slice(0, 2)}</div>
                  <div>
                    <div className="document-tags">
                      <span className="tag blue">{t(document.category)}</span>
                      <span className="tag">{t(document.document_type)}</span>
                      {document.law_year && <span className="tag">{document.law_year}</span>}
                    </div>
                    <h3>{document.title}</h3>
                    <p className="legal-source-text" lang="ar" dir="rtl">{document.summary || t("لم يُضف ملخص تحليلي لهذه الوثيقة بعد.")}</p>
                    <div className="document-meta">
                      <span>{document.page_count ? document.page_count.toLocaleString(locale) + " " + t("صفحة") : t("عدد الصفحات غير محدد")}</span>
                      <span>·</span>
                      <span>{document.official_source}</span>
                      <span className={"source-mark " + (document.source_type === "official_moj" ? "official" : "library")}>
                        {t(document.source_type === "official_moj" ? "رسمي" : "ملف المكتب")}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="document-actions">
                  <button type="button" className="button subtle" onClick={() => onSearch(document.title)}>
                    {t("بحث داخل الوثيقة")}
                  </button>
                  <button type="button" className="text-button" onClick={() => onOpenSource(document.id)}>
                    {t("فتح المصدر")}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="pagination">
          <button className="button subtle" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            {t("السابق")}
          </button>
          <span>{t("صفحة")} {page.toLocaleString(locale)} {t("من")} {totalPages.toLocaleString(locale)} · {total.toLocaleString(locale)} {t("وثيقة")}</span>
          <button className="button subtle" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            {t("التالي")}
          </button>
        </div>
      </section>
    </div>
  );
}

function LegalSourceDialog({
  documentId,
  onClose,
  onToast,
}: {
  documentId: number;
  onClose: () => void;
  onToast: (message: string) => void;
}) {
  const { locale, t } = useI18n();
  const [source, setSource] = useState<LegalSourceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useDialogFocus(onClose);

  const loadPage = useCallback(async (page: number, append = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setSource(null);
      setError("");
    }

    try {
      const params = new URLSearchParams({ id: String(documentId), page: String(page) });
      const data = await readJson<LegalSourceResponse>(
        await fetch("/api/legal/document?" + params.toString(), { cache: "no-store" }),
      );
      setSource((current) => (
        append && current
          ? { ...data, chunks: [...current.chunks, ...data.chunks] }
          : data
      ));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "تعذّر فتح المصدر");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [documentId]);

  useEffect(() => {
    // The dialog loads its initial source page as it mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPage(1);
  }, [loadPage]);

  const sourceDocument = source?.document;
  const officialUrl = sourceDocument
    ? resolveOfficialDocumentUrl({
        sourceUrl: sourceDocument.source_url,
        sourcePage: sourceDocument.source_page,
      })
    : null;

  return (
    <div className="modal-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={dialogRef} className="modal-card source-modal-card" role="dialog" aria-modal="true" aria-labelledby="legal-source-title" aria-describedby="legal-source-description" tabIndex={-1}>
        <div className="modal-heading">
          <div>
            <span className="eyebrow">{t("المصدر القانوني")}</span>
            <h2 id="legal-source-title">{sourceDocument?.title || t("فتح المصدر")}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} autoFocus aria-label={t("إغلاق")}>×</button>
        </div>

        {loading && <LoadingState label="جارٍ تحميل المصدر..." />}
        {error && <div className="alert danger" role="alert">{t(error)}</div>}

        {source && sourceDocument && (
          <div className="legal-source-viewer">
            <section className="source-overview">
              <div className="source-overview-meta">
                <span className={"source-mark " + (sourceDocument.source_type === "official_moj" ? "official" : "library")}>
                  {t(sourceDocument.source_type === "official_moj" ? "مصدر رسمي" : "ملف المكتب")}
                </span>
                <span>{sourceDocument.official_source}</span>
                {sourceDocument.law_number && sourceDocument.law_year && (
                  <span>{sourceDocument.law_number.toLocaleString(locale)} / {sourceDocument.law_year.toLocaleString(locale)}</span>
                )}
                {sourceDocument.page_count && <span>{sourceDocument.page_count.toLocaleString(locale)} {t("صفحة")}</span>}
              </div>
              {sourceDocument.summary && <p>{sourceDocument.summary}</p>}
              <p id="legal-source-description" className="source-disclaimer">
                {t(source.needsReindex
                  ? "أوقفنا عرض المقاطع غير الموثوقة من هذا المصدر. راجع النسخة الرسمية إلى أن تكتمل إعادة الفهرسة."
                  : "يعرض هذا القسم النص المفهرس من قاعدة القوانين داخل النظام. راجع النسخة الرسمية قبل الاقتباس أو الإيداع.")}
              </p>
            </section>

            {officialUrl ? (
              <section className="source-official-actions" aria-label={t("المصدر الرسمي")}>
                <a
                  className="button primary"
                  href={officialUrl}
                  // The installed Android web app can suppress a new-window
                  // PDF request. Navigate from this exact tap instead, which
                  // keeps the link user initiated and works in mobile WebView.
                  onClick={(event) => {
                    event.preventDefault();
                    window.location.assign(officialUrl);
                  }}
                >
                  {t("فتح النسخة الرسمية")}
                </a>
                <button
                  type="button"
                  className="button subtle"
                  onClick={async () => {
                    try {
                      await copyText(officialUrl);
                      onToast(t("تم نسخ رابط المصدر الرسمي."));
                    } catch {
                      onToast(t("تعذّر النسخ"));
                    }
                  }}
                >
                  {t("نسخ رابط المصدر الرسمي")}
                </button>
                <p className="source-open-note">
                  {t("يفتح الملف الرسمي مباشرة. استخدم زر الرجوع للعودة إلى النظام.")}
                </p>
              </section>
            ) : (
              <div className="alert warning">{t("لا يتوفر رابط خارجي موثوق لهذه الوثيقة.")}</div>
            )}

            <section className="source-chunks" aria-labelledby="indexed-source-text-title">
              {source.needsReindex && (
                <div className="alert warning" role="status">
                  {t("تم تعليق النص غير السليم من هذا المصدر حمايةً من الاقتباس الخاطئ.")}
                </div>
              )}
              <div className="source-chunks-heading">
                <div>
                  <span className="eyebrow">{t(source.needsReindex ? "النصوص التي اجتازت الفحص" : "النص المفهرس داخل المنصة")}</span>
                  <h3 id="indexed-source-text-title">{t(source.needsReindex ? "المقاطع المتاحة" : "المقاطع المفهرسة")}</h3>
                </div>
                <span>{source.totalChunks.toLocaleString(locale)} {t("مقطع قانوني")}</span>
              </div>

              {source.chunks.length > 0 ? (
                <div className="source-chunk-list">
                  {source.chunks.map((chunk) => (
                    <article className="source-chunk" key={chunk.id}>
                      <div className="source-chunk-meta">
                        <span>{t("المقطع")} {((chunk.chunk_index ?? 0) + 1).toLocaleString(locale)}</span>
                        {chunk.reference && <span>{chunk.reference}</span>}
                      </div>
                      <p className="legal-source-text" lang="ar" dir="rtl">
                        {chunk.text || t("لا يتوفر نص مفهرس قابل للعرض لهذه الوثيقة.")}
                      </p>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="source-empty-text">
                  {t(source.needsReindex
                    ? "هذا المصدر يحتاج إعادة فهرسة من النسخة الرسمية، لذلك أوقفنا عرض النص الحالي."
                    : "لا يتوفر نص مفهرس قابل للعرض لهذه الوثيقة.")}
                </p>
              )}

              {source.hasMore ? (
                <button
                  type="button"
                  className="button subtle source-more-button"
                  disabled={loadingMore}
                  onClick={() => void loadPage(source.page + 1, true)}
                >
                  {t(loadingMore ? "جارٍ تحميل البيانات..." : "تحميل المزيد")}
                </button>
              ) : source.chunks.length > 0 ? (
                <p className="source-complete-note">{t("تم عرض جميع المقاطع المفهرسة.")}</p>
              ) : null}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function ClientsPage({
  clients,
  loading,
  canManage,
  onEdit,
  onDelete,
  onAdd,
}: {
  clients: Client[];
  loading: boolean;
  canManage: boolean;
  onEdit: (record: Record<string, unknown>) => void;
  onDelete: (id: number) => void;
  onAdd: () => void;
}) {
  const { locale, t } = useI18n();
  const [query, setQuery] = useState("");
  const normalizedQuery = normalizeOfficeSearch(query);
  const filtered = clients.filter((client) =>
    normalizeOfficeSearch(client.name + " " + client.phone + " " + client.email)
      .includes(normalizedQuery),
  );
  return (
    <DataPanel
      title="سجل العملاء"
      search={query}
      onSearch={setQuery}
      searchPlaceholder="ابحث بالاسم أو الهاتف أو البريد..."
    >
      {loading ? <LoadingState /> : filtered.length === 0 ? (
        <EmptyState
          title={t("لا يوجد عملاء")}
          text={t("ابدأ بإضافة العميل وربطه بالقضايا والفواتير.")}
          action={canManage ? <button className="button primary" onClick={onAdd}>{t("إضافة عميل")}</button> : undefined}
        />
      ) : (
        <div className="responsive-table">
          <table>
            <thead><tr><th>{t("العميل")}</th><th>{t("الهاتف")}</th><th>{t("البريد")}</th><th>{t("ملاحظات")}</th>{canManage && <th>{t("الإجراء")}</th>}</tr></thead>
            <tbody>
              {filtered.map((client) => (
                <tr key={client.id}>
                  <td data-label={t("العميل")}><div className="cell-stack"><strong>{client.name}</strong><small>{t("منذ")} {formatDate(client.createdAt, locale)}</small></div></td>
                  <td data-label={t("الهاتف")}>{client.phone || "—"}</td>
                  <td data-label={t("البريد")}>{client.email || "—"}</td>
                  <td data-label={t("ملاحظات")}>{client.notes || "—"}</td>
                  {canManage && <td data-label={t("الإجراء")}><RowActions onEdit={() => onEdit(client as unknown as Record<string, unknown>)} onDelete={() => onDelete(client.id)} /></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DataPanel>
  );
}

function CasesPage({
  cases,
  loading,
  canManage,
  onEdit,
  onDelete,
  onAdd,
}: {
  cases: LegalCase[];
  loading: boolean;
  canManage: boolean;
  onEdit: (record: Record<string, unknown>) => void;
  onDelete: (id: number) => void;
  onAdd: () => void;
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const normalizedQuery = normalizeOfficeSearch(query);
  const filtered = cases.filter(
    (item) =>
      (!status || item.status === status) &&
      normalizeOfficeSearch(item.caseNumber + " " + (item.clientName || "") + " " + item.opposingParty)
        .includes(normalizedQuery),
  );
  return (
    <DataPanel
      title="سجل القضايا"
      search={query}
      onSearch={setQuery}
      searchPlaceholder="ابحث برقم القضية أو العميل أو الخصم..."
      extra={
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">{t("كل الحالات")}</option>
          {Object.entries(CASE_STATUS).map(([key, value]) => <option key={key} value={key}>{t(value.label)}</option>)}
        </select>
      }
    >
      {loading ? <LoadingState /> : filtered.length === 0 ? (
        <EmptyState title={t("لا توجد قضايا")} text={t("أضف أول قضية واربطها بالعميل.")} action={canManage ? <button className="button primary" onClick={onAdd}>{t("إضافة قضية")}</button> : undefined} />
      ) : (
        <div className="responsive-table">
          <table>
            <thead><tr><th>{t("رقم القضية")}</th><th>{t("العميل")}</th><th>{t("المحكمة")}</th><th>{t("الخصم")}</th><th>{t("الحالة")}</th>{canManage && <th>{t("الإجراء")}</th>}</tr></thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td data-label={t("رقم القضية")}><div className="cell-stack"><strong>{item.caseNumber}</strong><small>{item.type || t("نوع غير محدد")}</small></div></td>
                  <td data-label={t("العميل")}>{item.clientName || "—"}</td>
                  <td data-label={t("المحكمة")}>{item.court || "—"}</td>
                  <td data-label={t("الخصم")}>{item.opposingParty || "—"}</td>
                  <td data-label={t("الحالة")}><StatusBadge value={item.status} map={CASE_STATUS} /></td>
                  {canManage && <td data-label={t("الإجراء")}><RowActions onEdit={() => onEdit(item as unknown as Record<string, unknown>)} onDelete={() => onDelete(item.id)} /></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DataPanel>
  );
}

function HearingsPage({
  hearings,
  loading,
  canManage,
  onEdit,
  onDelete,
  onAdd,
}: {
  hearings: Hearing[];
  loading: boolean;
  canManage: boolean;
  onEdit: (record: Record<string, unknown>) => void;
  onDelete: (id: number) => void;
  onAdd: () => void;
}) {
  const { locale, t } = useI18n();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const normalizedQuery = normalizeOfficeSearch(query);
  const filtered = hearings.filter((item) =>
    (!status || item.status === status) &&
    normalizeOfficeSearch(`${item.title} ${item.caseNumber || ""} ${item.location}`)
      .includes(normalizedQuery),
  );
  return (
    <div className="panel">
      <div className="panel-heading">
        <div><span className="eyebrow">{t("الجدول الزمني")}</span><h2>{t("الجلسات والمهام")}</h2></div>
      </div>
      <div className="data-toolbar">
        <VoiceInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("ابحث بالعنوان أو القضية أو المكان...")} aria-label={t("ابحث بالعنوان أو القضية أو المكان...")} />
        <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label={t("الحالة")}>
          <option value="">{t("كل الحالات")}</option>
          <option value="pending">{t("قادمة")}</option>
          <option value="done">{t("منتهية")}</option>
        </select>
      </div>
      {loading ? <LoadingState /> : filtered.length === 0 ? (
        <EmptyState title={hearings.length ? t("لا توجد نتائج مطابقة") : t("لا توجد مواعيد")} text={hearings.length ? t("غيّر كلمات البحث أو الحالة.") : t("أضف جلسة أو مهمة مرتبطة بالقضية.")} action={hearings.length || !canManage ? undefined : <button type="button" className="button primary" onClick={onAdd}>{t("إضافة موعد")}</button>} />
      ) : (
        <div className="timeline-list">
          {filtered.map((item) => (
            <article className="timeline-item" key={item.id}>
              <div className="date-block">
                <strong>{new Date(item.date + "T00:00:00").toLocaleDateString(locale, { day: "2-digit" })}</strong>
                <span>{new Date(item.date + "T00:00:00").toLocaleDateString(locale, { month: "short" })}</span>
              </div>
              <div className="timeline-copy">
                <div className="timeline-title">
                  <span className={"tag " + (item.kind === "hearing" ? "blue" : "")}>{t(item.kind === "hearing" ? "جلسة" : "مهمة")}</span>
                  <h3>{item.title}</h3>
                </div>
                <p>{item.caseNumber || t("بدون قضية مرتبطة")} {item.location ? "· " + item.location : ""}</p>
                <small>{item.time || t("الوقت غير محدد")} · {t(item.status === "done" ? "منتهية" : "قادمة")}</small>
              </div>
              {canManage && <RowActions onEdit={() => onEdit(item as unknown as Record<string, unknown>)} onDelete={() => onDelete(item.id)} />}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function InvoicesPage({
  invoices,
  currency,
  loading,
  canManage,
  onEdit,
  onDelete,
  onAdd,
}: {
  invoices: Invoice[];
  currency: string;
  loading: boolean;
  canManage: boolean;
  onEdit: (record: Record<string, unknown>) => void;
  onDelete: (id: number) => void;
  onAdd: () => void;
}) {
  const { locale, t } = useI18n();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const normalizedQuery = normalizeOfficeSearch(query);
  const total = invoices.reduce((sum, item) => sum + Number(item.amountFils), 0);
  const paid = invoices.filter((item) => item.status === "paid").reduce((sum, item) => sum + Number(item.amountFils), 0);
  const filtered = invoices.filter((item) =>
    (!status || item.status === status) &&
    normalizeOfficeSearch(`${item.description} ${item.clientName || ""} ${item.caseNumber || ""}`)
      .includes(normalizedQuery),
  );
  return (
    <div className="stack-page">
      <div className="invoice-summary">
        <KpiCard label={t("إجمالي الفواتير")} value={formatMoney(total, currency, locale)} note={invoices.length.toLocaleString(locale) + " " + t("فاتورة")} accent="blue" />
        <KpiCard label={t("المحصّل")} value={formatMoney(paid, currency, locale)} note={total ? Math.round((paid / total) * 100).toLocaleString(locale) + "% " + t("من الإجمالي") : t("لا توجد فواتير")} accent="green" />
        <KpiCard label={t("غير المحصّل")} value={formatMoney(total - paid, currency, locale)} note={t("يتطلب متابعة التحصيل")} accent="orange" />
      </div>
      <div className="panel">
        <div className="panel-heading"><div><span className="eyebrow">{t("الأتعاب")}</span><h2>{t("سجل الفواتير")}</h2></div></div>
        <div className="data-toolbar">
          <VoiceInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("ابحث بالوصف أو العميل أو القضية...")} aria-label={t("ابحث بالوصف أو العميل أو القضية...")} />
          <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label={t("الحالة")}>
            <option value="">{t("كل الحالات")}</option>
            {Object.entries(INVOICE_STATUS).map(([key, value]) => <option key={key} value={key}>{t(value.label)}</option>)}
          </select>
        </div>
        {loading ? <LoadingState /> : filtered.length === 0 ? (
          <EmptyState title={invoices.length ? t("لا توجد نتائج مطابقة") : t("لا توجد فواتير")} text={invoices.length ? t("غيّر كلمات البحث أو الحالة.") : t("أنشئ أول فاتورة واربطها بالعميل والقضية.")} action={invoices.length || !canManage ? undefined : <button type="button" className="button primary" onClick={onAdd}>{t("إنشاء فاتورة")}</button>} />
        ) : (
          <div className="responsive-table">
            <table>
              <thead><tr><th>{t("الوصف")}</th><th>{t("العميل")}</th><th>{t("القضايا")}</th><th>{t("المبلغ")}</th><th>{t("الاستحقاق")}</th><th>{t("الحالة")}</th>{canManage && <th>{t("الإجراء")}</th>}</tr></thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <td data-label={t("الوصف")}><div className="cell-stack"><strong>{item.description || t("فاتورة أتعاب")}</strong><small>{formatDate(item.issueDate, locale)}</small></div></td>
                    <td data-label={t("العميل")}>{item.clientName || "—"}</td>
                    <td data-label={t("القضايا")}>{item.caseNumber || "—"}</td>
                    <td data-label={t("المبلغ")}><strong>{formatMoney(item.amountFils, currency, locale)}</strong></td>
                    <td data-label={t("الاستحقاق")}>{formatDate(item.dueDate, locale)}</td>
                    <td data-label={t("الحالة")}><StatusBadge value={item.status} map={INVOICE_STATUS} /></td>
                    {canManage && <td data-label={t("الإجراء")}><RowActions onEdit={() => onEdit(item as unknown as Record<string, unknown>)} onDelete={() => onDelete(item.id)} /></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function MemoGenerator({
  initialBasis,
  cases,
  memos,
  onGenerated,
  onDelete,
  onToast,
  canManage,
}: {
  initialBasis: string;
  cases: LegalCase[];
  memos: Memo[];
  onGenerated: () => Promise<void>;
  onDelete: (id: number) => void;
  onToast: (message: string) => void;
  canManage: boolean;
}) {
  const { locale, t } = useI18n();
  const [basis, setBasis] = useState(initialBasis);
  const [output, setOutput] = useState("");
  const [citations, setCitations] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage) return;
    const form = new FormData(event.currentTarget);
    setLoading(true);
    setError("");
    try {
      const data = await readJson<{
        memo: { title: string; content: string; citations: Array<Record<string, unknown>> };
        warning: string;
      }>(
        await fetch("/api/memo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: form.get("title"),
            memoType: form.get("memoType"),
            court: form.get("court"),
            caseId: form.get("caseId"),
            facts: form.get("facts"),
            legalBasis: basis,
            requests: form.get("requests"),
          }),
        }),
      );
      setOutput(data.memo.content);
      setCitations(data.memo.citations);
      onToast(t(data.warning));
      await onGenerated();
    } catch (generateError) {
      setError(t(generateError instanceof Error ? generateError.message : "تعذّر إنشاء المذكرة"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="memo-page">
      <div className="memo-warning">
        <span>{t("تنبيه مهني")}</span>
        {t("المسودة ترتكز إلى البحث في قاعدة القوانين، لكنها لا تستبدل مراجعة المحامي للنص النافذ والملف والأصل الرسمي.")}
      </div>
      {!canManage && <div className="alert info">{t("يمكنك مراجعة المذكرات المحفوظة، لكن توليد أو حذف المذكرات غير متاح لصلاحيتك.")}</div>}
      <div className="memo-layout">
        <form className="panel memo-form" onSubmit={submit}>
          <div className="panel-heading"><div><span className="eyebrow">{t("المدخلات")}</span><h2>{t("بيانات المذكرة")}</h2></div></div>
          <label><span>{t("عنوان المذكرة")}</span><VoiceInput name="title" placeholder={t("مذكرة دفاع في الدعوى رقم...")} required /></label>
          <div className="form-grid">
            <label><span>{t("النوع")}</span><select name="memoType"><option value="دفاع">{t("دفاع")}</option><option value="رد">{t("رد")}</option><option value="استئناف">{t("استئناف")}</option><option value="تمييز">{t("تمييز")}</option><option value="طلب">{t("طلب")}</option></select></label>
            <label><span>{t("القضية المرتبطة")}</span><select name="caseId"><option value="">{t("بدون ربط")}</option>{cases.map((item) => <option key={item.id} value={item.id}>{item.caseNumber}</option>)}</select></label>
          </div>
          <label><span>{t("المحكمة")}</span><VoiceInput name="court" placeholder={t("المحكمة الكلية — الدائرة التجارية")} /></label>
          <label><span>{t("الوقائع")}</span><VoiceTextarea name="facts" rows={6} placeholder={t("اكتب الوقائع المؤثرة قانوناً بترتيب زمني...")} /></label>
          <label>
            <span>{t("السند القانوني أو كلمات البحث")}</span>
            <VoiceTextarea
              name="legalBasis"
              rows={6}
              value={basis}
              onChange={(event) => setBasis(event.target.value)}
              placeholder={t("مثال: إلزام الخصم بتقديم أصل العقد وحجية الصورة الضوئية")}
            />
          </label>
          <label><span>{t("الطلبات")}</span><VoiceTextarea name="requests" rows={4} placeholder={t("أصلياً واحتياطياً...")} /></label>
          {error && <div className="alert danger">{error}</div>}
          <button className="button primary full" disabled={loading || !canManage}>
            {t(loading ? "يبحث ويبني المسودة..." : "توليد مسودة مسندة")}
          </button>
        </form>

        <section className="panel memo-output-panel">
          <div className="panel-heading">
            <div><span className="eyebrow">{t("المخرج")}</span><h2>{t("المسودة")}</h2></div>
            {output && (
              <div className="inline-actions">
                <button type="button" className="text-button" onClick={async () => { try { await copyText(output); onToast(t("تم نسخ المذكرة.")); } catch { onToast(t("تعذّر النسخ")); } }}>{t("نسخ")}</button>
                <button type="button" className="text-button" onClick={() => window.print()}>{t("طباعة")}</button>
              </div>
            )}
          </div>
          {loading ? <LoadingState label="يطابق الوقائع مع المصادر القانونية..." /> : output ? (
            <>
              <pre className="memo-output legal-source-text" lang="ar" dir="rtl">{output}</pre>
              {citations.length > 0 && (
                <div className="citation-summary">
                  <strong>{t("المصادر المرتبطة بالمسودة")}</strong>
                  <ol>
                    {citations.map((citation, index) => (
                      <li key={index}>
                        {String(citation.title || "")}
                        <span>{String(citation.officialSource || "")} · {t("فحص")} {String(citation.qualityScore || "")}%</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </>
          ) : (
            <EmptyState title={t("ستظهر المسودة هنا")} text={t("أدخل الوقائع والسند. سيبحث النظام في قاعدة القوانين قبل بناء النص.")} />
          )}
        </section>
      </div>

      <section className="panel memo-archive">
        <div className="panel-heading"><div><span className="eyebrow">{t("الأرشيف")}</span><h2>{t("المذكرات المحفوظة")}</h2></div></div>
        {memos.length === 0 ? <p className="muted-line">{t("لا توجد مذكرات محفوظة بعد.")}</p> : (
          <div className="archive-grid">
            {memos.slice(0, 12).map((memo) => (
              <article key={memo.id}>
                <span className="tag blue">{memo.memoType}</span>
                <h3>{memo.title}</h3>
                <p className="legal-source-text" lang="ar" dir="rtl">{memo.content.slice(0, 180)}...</p>
                <small>{formatDate(memo.createdAt, locale)}</small>
                <div className="inline-actions">
                  <button type="button" className="text-button" onClick={() => { setOutput(memo.content); window.scrollTo({ top: 0, behavior: "auto" }); }}>{t("فتح")}</button>
                  {canManage && <button type="button" className="text-button danger-text" onClick={() => onDelete(memo.id)}>{t("حذف")}</button>}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SettingsPage({
  office,
  theme,
  onThemeChange,
  onSaved,
  onToast,
  stats,
  canManageSettings,
  canManageMembers,
}: {
  office: OfficeData;
  theme: "light" | "dark";
  onThemeChange: (theme: "light" | "dark") => void;
  onSaved: () => Promise<void>;
  onToast: (message: string) => void;
  stats: LegalStats;
  canManageSettings: boolean;
  canManageMembers: boolean;
}) {
  const { language, locale, setLanguage, t } = useI18n();
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManageSettings) return;
    const form = new FormData(event.currentTarget);
    setSaving(true);
    try {
      await readJson(
        await fetch("/api/office", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resource: "settings",
            data: { officeName: form.get("officeName"), currency: form.get("currency") },
          }),
        }),
      );
      await onSaved();
      onToast(t("تم حفظ إعدادات المكتب."));
    } catch (error) {
      onToast(t(error instanceof Error ? error.message : "تعذّر الحفظ"));
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="settings-grid">
      <form className="panel" onSubmit={submit}>
        <div className="panel-heading"><div><span className="eyebrow">{t("الهوية")}</span><h2>{t("بيانات المكتب")}</h2></div></div>
        <label><span>{t("اسم المكتب")}</span><VoiceInput name="officeName" defaultValue={office.settings.officeName} disabled={!canManageSettings} /></label>
        <label><span>{t("العملة")}</span><select name="currency" defaultValue={office.settings.currency} disabled={!canManageSettings}><option value="KWD">{t("دينار كويتي (KWD)")}</option><option value="USD">{t("دولار أمريكي (USD)")}</option><option value="SAR">{t("ريال سعودي (SAR)")}</option></select></label>
        {canManageSettings ? (
          <button className="button primary" disabled={saving}>{t(saving ? "جارٍ الحفظ..." : "حفظ البيانات")}</button>
        ) : <p className="muted-line">{t("هذه الإعدادات متاحة للعرض فقط وفق صلاحيتك.")}</p>}
      </form>
      <section className="panel">
        <div className="panel-heading"><div><span className="eyebrow">{t("العرض")}</span><h2>{t("المظهر")}</h2></div></div>
        <label className="settings-language">
          <span>{t("اللغة")}</span>
          <select value={language} onChange={(event) => setLanguage(event.target.value as Language)}>
            <option value="ar">العربية</option>
            <option value="en">English</option>
            <option value="ur">اردو</option>
          </select>
        </label>
        <div className="theme-options">
          <button className={theme === "light" ? "selected" : ""} onClick={() => onThemeChange("light")}><span className="theme-preview light" /><strong>{t("فاتح")}</strong></button>
          <button className={theme === "dark" ? "selected" : ""} onClick={() => onThemeChange("dark")}><span className="theme-preview dark" /><strong>{t("داكن")}</strong></button>
        </div>
      </section>
      <section className="panel span-two">
        <div className="panel-heading"><div><span className="eyebrow">{t("بيانات قانونية")}</span><h2>{t("حالة الفهرسة")}</h2></div></div>
        <div className="index-health">
          <div><span>{t("الوثائق الجاهزة")}</span><strong>{stats.documents.toLocaleString(locale)}</strong></div>
          <div><span>{t("المقاطع القابلة للبحث")}</span><strong>{stats.chunks.toLocaleString(locale)}</strong></div>
          <div><span>{t("مصادر وزارة العدل")}</span><strong>{stats.officialDocuments.toLocaleString(locale)}</strong></div>
          <div><span>{t("آخر بناء للفهرس")}</span><strong>{stats.indexedAt ? formatDate(stats.indexedAt, locale) : "—"}</strong></div>
        </div>
        <div className="alert info">
          {t("تحديث ملفات «قوانين» في التخزين لا يحدّث الفهرس تلقائياً في هذه النسخة؛ يجب تشغيل دورة استخراج وفحص قبل إدخال الملفات الجديدة إلى البحث.")}
        </div>
      </section>
      <MembersPanel canManage={canManageMembers} onToast={onToast} />
    </div>
  );
}

function MembersPanel({
  canManage,
  onToast,
}: {
  canManage: boolean;
  onToast: (message: string) => void;
}) {
  const { locale, t } = useI18n();
  const [members, setMembers] = useState<OfficeMember[]>([]);
  const [activeMemberCount, setActiveMemberCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadMembers() {
    setLoading(true);
    setError("");
    try {
      const data = await readJson<{
        members: OfficeMember[];
        seatLimit: number;
        activeMemberCount: number;
      }>(await fetch("/api/office/members", { cache: "no-store" }));
      setMembers(data.members);
      setActiveMemberCount(data.activeMemberCount);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "تعذّر تحميل أعضاء المكتب.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadMembers();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage) return;
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError("");
    try {
      const response = await readJson<{ message?: string }>(
        await fetch("/api/office/members", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            displayName: form.get("displayName"),
            email: form.get("email"),
            role: form.get("role"),
          }),
        }),
      );
      event.currentTarget.reset();
      onToast(t(response.message || "تمت إضافة العضو."));
      await loadMembers();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "تعذّرت إضافة عضو المكتب.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel span-two member-management">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">{t("الفريق")}</span>
          <h2>{t("أعضاء المكتب والصلاحيات")}</h2>
        </div>
        <span className="seat-badge">{activeMemberCount.toLocaleString(locale)} {t("عضو نشط")}</span>
      </div>
      <p className="muted-line">{t("تُربط العضوية بالبريد المستخدم عند تسجيل الدخول، ولا تُرسل المنصة دعوات بريدية تلقائياً في هذه المرحلة.")}</p>
      {error && <div className="alert danger">{t(error)}</div>}
      {canManage && (
        <form className="member-form" onSubmit={addMember}>
          <VoiceInput name="displayName" maxLength={180} placeholder={t("اسم العضو")}/>
          <VoiceInput name="email" type="email" required maxLength={180} placeholder={t("البريد الإلكتروني للعضو")}/>
          <select name="role" defaultValue="lawyer">
            <option value="lawyer">{t("محامٍ")}</option>
            <option value="secretary">{t("سكرتير")}</option>
            <option value="finance">{t("مالية")}</option>
            <option value="viewer">{t("عرض فقط")}</option>
            <option value="admin">{t("مدير")}</option>
          </select>
          <button className="button primary" disabled={saving}>{t(saving ? "جارٍ الحفظ..." : "إضافة عضو")}</button>
        </form>
      )}
      {loading ? <LoadingState /> : members.length === 0 ? (
        <EmptyState title={t("لا يوجد أعضاء")} text={t("أضف أعضاء المكتب وحدد صلاحياتهم.")} />
      ) : (
        <div className="responsive-table members-table">
          <table>
            <thead><tr><th>{t("الاسم")}</th><th>{t("البريد")}</th><th>{t("الدور")}</th><th>{t("الحالة")}</th>{canManage && <th>{t("الإجراء")}</th>}</tr></thead>
            <tbody>
              {members.map((member) => (
                <MemberRow key={`${member.id}:${member.role}:${member.status}`} member={member} canManage={canManage} onChanged={loadMembers} onToast={onToast} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function MemberRow({
  member,
  canManage,
  onChanged,
  onToast,
}: {
  member: OfficeMember;
  canManage: boolean;
  onChanged: () => Promise<void>;
  onToast: (message: string) => void;
}) {
  const { t } = useI18n();
  const [role, setRole] = useState(member.role);
  const [status, setStatus] = useState(member.status);
  const [saving, setSaving] = useState(false);
  const canEdit = canManage && member.role !== "owner";

  async function save() {
    if (!canEdit) return;
    setSaving(true);
    try {
      await readJson(
        await fetch("/api/office/members", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: member.id, role, status }),
        }),
      );
      onToast(t("تم تحديث صلاحية العضو."));
      await onChanged();
    } catch (error) {
      onToast(t(error instanceof Error ? error.message : "تعذّر تحديث العضو."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <tr>
      <td data-label={t("الاسم")}><strong>{member.displayName || "—"}</strong></td>
      <td data-label={t("البريد")}>{member.email}</td>
      <td data-label={t("الدور")}>
        {canEdit ? (
          <select value={role} onChange={(event) => setRole(event.target.value as ActiveOffice["role"])}>
            <option value="admin">{t("مدير")}</option>
            <option value="lawyer">{t("محامٍ")}</option>
            <option value="secretary">{t("سكرتير")}</option>
            <option value="finance">{t("مالية")}</option>
            <option value="viewer">{t("عرض فقط")}</option>
          </select>
        ) : t(member.role === "owner" ? "مالك المكتب" : member.role)}
      </td>
      <td data-label={t("الحالة")}>
        {canEdit ? (
          <select value={status} onChange={(event) => setStatus(event.target.value as "active" | "inactive")}>
            <option value="active">{t("نشط")}</option>
            <option value="inactive">{t("موقوف")}</option>
          </select>
        ) : t(member.status === "active" ? "نشط" : "موقوف")}
      </td>
      {canManage && <td data-label={t("الإجراء")}>{canEdit ? <button type="button" className="small-button" disabled={saving} onClick={() => void save()}>{t(saving ? "جارٍ الحفظ..." : "حفظ")}</button> : <span className="muted-line">{t("مالك")}</span>}</td>}
    </tr>
  );
}

function AccessGate({ signInPath }: { signInPath: string }) {
  const { t } = useI18n();
  return (
    <main className="access-shell">
      <section className="access-card" aria-labelledby="access-title">
        <div className="brand-mark" aria-hidden="true">ق</div>
        <span className="eyebrow">{t("منصة إدارة مكاتب المحاماة")}</span>
        <h1 id="access-title">{t("دخول مباشر إلى المنصة")}</h1>
        <p>{t("سجّل الدخول فقط لفتح مساحة عمل قانونية مستقلة تُنشأ لك تلقائياً.")}</p>
        <a className="button primary access-action" href={signInPath}>{t("تسجيل الدخول")}</a>
        <small>{t("لا تُعرض بيانات أي مستخدم لغيره.")}</small>
      </section>
    </main>
  );
}

function AccountLoadingGate() {
  const { t } = useI18n();
  return <main className="access-shell"><section className="access-card compact"><LoadingState label={t("جارٍ تجهيز مساحة العمل...")} /></section></main>;
}

function AccountProblemGate({
  message,
  signOutPath,
  onRetry,
}: {
  message: string;
  signOutPath: string;
  onRetry: () => Promise<void>;
}) {
  const { t } = useI18n();
  return (
    <main className="access-shell"><section className="access-card compact">
      <span className="eyebrow">{t("تعذّر الوصول")}</span>
      <h1>{t("لا يمكن فتح مساحة المكتب الآن")}</h1>
      <p>{t(message)}</p>
      <div className="inline-actions"><button className="button primary" onClick={() => void onRetry()}>{t("إعادة المحاولة")}</button><a className="button subtle" href={signOutPath}>{t("تسجيل الخروج")}</a></div>
    </section></main>
  );
}

function PlatformAdminPage({ onSessionRefresh }: { onSessionRefresh: () => Promise<void> }) {
  const { t } = useI18n();
  const [offices, setOffices] = useState<SubscriptionOffice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadOffices() {
    setLoading(true);
    setError("");
    try {
      const data = await readJson<{ offices: SubscriptionOffice[] }>(
        await fetch("/api/admin/offices", { cache: "no-store" }),
      );
      setOffices(data.offices);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "تعذّر تحميل اشتراكات المكاتب.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadOffices();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function createOffice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const data = await readJson<{ office: { name: string } }>(
        await fetch("/api/admin/offices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.get("name"),
            ownerName: form.get("ownerName"),
            ownerEmail: form.get("ownerEmail"),
            plan: form.get("plan"),
            subscriptionStatus: form.get("subscriptionStatus"),
            seatLimit: form.get("seatLimit"),
            endsAt: form.get("endsAt"),
            graceUntil: form.get("graceUntil"),
          }),
        }),
      );
      event.currentTarget.reset();
      setNotice(`${t("تم إنشاء المكتب")}: ${data.office.name}`);
      await Promise.all([loadOffices(), onSessionRefresh()]);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "تعذّر إنشاء المكتب.");
    } finally {
      setSaving(false);
    }
  }

  const content = (
    <div className="platform-admin">
      <div className="admin-heading">
        <div><span className="eyebrow">{t("إدارة المنصة")}</span><h1>{t("اشتراكات المكاتب")}</h1><p>{t("إنشاء مكتب منفصل، تحديد الخطة والمقاعد، وإيقاف الاشتراك عند الحاجة.")}</p></div>
      </div>
      <section className="panel provision-office">
        <div className="panel-heading"><div><span className="eyebrow">{t("مكتب جديد")}</span><h2>{t("إضافة مكتب مشترك")}</h2></div></div>
        <p className="muted-line">{t("سيصبح صاحب المكتب مالكاً لحسابه عند تسجيل الدخول بالبريد ذاته. الفوترة اليدوية مقصودة حتى ربط بوابة دفع لاحقاً.")}</p>
        <form className="provision-form" onSubmit={createOffice}>
          <VoiceInput name="name" required maxLength={180} placeholder={t("اسم المكتب")}/>
          <VoiceInput name="ownerName" maxLength={180} placeholder={t("اسم مالك المكتب")}/>
          <VoiceInput name="ownerEmail" type="email" required maxLength={180} placeholder={t("بريد مالك المكتب")}/>
          <select name="plan" defaultValue="starter"><option value="starter">{t("أساسية")}</option><option value="professional">{t("احترافية")}</option><option value="enterprise">{t("مؤسسات")}</option></select>
          <select name="subscriptionStatus" defaultValue="trial"><option value="trial">{t("تجريبية")}</option><option value="active">{t("نشطة")}</option><option value="suspended">{t("معلّقة")}</option></select>
          <input name="seatLimit" type="number" min="1" max="500" defaultValue="3" aria-label={t("عدد المقاعد")}/>
          <label><span>{t("تاريخ الانتهاء")}</span><input name="endsAt" type="date" /></label>
          <label><span>{t("فترة السماح حتى")}</span><input name="graceUntil" type="date" /></label>
          <button className="button primary" disabled={saving}>{t(saving ? "جارٍ الحفظ..." : "إنشاء المكتب")}</button>
        </form>
      </section>
      {error && <div className="alert danger">{t(error)}</div>}
      {notice && <div className="alert success">{notice}</div>}
      <section className="panel subscription-list">
        <div className="panel-heading"><div><span className="eyebrow">{t("المكاتب")}</span><h2>{t("المكاتب المسجلة")}</h2></div><button type="button" className="button subtle" onClick={() => void loadOffices()}>{t("تحديث")}</button></div>
        {loading ? <LoadingState /> : offices.length === 0 ? <EmptyState title={t("لا توجد مكاتب مشتركة")} text={t("أنشئ أول مكتب من النموذج أعلاه.")} /> : (
          <div className="responsive-table subscription-table"><table>
            <thead><tr><th>{t("المكتب")}</th><th>{t("المالك")}</th><th>{t("الاشتراك")}</th><th>{t("المقاعد")}</th><th>{t("تاريخ الانتهاء")}</th><th>{t("الإجراء")}</th></tr></thead>
            <tbody>{offices.map((office) => <SubscriptionRow key={`${office.id}:${office.plan}:${office.subscriptionStatus}:${office.seatLimit}:${office.endsAt}:${office.graceUntil}`} office={office} onChanged={loadOffices} />)}</tbody>
          </table></div>
        )}
      </section>
    </div>
  );

  return content;
}

function SubscriptionRow({ office, onChanged }: { office: SubscriptionOffice; onChanged: () => Promise<void> }) {
  const { locale, t } = useI18n();
  const [plan, setPlan] = useState(office.plan);
  const [subscriptionStatus, setSubscriptionStatus] = useState(office.subscriptionStatus);
  const [seatLimit, setSeatLimit] = useState(String(office.seatLimit));
  const [endsAt, setEndsAt] = useState(office.endsAt || "");
  const [graceUntil, setGraceUntil] = useState(office.graceUntil || "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await readJson(await fetch("/api/admin/offices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: office.id, plan, subscriptionStatus, seatLimit, endsAt, graceUntil }),
      }));
      await onChanged();
    } finally {
      setSaving(false);
    }
  }

  return (
    <tr>
      <td data-label={t("المكتب")}><strong>{office.name}</strong><small>{formatDate(office.createdAt, locale)}</small></td>
      <td data-label={t("المالك")} dir="ltr">{office.ownerEmail || "—"}</td>
      <td data-label={t("الاشتراك")}><div className="subscription-selects"><select value={plan} onChange={(event) => setPlan(event.target.value)}><option value="starter">{t("أساسية")}</option><option value="professional">{t("احترافية")}</option><option value="enterprise">{t("مؤسسات")}</option></select><select value={subscriptionStatus} onChange={(event) => setSubscriptionStatus(event.target.value)}><option value="trial">{t("تجريبية")}</option><option value="active">{t("نشطة")}</option><option value="suspended">{t("معلّقة")}</option></select></div></td>
      <td data-label={t("المقاعد")}><input type="number" min="1" max="500" value={seatLimit} onChange={(event) => setSeatLimit(event.target.value)} /><small>{office.memberCount.toLocaleString(locale)} {t("مستخدم")}</small></td>
      <td data-label={t("تاريخ الانتهاء")}><input type="date" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} /><input type="date" value={graceUntil} onChange={(event) => setGraceUntil(event.target.value)} aria-label={t("فترة السماح حتى")} /></td>
      <td data-label={t("الإجراء")}><button type="button" className="small-button" disabled={saving} onClick={() => void save()}>{t(saving ? "جارٍ الحفظ..." : "حفظ")}</button></td>
    </tr>
  );
}

function DataPanel({
  title,
  search,
  onSearch,
  searchPlaceholder,
  extra,
  children,
}: {
  title: string;
  search: string;
  onSearch: (value: string) => void;
  searchPlaceholder: string;
  extra?: ReactNode;
  children: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <section className="panel data-panel">
      <div className="panel-heading"><div><span className="eyebrow">{t("الإدارة")}</span><h2>{t(title)}</h2></div></div>
      <div className="data-toolbar">
        <VoiceInput value={search} onChange={(event) => onSearch(event.target.value)} placeholder={t(searchPlaceholder)} />
        {extra}
      </div>
      {children}
    </section>
  );
}

function RowActions({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="row-actions">
      <button type="button" className="small-button" onClick={onEdit}>{t("تعديل")}</button>
      <button type="button" className="small-button danger-text" onClick={onDelete}>{t("حذف")}</button>
    </div>
  );
}

function useDialogFocus(onClose: () => void) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const focusable = () => Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) ?? [],
    ).filter((element) => !element.hasAttribute("hidden"));
    const frame = window.requestAnimationFrame(() => {
      const dialog = dialogRef.current;
      const autofocus = dialog?.querySelector<HTMLElement>("[autofocus]");
      (autofocus ?? focusable()[0] ?? dialog)?.focus();
    });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const targets = focusable();
      if (!targets.length) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }
      const first = targets[0];
      const last = targets[targets.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, []);

  return dialogRef;
}

function ConfirmDialog({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const { t } = useI18n();
  const [deleting, setDeleting] = useState(false);
  const closeDialog = () => {
    if (!deleting) onClose();
  };
  const dialogRef = useDialogFocus(closeDialog);

  async function confirmDeletion() {
    setDeleting(true);
    try {
      await onConfirm();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="modal-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog(); }}>
      <div ref={dialogRef} className="modal-card confirm-card" role="alertdialog" aria-modal="true" aria-labelledby="delete-confirmation-title" aria-describedby="delete-confirmation-copy" tabIndex={-1}>
        <div className="modal-heading">
          <div><span className="eyebrow">{t("الإدارة")}</span><h2 id="delete-confirmation-title">{t("حذف")}</h2></div>
          <button type="button" className="icon-button" onClick={closeDialog} disabled={deleting} aria-label={t("إغلاق")}>×</button>
        </div>
        <p id="delete-confirmation-copy" className="confirm-copy">{t("هل تريد حذف هذا السجل نهائياً؟")}</p>
        <div className="modal-actions">
          <button type="button" className="button subtle" onClick={closeDialog} disabled={deleting}>{t("إلغاء")}</button>
          <button type="button" className="button subtle danger-text" onClick={() => void confirmDeletion()} disabled={deleting}>{t(deleting ? "جارٍ الحفظ..." : "حذف")}</button>
        </div>
      </div>
    </div>
  );
}

function RecordModal({
  modal,
  office,
  onClose,
  onSaved,
}: {
  modal: NonNullable<ModalState>;
  office: OfficeData;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { t } = useI18n();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const closeDialog = () => {
    if (!saving) onClose();
  };
  const dialogRef = useDialogFocus(closeDialog);
  const record = modal.record ?? {};
  const editing = Boolean(record.id);
  const title =
    modal.resource === "clients"
      ? editing ? "تعديل العميل" : "عميل جديد"
      : modal.resource === "cases"
        ? editing ? "تعديل القضية" : "قضية جديدة"
        : modal.resource === "hearings"
          ? editing ? "تعديل الموعد" : "موعد جديد"
          : editing ? "تعديل الفاتورة" : "فاتورة جديدة";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const data = Object.fromEntries(form.entries()) as Record<string, unknown>;
    if (modal.resource === "invoices") {
      data.amountFils = Math.round(Number(data.amountKwd) * 1000);
      delete data.amountKwd;
    }
    setSaving(true);
    setError("");
    try {
      await readJson(
        await fetch("/api/office", {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resource: modal.resource,
            id: record.id,
            data,
          }),
        }),
      );
      await onSaved();
    } catch (saveError) {
      setError(t(saveError instanceof Error ? saveError.message : "تعذّر الحفظ"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog(); }}>
      <div ref={dialogRef} className="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title" aria-describedby={error ? "modal-error" : undefined} tabIndex={-1}>
        <div className="modal-heading">
          <div><span className="eyebrow">{t("بيانات المكتب")}</span><h2 id="modal-title">{t(title)}</h2></div>
          <button type="button" className="icon-button" onClick={closeDialog} disabled={saving} aria-label={t("إغلاق")}>×</button>
        </div>
        <form onSubmit={submit}>
          {modal.resource === "clients" && (
            <>
              <label><span>{t("الاسم")}</span><VoiceInput name="name" defaultValue={String(record.name || "")} required autoFocus /></label>
              <div className="form-grid"><label><span>{t("الهاتف")}</span><VoiceInput name="phone" type="tel" defaultValue={String(record.phone || "")} /></label><label><span>{t("البريد الإلكتروني")}</span><VoiceInput name="email" type="email" defaultValue={String(record.email || "")} /></label></div>
              <label><span>{t("ملاحظات")}</span><VoiceTextarea name="notes" rows={4} defaultValue={String(record.notes || "")} /></label>
            </>
          )}
          {modal.resource === "cases" && (
            <>
              <div className="form-grid">
                <label><span>{t("رقم القضية")}</span><VoiceInput name="caseNumber" defaultValue={String(record.caseNumber || "")} required autoFocus /></label>
                <label><span>{t("العميل")}</span><select name="clientId" defaultValue={String(record.clientId || "")}><option value="">{t("بدون ربط")}</option>{office.clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>
              </div>
              <div className="form-grid">
                <label><span>{t("المحكمة")}</span><VoiceInput name="court" defaultValue={String(record.court || "")} /></label>
                <label><span>{t("نوع القضية")}</span><VoiceInput name="type" defaultValue={String(record.type || "")} /></label>
              </div>
              <div className="form-grid">
                <label><span>{t("الخصم")}</span><VoiceInput name="opposingParty" defaultValue={String(record.opposingParty || "")} /></label>
                <label><span>{t("الحالة")}</span><select name="status" defaultValue={String(record.status || "active")}>{Object.entries(CASE_STATUS).map(([key, value]) => <option key={key} value={key}>{t(value.label)}</option>)}</select></label>
              </div>
              <label><span>{t("ملاحظات")}</span><VoiceTextarea name="notes" rows={4} defaultValue={String(record.notes || "")} /></label>
            </>
          )}
          {modal.resource === "hearings" && (
            <>
              <label><span>{t("العنوان")}</span><VoiceInput name="title" defaultValue={String(record.title || "")} required autoFocus /></label>
              <div className="form-grid">
                <label><span>{t("النوع")}</span><select name="kind" defaultValue={String(record.kind || "hearing")}><option value="hearing">{t("جلسة")}</option><option value="task">{t("مهمة")}</option></select></label>
                <label><span>{t("القضايا")}</span><select name="caseId" defaultValue={String(record.caseId || "")}><option value="">{t("بدون ربط")}</option>{office.cases.map((item) => <option key={item.id} value={item.id}>{item.caseNumber}</option>)}</select></label>
              </div>
              <div className="form-grid">
                <label><span>{t("التاريخ")}</span><input name="date" type="date" defaultValue={String(record.date || "")} required /></label>
                <label><span>{t("الوقت")}</span><input name="time" type="time" defaultValue={String(record.time || "")} /></label>
              </div>
              <div className="form-grid">
                <label><span>{t("المكان")}</span><VoiceInput name="location" defaultValue={String(record.location || "")} /></label>
                <label><span>{t("الحالة")}</span><select name="status" defaultValue={String(record.status || "pending")}><option value="pending">{t("قادمة")}</option><option value="done">{t("منتهية")}</option></select></label>
              </div>
              <label><span>{t("ملاحظات")}</span><VoiceTextarea name="notes" rows={3} defaultValue={String(record.notes || "")} /></label>
            </>
          )}
          {modal.resource === "invoices" && (
            <>
              <label><span>{t("الوصف")}</span><VoiceInput name="description" defaultValue={String(record.description || "")} autoFocus /></label>
              <div className="form-grid">
                <label><span>{t("العميل")}</span><select name="clientId" defaultValue={String(record.clientId || "")}><option value="">{t("بدون ربط")}</option>{office.clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>
                <label><span>{t("القضايا")}</span><select name="caseId" defaultValue={String(record.caseId || "")}><option value="">{t("بدون ربط")}</option>{office.cases.map((item) => <option key={item.id} value={item.id}>{item.caseNumber}</option>)}</select></label>
              </div>
              <div className="form-grid">
                <label><span>{t("المبلغ بالدينار")}</span><input name="amountKwd" type="number" step="0.001" min="0.001" defaultValue={record.amountFils ? Number(record.amountFils) / 1000 : ""} required /></label>
                <label><span>{t("الحالة")}</span><select name="status" defaultValue={String(record.status || "unpaid")}>{Object.entries(INVOICE_STATUS).map(([key, value]) => <option key={key} value={key}>{t(value.label)}</option>)}</select></label>
              </div>
              <div className="form-grid">
                <label><span>{t("تاريخ الإصدار")}</span><input name="issueDate" type="date" defaultValue={String(record.issueDate || new Date().toISOString().slice(0, 10))} required /></label>
                <label><span>{t("تاريخ الاستحقاق")}</span><input name="dueDate" type="date" defaultValue={String(record.dueDate || "")} /></label>
              </div>
            </>
          )}
          {error && <div id="modal-error" className="alert danger" role="alert">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="button subtle" onClick={closeDialog} disabled={saving}>{t("إلغاء")}</button>
            <button type="submit" className="button primary" disabled={saving}>{t(saving ? "جارٍ الحفظ..." : "حفظ")}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
