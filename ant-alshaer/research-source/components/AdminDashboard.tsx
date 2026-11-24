"use client";

import {
  Activity,
  AudioLines,
  BookOpen,
  CheckCircle2,
  Crown,
  Feather,
  FileText,
  FolderKanban,
  Globe2,
  House,
  KeyRound,
  LibraryBig,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  MailCheck,
  PlayCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserCog,
  Users,
  UserX,
  Video,
} from "lucide-react";
import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";

const ADMIN_SESSION_STORAGE_KEY = "ant_alshaer_admin_access";
const ADMIN_SESSION_HEADER = "x-ant-alshaer-admin-session";

type Verse = { sadr: string; ajz: string };
type Poem = { title?: string; meter?: string; verses?: Verse[] };

type ArchiveItem = {
  id: string;
  sourceMode: "text" | "audio" | "video" | "document" | "image";
  storyText: string;
  requestText: string | null;
  poem: Poem | null;
  poemTitle: string | null;
  meter: string | null;
  verseCount: number | null;
  state: string;
  hasAudio: boolean;
  audioFilename: string | null;
  audioSize: number | null;
  createdAt: string;
  updatedAt: string;
  user: { id: string; email: string; displayName: string } | null;
};

type ManagedUser = {
  id: string;
  email: string;
  displayName: string;
  role: "admin" | "user";
  status: "pending" | "active" | "suspended";
  createdAt: string;
  lastSeenAt: string;
  archiveCount: number;
  isPrimaryAdmin: boolean;
};

type DashboardData = {
  metrics: { users: number; archive: number; poems: number; audio: number };
  users: ManagedUser[];
  archive: ArchiveItem[];
  viewer: { id: string; email: string; displayName: string; role: "admin" };
  system: { database: boolean; storage: boolean; ai: boolean; guestAccess: boolean };
};

type ReferenceSource = {
  id: string;
  title: string;
  author: string | null;
  publisher: string | null;
  publicationYear: number | null;
  sourceUrl: string;
  sourceType: string;
  scope: string;
  reliability: string;
  summary: string;
};

type ReferenceLibrary = {
  sources: ReferenceSource[];
  meters: unknown[];
  rules: unknown[];
  policy: string;
};

type TwilioConfigurationStatus = {
  configured: boolean;
  source: "environment" | "secure_storage" | null;
};

type ResearchResult = {
  status?: "ok" | "partial" | "failed";
  sources?: Array<{
    id: string;
    url: string;
    title?: string;
    provider?: string;
    retrieved_at?: string;
  }>;
  analysis?: {
    mode?: string;
    findings?: Array<{ text: string; source_ids: string[] }>;
    gaps?: string[];
    counterarguments?: string[];
    recommendations?: string[];
  };
  errors?: Array<{ code?: string; message?: string; url?: string }>;
  counts?: { requested?: number; attempted?: number; collected?: number };
};

type AdminTab = "overview" | "projects" | "users" | "references" | "research" | "activation" | "permissions";
type ProjectFilter = "all" | "completed" | "failed" | "processing";

const formatDate = (value: string) => {
  try {
    return new Intl.DateTimeFormat("ar-KW", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const formatBytes = (value: number | null) => {
  if (!value) return "";
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} ك.ب`;
  return `${(value / (1024 * 1024)).toFixed(1)} م.ب`;
};

const projectStateLabel = (state: string) => {
  if (state === "completed") return "مكتمل";
  if (state === "failed") return "متعثر";
  if (state === "audio_saved") return "تم حفظ الوسائط";
  if (state === "analyzed") return "تم التحليل";
  return "قيد العمل";
};

const readAdminToken = () => {
  try {
    return window.sessionStorage.getItem(ADMIN_SESSION_STORAGE_KEY) || "";
  } catch {
    return "";
  }
};

const clearAdminToken = () => {
  try {
    window.sessionStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
  } catch {
    // The server cookie remains available for direct, non-embedded sessions.
  }
};

const adminFetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
  const headers = new Headers(init.headers);
  const token = readAdminToken();
  if (token) headers.set(ADMIN_SESSION_HEADER, token);
  return fetch(input, { ...init, headers });
};

function AdminMedia({ item }: { item: ArchiveItem }) {
  const [source, setSource] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      if (source) URL.revokeObjectURL(source);
    };
  }, [source]);

  const load = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await adminFetch(`/api/audio/${item.id}`, { cache: "no-store" });
      if (response.status === 401 || response.status === 403) {
        clearAdminToken();
        window.location.assign("/admin/login");
        return;
      }
      if (!response.ok) throw new Error("تعذّر تحميل الملف المحفوظ.");
      setSource(URL.createObjectURL(await response.blob()));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "تعذّر تحميل الملف المحفوظ.");
    } finally {
      setBusy(false);
    }
  };

  if (source) {
    if (item.sourceMode === "document" || item.sourceMode === "image") return <a className="secondary-button" href={source} download={item.audioFilename || "source"}>تنزيل الملف الأصلي</a>;
    return item.sourceMode === "video" ? (
      <video controls autoPlay preload="metadata" src={source} />
    ) : (
      <audio controls autoPlay preload="metadata" src={source} />
    );
  }

  return (
    <div className="admin-media-loader">
      <button type="button" onClick={() => void load()} disabled={busy}>
        {busy ? <LoaderCircle className="spin" size={17} /> : <PlayCircle size={17} />}
        {busy ? "جارٍ تحميل الملف…" : item.sourceMode === "document" || item.sourceMode === "image" ? "تحميل الملف الأصلي" : "تشغيل الملف المحفوظ"}
      </button>
      {error && <span>{error}</span>}
    </div>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [referenceLibrary, setReferenceLibrary] = useState<ReferenceLibrary | null>(null);
  const [tab, setTab] = useState<AdminTab>("overview");
  const [projectFilter, setProjectFilter] = useState<ProjectFilter>("all");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [busyUser, setBusyUser] = useState<string | null>(null);
  const [twilioStatus, setTwilioStatus] = useState<TwilioConfigurationStatus | null>(null);
  const [twilioNotice, setTwilioNotice] = useState("");
  const [savingTwilio, setSavingTwilio] = useState(false);
  const [twilioForm, setTwilioForm] = useState({ accountSid: "", authToken: "", serviceSid: "" });
  const [researchBusy, setResearchBusy] = useState(false);
  const [researchResult, setResearchResult] = useState<ResearchResult | null>(null);
  const [researchForm, setResearchForm] = useState({
    query: "",
    urls: "",
    discover: false,
    provider: "auto" as "auto" | "web" | "browser" | "youtube" | "x" | "reddit",
    useLlm: true,
  });

  const returnToLogin = useCallback(() => {
    clearAdminToken();
    window.location.assign("/admin/login");
  }, []);

  const loadDashboard = useCallback(async () => {
    setError("");
    try {
      const response = await adminFetch("/api/admin", { cache: "no-store" });
      if (response.status === 401 || response.status === 403) {
        returnToLogin();
        return;
      }
      const result = (await response.json()) as DashboardData & { error?: string };
      if (!response.ok) throw new Error(result.error || "تعذّر تحميل مركز الإدارة.");
      setData(result);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "تعذّر تحميل مركز الإدارة.");
    }
  }, [returnToLogin]);

  const loadReferenceLibrary = useCallback(async () => {
    try {
      const response = await adminFetch("/api/references", { cache: "no-store" });
      const result = (await response.json()) as ReferenceLibrary & { error?: string };
      if (!response.ok) throw new Error(result.error || "تعذّر تحميل مكتبة المراجع.");
      setReferenceLibrary(result);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "تعذّر تحميل مكتبة المراجع.");
    }
  }, []);

  const loadTwilioStatus = useCallback(async () => {
    try {
      const response = await adminFetch("/api/admin/integrations/twilio", { cache: "no-store" });
      if (response.status === 401 || response.status === 403) {
        returnToLogin();
        return;
      }
      const result = (await response.json()) as TwilioConfigurationStatus & { error?: string };
      if (!response.ok) throw new Error(result.error || "تعذّر قراءة إعداد تفعيل البريد.");
      setTwilioStatus(result);
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "تعذّر قراءة إعداد تفعيل البريد.");
    }
  }, [returnToLogin]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadDashboard(), loadReferenceLibrary(), loadTwilioStatus()]);
  }, [loadDashboard, loadReferenceLibrary, loadTwilioStatus]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refreshAll(), 0);
    return () => window.clearTimeout(timer);
  }, [refreshAll]);

  const logout = async () => {
    await adminFetch("/api/admin/session", { method: "DELETE" }).catch(() => undefined);
    returnToLogin();
  };

  const updateUser = async (
    userId: string,
    change: { status?: "active" | "suspended"; role?: "admin" | "user" },
  ) => {
    setBusyUser(userId);
    setError("");
    try {
      const response = await adminFetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...change }),
      });
      if (response.status === 401 || response.status === 403) {
        returnToLogin();
        return;
      }
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "تعذّر تحديث المستخدم.");
      await loadDashboard();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "تعذّر تحديث المستخدم.");
    } finally {
      setBusyUser(null);
    }
  };

  const changeRole = (user: ManagedUser) => {
    const nextRole = user.role === "admin" ? "user" : "admin";
    const message = nextRole === "admin"
      ? `منح ${user.displayName} صلاحية إدارة كاملة؟`
      : `إلغاء صلاحية الإدارة عن ${user.displayName}؟`;
    if (window.confirm(message)) void updateUser(user.id, { role: nextRole });
  };

  const saveTwilioConfiguration = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingTwilio(true);
    setError("");
    setTwilioNotice("");
    try {
      const response = await adminFetch("/api/admin/integrations/twilio", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(twilioForm),
      });
      if (response.status === 401 || response.status === 403) {
        returnToLogin();
        return;
      }
      const result = (await response.json()) as TwilioConfigurationStatus & { error?: string };
      if (!response.ok) throw new Error(result.error || "تعذّر حفظ إعداد Twilio.");
      setTwilioStatus(result);
      setTwilioForm({ accountSid: "", authToken: "", serviceSid: "" });
      setTwilioNotice("تم حفظ الإعداد مشفّرًا. يمكنك الآن اختبار إنشاء حساب جديد.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "تعذّر حفظ إعداد Twilio.");
    } finally {
      setSavingTwilio(false);
    }
  };

  const runResearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResearchBusy(true);
    setResearchResult(null);
    setError("");

    try {
      const urls = researchForm.urls
        .split(/\r?\n/)
        .map((value) => value.trim())
        .filter(Boolean);
      const response = await adminFetch("/api/admin/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: researchForm.query,
          urls,
          discover: researchForm.discover,
          provider: researchForm.provider,
          language: "ar",
          use_llm: researchForm.useLlm,
        }),
      });
      if (response.status === 401 || response.status === 403) {
        returnToLogin();
        return;
      }
      const result = (await response.json()) as ResearchResult & { error?: string };
      if (!response.ok) throw new Error(result.error || "تعذّر إكمال بحث المصادر.");
      setResearchResult(result);
    } catch (researchError) {
      setError(researchError instanceof Error ? researchError.message : "تعذّر إكمال بحث المصادر.");
    } finally {
      setResearchBusy(false);
    }
  };

  const filteredArchive = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (data?.archive || []).filter((item) => {
      const matchesQuery = !query || [
        item.storyText,
        item.poemTitle || "",
        item.meter || "",
        item.user?.displayName || "",
        item.user?.email || "",
        item.id,
      ].join(" ").toLowerCase().includes(query);
      const matchesState = projectFilter === "all" || (projectFilter === "processing"
        ? item.state !== "completed" && item.state !== "failed"
        : item.state === projectFilter);
      return matchesQuery && matchesState;
    });
  }, [data, projectFilter, search]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return data?.users || [];
    return (data?.users || []).filter((user) =>
      `${user.displayName} ${user.email} ${user.role} ${user.status}`.toLowerCase().includes(query),
    );
  }, [data, search]);

  const filteredSources = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return referenceLibrary?.sources || [];
    return (referenceLibrary?.sources || []).filter((source) =>
      `${source.title} ${source.author || ""} ${source.publisher || ""} ${source.sourceType} ${source.scope} ${source.reliability} ${source.summary}`.toLowerCase().includes(query),
    );
  }, [referenceLibrary, search]);

  const performanceSourceCount = useMemo(
    () => (referenceLibrary?.sources || []).filter((source) => source.sourceType === "فيديو أداء شعري").length,
    [referenceLibrary],
  );

  const pendingUsers = data?.users.filter((user) => user.status === "pending").length || 0;
  const suspendedUsers = data?.users.filter((user) => user.status === "suspended").length || 0;
  const failedProjects = data?.archive.filter((item) => item.state === "failed").length || 0;
  const searchableTab = tab === "projects" || tab === "users" || tab === "references";

  const openTab = (nextTab: AdminTab) => {
    setTab(nextTab);
    setSearch("");
  };

  return (
    <main className="dashboard-shell admin-command-center">
      <header className="dashboard-topbar">
        <div>
          <div className="dashboard-kicker"><ShieldCheck size={17} /> مركز تحكم محمي</div>
          <h1>إدارة «أنت الشاعر»</h1>
          <p>{data ? `مرحبًا ${data.viewer.displayName}،` : "مرحبًا،"} إدارة المشاريع والمستخدمين والمراجع والتكاملات من مكان واحد.</p>
        </div>
        <div className="dashboard-top-actions">
          <button type="button" className="secondary-button" onClick={() => void refreshAll()}><RefreshCw size={16} /> تحديث البيانات</button>
          <Link className="secondary-button" href="/"><House size={16} /> فتح التطبيق</Link>
          <button type="button" className="secondary-button danger-outline" onClick={() => void logout()}><LogOut size={16} /> تسجيل الخروج</button>
        </div>
      </header>

      {error && <div className="error-box dashboard-error" role="alert">{error}</div>}

      {!data ? (
        <div className="dashboard-loading"><LoaderCircle className="spin" size={26} /> جارٍ التحقق وتحميل مركز الإدارة…</div>
      ) : (
        <>
          <section className="metric-grid" aria-label="ملخص المنصة">
            <button type="button" className="metric-card" onClick={() => openTab("users")}><Users /><span>المستخدمون</span><strong>{data.metrics.users}</strong></button>
            <button type="button" className="metric-card" onClick={() => openTab("projects")}><FolderKanban /><span>مشاريع القصائد</span><strong>{data.metrics.archive}</strong></button>
            <button type="button" className="metric-card" onClick={() => openTab("projects")}><Feather /><span>القصائد المكتملة</span><strong>{data.metrics.poems}</strong></button>
            <button type="button" className="metric-card" onClick={() => openTab("projects")}><AudioLines /><span>الملفات المرفوعة</span><strong>{data.metrics.audio}</strong></button>
          </section>

          <section className="dashboard-card admin-dashboard-card">
            <div className="dashboard-controls">
              <div className="dashboard-tabs" role="tablist" aria-label="أقسام مركز الإدارة">
                <button type="button" role="tab" aria-selected={tab === "overview"} className={tab === "overview" ? "active" : ""} onClick={() => openTab("overview")}><Activity size={17} /> النظرة العامة</button>
                <button type="button" role="tab" aria-selected={tab === "projects"} className={tab === "projects" ? "active" : ""} onClick={() => openTab("projects")}><FolderKanban size={17} /> مشاريع القصائد</button>
                <button type="button" role="tab" aria-selected={tab === "users"} className={tab === "users" ? "active" : ""} onClick={() => openTab("users")}><Users size={17} /> المستخدمون</button>
                <button type="button" role="tab" aria-selected={tab === "references"} className={tab === "references" ? "active" : ""} onClick={() => openTab("references")}><LibraryBig size={17} /> المراجع</button>
                <button type="button" role="tab" aria-selected={tab === "research"} className={tab === "research" ? "active" : ""} onClick={() => openTab("research")}><Globe2 size={17} /> بحث المصادر</button>
                <button type="button" role="tab" aria-selected={tab === "activation"} className={tab === "activation" ? "active" : ""} onClick={() => openTab("activation")}><KeyRound size={17} /> التكاملات</button>
                <button type="button" role="tab" aria-selected={tab === "permissions"} className={tab === "permissions" ? "active" : ""} onClick={() => openTab("permissions")}><LockKeyhole size={17} /> الصلاحيات</button>
              </div>

              {searchableTab && (
                <label className="dashboard-search">
                  <Search size={18} />
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={tab === "projects" ? "ابحث في المشاريع والقصائد" : tab === "users" ? "ابحث بالاسم أو البريد" : "ابحث في المراجع"} />
                </label>
              )}
            </div>

            {tab === "overview" && (
              <section className="admin-overview-grid" aria-label="حالة النظام">
                <article className="admin-overview-card featured">
                  <div className="admin-card-title"><Activity size={19} /><h2>حالة التشغيل</h2></div>
                  <div className="system-status-list">
                    <div><i className={data.system.database ? "ready" : "down"} /><span>قاعدة البيانات</span><strong>{data.system.database ? "تعمل" : "غير متاحة"}</strong></div>
                    <div><i className={data.system.storage ? "ready" : "down"} /><span>حفظ الصوت والفيديو</span><strong>{data.system.storage ? "يعمل" : "غير متاح"}</strong></div>
                    <div><i className={data.system.ai ? "ready" : "down"} /><span>محرك الكتابة والتحليل</span><strong>{data.system.ai ? "متصل" : "غير متصل"}</strong></div>
                    <div><i className={twilioStatus?.configured ? "ready" : "pending"} /><span>تفعيل البريد</span><strong>{twilioStatus?.configured ? "متصل" : "يحتاج إعدادًا"}</strong></div>
                    <div><i className={data.system.guestAccess ? "pending" : "ready"} /><span>الدخول المؤقت للزوار</span><strong>{data.system.guestAccess ? "مفتوح" : "مغلق"}</strong></div>
                  </div>
                </article>

                <article className="admin-overview-card attention">
                  <div className="admin-card-title"><Sparkles size={19} /><h2>بحاجة إلى متابعة</h2></div>
                  <div className="attention-metrics">
                    <button type="button" onClick={() => openTab("users")}><strong>{pendingUsers}</strong><span>بانتظار التفعيل</span></button>
                    <button type="button" onClick={() => openTab("projects")}><strong>{failedProjects}</strong><span>مشروع متعثر</span></button>
                    <button type="button" onClick={() => openTab("users")}><strong>{suspendedUsers}</strong><span>حساب موقوف</span></button>
                  </div>
                </article>

                <article className="admin-overview-card">
                  <div className="admin-card-title"><ShieldCheck size={19} /><h2>نطاق الإدارة</h2></div>
                  <ul className="admin-capability-list">
                    <li><CheckCircle2 size={16} /> عرض جميع مشاريع القصائد ووسائطها</li>
                    <li><CheckCircle2 size={16} /> تفعيل المستخدمين أو إيقافهم</li>
                    <li><CheckCircle2 size={16} /> تفويض مدير جديد أو إلغاء التفويض</li>
                    <li><CheckCircle2 size={16} /> مراجعة المراجع وتشغيل بحث المصادر المحمي</li>
                  </ul>
                </article>

                <article className="admin-overview-card">
                  <div className="admin-card-title"><BookOpen size={19} /><h2>القاعدة المرجعية</h2></div>
                  <div className="reference-summary-numbers">
                    <div><strong>{referenceLibrary?.sources.length ?? "—"}</strong><span>مصدرًا</span></div>
                    <div><strong>{performanceSourceCount || "—"}</strong><span>أداءً مرئيًا</span></div>
                    <div><strong>{referenceLibrary?.meters.length ?? "—"}</strong><span>بحرًا ولونًا</span></div>
                    <div><strong>{referenceLibrary?.rules.length ?? "—"}</strong><span>قاعدة تحريرية</span></div>
                  </div>
                  <button type="button" className="admin-text-action" onClick={() => openTab("references")}>فتح مكتبة المراجع</button>
                </article>
              </section>
            )}

            {tab === "projects" && (
              <section aria-label="مشاريع القصائد">
                <div className="project-filter-row" aria-label="تصفية المشاريع">
                  {([["all", "الكل"], ["completed", "المكتملة"], ["processing", "قيد العمل"], ["failed", "المتعثرة"]] as const).map(([value, label]) => (
                    <button type="button" key={value} className={projectFilter === value ? "active" : ""} onClick={() => setProjectFilter(value)}>{label}</button>
                  ))}
                </div>
                <div className="archive-list">
                  {filteredArchive.length === 0 ? <div className="empty-state">لا توجد مشاريع مطابقة.</div> : filteredArchive.map((item) => (
                    <details className="archive-item" key={item.id}>
                      <summary>
                        <div className="archive-icon">{item.sourceMode === "video" ? <Video size={19} /> : item.sourceMode === "audio" ? <AudioLines size={19} /> : <FileText size={19} />}</div>
                        <div className="archive-summary-copy"><strong>{item.poemTitle || "مشروع قصيدة قيد العمل"}</strong><span>{item.user?.displayName || "مستخدم"} • آخر تحديث {formatDate(item.updatedAt)}</span></div>
                        <div className="archive-badges">
                          {item.meter && <span>{item.meter}</span>}
                          <span>{item.sourceMode === "video" ? "فيديو" : item.sourceMode === "image" ? "صورة" : item.sourceMode === "document" ? "مستند" : item.hasAudio ? "صوت" : "كتابة"}</span>
                          <span className={`project-state ${item.state}`}>{projectStateLabel(item.state)}</span>
                        </div>
                      </summary>
                      <div className="archive-details">
                        <div className="archive-user-line"><strong>{item.user?.displayName || "مستخدم"}</strong><span>{item.user?.email}</span><code title={item.id}>مشروع {item.id.slice(0, 8)}</code></div>
                        <div className="archive-block"><h3>القصة الأصلية</h3><p>{item.storyText || "لم يُحفظ نص واضح بعد."}</p></div>
                        {item.requestText && <div className="archive-block compact"><h3>طلب المستخدم</h3><p>{item.requestText}</p></div>}
                        {item.hasAudio && <div className="archive-audio"><div>{item.sourceMode === "video" ? <Video size={18} /> : <AudioLines size={18} />} الملف الأصلي {formatBytes(item.audioSize)}</div><AdminMedia item={item} /></div>}
                        {item.poem?.verses?.length ? (
                          <div className="archive-poem">
                            <h3>{item.poem.title || item.poemTitle}</h3>
                            {item.poem.verses.map((verse, index) => <div className="archive-verse" key={`${item.id}-${index}`}><span>{verse.sadr}</span><i>◆</i><span>{verse.ajz}</span></div>)}
                          </div>
                        ) : <div className="archive-pending">لم تكتمل القصيدة في هذا المشروع بعد.</div>}
                      </div>
                    </details>
                  ))}
                </div>
              </section>
            )}

            {tab === "users" && (
              <div className="users-table-wrap">
                <table className="users-table">
                  <thead><tr><th>المستخدم</th><th>الصلاحية</th><th>الحالة</th><th>المشاريع</th><th>آخر دخول</th><th>الإدارة</th></tr></thead>
                  <tbody>
                    {filteredUsers.map((user) => {
                      const isCurrentAdmin = data.viewer.id === user.id;
                      const statusAction = user.status === "active" ? "suspended" : "active";
                      return (
                        <tr key={user.id}>
                          <td data-label="المستخدم"><strong>{user.displayName}</strong><span>{user.email}</span></td>
                          <td data-label="الصلاحية"><span className={`role-pill ${user.role}`}>{user.role === "admin" ? "مدير" : "مستخدم"}</span></td>
                          <td data-label="الحالة"><span className={`status-pill ${user.status}`}>{user.status === "active" ? "نشط" : user.status === "pending" ? "بانتظار التفعيل" : "موقوف"}</span></td>
                          <td data-label="المشاريع">{user.archiveCount}</td>
                          <td data-label="آخر دخول">{formatDate(user.lastSeenAt)}</td>
                          <td data-label="الإدارة">
                            {isCurrentAdmin || user.isPrimaryAdmin ? <span className="protected-admin"><ShieldCheck size={15} /> {isCurrentAdmin ? "حسابك محمي" : "مدير رئيسي محمي"}</span> : (
                              <div className="user-actions">
                                <button type="button" disabled={busyUser === user.id} onClick={() => void updateUser(user.id, { status: statusAction })}>
                                  {statusAction === "suspended" ? <UserX size={15} /> : <UserCheck size={15} />}
                                  {user.status === "active" ? "إيقاف" : user.status === "pending" ? "تفعيل" : "إعادة التفعيل"}
                                </button>
                                <button type="button" className="role-action" disabled={busyUser === user.id} onClick={() => changeRole(user)}>
                                  {user.role === "admin" ? <UserCog size={15} /> : <Crown size={15} />}
                                  {user.role === "admin" ? "إلغاء الإدارة" : "منح الإدارة"}
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {tab === "references" && (
              <section className="references-admin-panel" aria-label="مكتبة المراجع">
                <div className="references-admin-head">
                  <div><h2>مراجع الشعر والأوزان والمفردات والأداء</h2><p>{referenceLibrary?.policy || "جارٍ تحميل بيانات المكتبة…"}</p></div>
                  <div className="reference-counts"><span>{referenceLibrary?.sources.length || 0} مصدرًا</span><span>{performanceSourceCount} أداءً مرئيًا</span><span>{referenceLibrary?.meters.length || 0} بحرًا ولونًا</span><span>{referenceLibrary?.rules.length || 0} قاعدة</span></div>
                </div>
                <div className="reference-admin-list">
                  {filteredSources.map((source) => (
                    <article className="reference-admin-card" key={source.id}>
                      <div className="reference-admin-card-head">
                        <div><span>{source.reliability}</span><h3>{source.title}</h3></div>
                        <a href={source.sourceUrl} target="_blank" rel="noreferrer">
                          {source.sourceType === "فيديو أداء شعري" ? <Video size={16} /> : <BookOpen size={16} />}
                          {source.sourceType === "فيديو أداء شعري" ? "فتح الفيديو" : "فتح المصدر"}
                        </a>
                      </div>
                      <p>{source.summary}</p>
                      <dl><div><dt>الشاعر/المؤلف</dt><dd>{source.author || "جهة مؤسسية"}</dd></div><div><dt>الناشر</dt><dd>{source.publisher || "غير محدد"}</dd></div><div><dt>النطاق</dt><dd>{source.scope}</dd></div><div><dt>النوع</dt><dd>{source.sourceType}</dd></div></dl>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {tab === "research" && (
              <section className="research-panel" aria-label="بحث وتحليل المصادر">
                <div className="integration-panel-head">
                  <div className="integration-icon"><Globe2 size={20} /></div>
                  <div>
                    <h2>بحث المصادر والمراجع</h2>
                    <p>اجمع الأدلة من مصادر عامة ثم راجع النتائج قبل استخدامها في المحتوى.</p>
                  </div>
                </div>

                <form className="research-form" onSubmit={runResearch}>
                  <label>
                    <span>سؤال البحث</span>
                    <textarea
                      value={researchForm.query}
                      onChange={(event) => setResearchForm((current) => ({ ...current, query: event.target.value }))}
                      placeholder="مثال: ما سمات الإلقاء المناسبة لقصائد الحكمة النبطية؟"
                      maxLength={1500}
                      required
                    />
                  </label>
                  <label>
                    <span>روابط المصادر — رابط واحد في كل سطر</span>
                    <textarea
                      dir="ltr"
                      value={researchForm.urls}
                      onChange={(event) => setResearchForm((current) => ({ ...current, urls: event.target.value }))}
                      placeholder={"https://example.org/source\nhttps://www.youtube.com/watch?v=…"}
                    />
                  </label>
                  <div className="research-options">
                    <label>
                      <span>طريقة القراءة</span>
                      <select
                        value={researchForm.provider}
                        onChange={(event) => setResearchForm((current) => ({
                          ...current,
                          provider: event.target.value as typeof current.provider,
                        }))}
                      >
                        <option value="auto">تلقائي</option>
                        <option value="web">صفحة عامة</option>
                        <option value="browser">متصفح</option>
                        <option value="youtube">YouTube</option>
                        <option value="x">X</option>
                        <option value="reddit">Reddit</option>
                      </select>
                    </label>
                    <label className="research-check">
                      <input
                        type="checkbox"
                        checked={researchForm.discover}
                        onChange={(event) => setResearchForm((current) => ({ ...current, discover: event.target.checked }))}
                      />
                      اكتشاف مصادر إضافية
                    </label>
                    <label className="research-check">
                      <input
                        type="checkbox"
                        checked={researchForm.useLlm}
                        onChange={(event) => setResearchForm((current) => ({ ...current, useLlm: event.target.checked }))}
                      />
                      تلخيص الأدلة
                    </label>
                  </div>
                  <div className="integration-help">
                    هذا المسار للقراءة والاقتراح فقط. لا ينشر محتوى ولا يغيّر قصيدة أو سجلًا تلقائيًا.
                  </div>
                  <button className="primary-button research-submit" type="submit" disabled={researchBusy}>
                    <Search size={18} /> {researchBusy ? "جارٍ جمع المصادر…" : "ابدأ البحث"}
                  </button>
                </form>

                {researchResult && (
                  <div className="research-results" aria-live="polite">
                    <div className={`research-summary ${researchResult.status || "partial"}`}>
                      <strong>{researchResult.status === "ok" ? "اكتمل البحث" : researchResult.status === "failed" ? "لم تُجمع مصادر قابلة للاستخدام" : "نتيجة جزئية تحتاج مراجعة"}</strong>
                      <span>جُمعت {researchResult.counts?.collected || 0} من {researchResult.counts?.requested || 0} مصادر مطلوبة.</span>
                    </div>

                    {(researchResult.analysis?.findings || []).length > 0 && (
                      <section className="research-block">
                        <h3>النتائج المدعومة بالمصادر</h3>
                        <ol>
                          {researchResult.analysis?.findings?.map((finding, index) => (
                            <li key={`${index}-${finding.source_ids.join("-")}`}>
                              <p>{finding.text}</p>
                              <span>{finding.source_ids.join("، ")}</span>
                            </li>
                          ))}
                        </ol>
                      </section>
                    )}

                    {(researchResult.analysis?.recommendations || []).length > 0 && (
                      <section className="research-block">
                        <h3>الخطوات المقترحة</h3>
                        <ul>{researchResult.analysis?.recommendations?.map((item) => <li key={item}>{item}</li>)}</ul>
                      </section>
                    )}

                    {(researchResult.analysis?.counterarguments || []).length > 0 && (
                      <section className="research-block warning">
                        <h3>أدلة أو آراء معارضة</h3>
                        <ul>{researchResult.analysis?.counterarguments?.map((item) => <li key={item}>{item}</li>)}</ul>
                      </section>
                    )}

                    {(researchResult.analysis?.gaps || []).length > 0 && (
                      <section className="research-block warning">
                        <h3>الثغرات والحدود</h3>
                        <ul>{researchResult.analysis?.gaps?.map((item) => <li key={item}>{item}</li>)}</ul>
                      </section>
                    )}

                    {(researchResult.sources || []).length > 0 && (
                      <section className="research-block sources">
                        <h3>المصادر</h3>
                        <div className="research-source-list">
                          {researchResult.sources?.map((source) => (
                            <a key={source.id} href={source.url} target="_blank" rel="noopener noreferrer">
                              <strong>{source.id} — {source.title || source.url}</strong>
                              <span>{[source.provider, source.retrieved_at ? formatDate(source.retrieved_at) : ""].filter(Boolean).join(" • ")}</span>
                            </a>
                          ))}
                        </div>
                      </section>
                    )}

                    {(researchResult.errors || []).length > 0 && (
                      <section className="research-block warning">
                        <h3>مصادر تعذّر جمعها</h3>
                        <ul>{researchResult.errors?.map((item, index) => <li key={`${item.code}-${index}`}>{item.message || item.code || "تعذّر قراءة المصدر"}</li>)}</ul>
                      </section>
                    )}
                  </div>
                )}
              </section>
            )}

            {tab === "activation" && (
              <section className="integration-panel" aria-label="إعداد تفعيل البريد الإلكتروني">
                <div className="integration-panel-head"><div className="integration-icon"><KeyRound size={20} /></div><div><h2>ربط Twilio لتفعيل البريد</h2><p>لا تظهر المفاتيح بعد الحفظ، وتُخزَّن مشفّرة داخل إعدادات التطبيق.</p></div></div>
                <div className={`integration-status ${twilioStatus?.configured ? "ready" : "pending"}`}>
                  <MailCheck size={18} />
                  <div><strong>{twilioStatus?.configured ? "تفعيل البريد مرتبط وجاهز" : twilioStatus ? "لم يُربط تفعيل البريد بعد" : "جارٍ فحص الإعداد…"}</strong>{twilioStatus?.configured && <span>{twilioStatus.source === "environment" ? "مصدر الإعداد: إعدادات الاستضافة المحمية." : "مصدر الإعداد: حفظ مشفّر في قاعدة بيانات التطبيق."}</span>}</div>
                </div>
                <form className="integration-form" onSubmit={saveTwilioConfiguration}>
                  <label><span>Twilio Account SID</span><input type="text" dir="ltr" autoComplete="off" spellCheck={false} value={twilioForm.accountSid} onChange={(event) => setTwilioForm((current) => ({ ...current, accountSid: event.target.value }))} placeholder="AC…" required /></label>
                  <label><span>Twilio Auth Token</span><input type="password" dir="ltr" autoComplete="new-password" spellCheck={false} value={twilioForm.authToken} onChange={(event) => setTwilioForm((current) => ({ ...current, authToken: event.target.value }))} placeholder="لن يظهر بعد الحفظ" required /></label>
                  <label><span>Verify Service SID</span><input type="text" dir="ltr" autoComplete="off" spellCheck={false} value={twilioForm.serviceSid} onChange={(event) => setTwilioForm((current) => ({ ...current, serviceSid: event.target.value }))} placeholder="VA…" required /></label>
                  <div className="integration-help">من Twilio افتح <strong>Verify → Services</strong> ثم انسخ Account SID وAuth Token وVerify Service SID.</div>
                  {twilioNotice && <div className="integration-notice">{twilioNotice}</div>}
                  <button className="primary-button integration-submit" type="submit" disabled={savingTwilio}><KeyRound size={18} /> {savingTwilio ? "جارٍ الحفظ الآمن…" : "حفظ إعداد Twilio"}</button>
                </form>
              </section>
            )}

            {tab === "permissions" && (
              <section className="permissions-panel" aria-label="الصلاحيات">
                <div className="permissions-intro"><div className="integration-icon"><LockKeyhole size={20} /></div><div><h2>مصفوفة الصلاحيات</h2><p>الصلاحية تُفحص داخل الخادم، وليست مبنية على إخفاء الزر أو معرفة الرابط.</p></div></div>
                <div className="permission-table-wrap">
                  <table className="permission-table">
                    <thead><tr><th>الوظيفة</th><th>المدير</th><th>المستخدم</th></tr></thead>
                    <tbody>
                      <tr><td>مشاهدة مشاريع القصائد</td><td>جميع المشاريع</td><td>مشاريعه فقط</td></tr>
                      <tr><td>تشغيل الصوت والفيديو</td><td>جميع الملفات</td><td>ملفاته فقط</td></tr>
                      <tr><td>إدارة الحسابات</td><td>تفعيل وإيقاف</td><td>غير مسموح</td></tr>
                      <tr><td>تفويض المديرين</td><td>مسموح</td><td>غير مسموح</td></tr>
                      <tr><td>إعدادات التكامل</td><td>مسموح</td><td>غير مسموح</td></tr>
                      <tr><td>مراجعة مكتبة المراجع</td><td>كاملة</td><td>قراءة عامة</td></tr>
                      <tr><td>بحث وتحليل المصادر</td><td>مسموح ومحمي</td><td>غير مسموح</td></tr>
                    </tbody>
                  </table>
                </div>
                <div className="security-note"><ShieldCheck size={19} /><div><strong>حماية المدير الرئيسي</strong><span>لا يمكن إيقاف حساب المدير الرئيسي أو خفض صلاحيته، ولا يستطيع المدير تعديل صلاحية حسابه الحالي.</span></div></div>
              </section>
            )}
          </section>
          <p className="retention-note">الرابط الإداري منفصل، وكل البيانات والعمليات الحساسة محمية بالتحقق من صلاحية المدير.</p>
        </>
      )}
    </main>
  );
}
