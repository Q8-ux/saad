"use client";
import { AnalyticsView } from "@/app/analytics-view";

import {
  Activity,
  BadgeDollarSign,
  BarChart3,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  CircleUserRound,
  ClipboardList,
  CreditCard,
  FileSearch,
  FileText,
  History,
  KeyRound,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Menu,
  Moon,
  Pencil,
  RefreshCw,
  Save,
  Search,
  Scale,
  Send,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Sun,
  UserCog,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AdminPermission, AdminRole, AdminStaff } from "@/lib/admin-auth";

type Section = "paths" | "analytics" | "overview" | "ai" | "aiArchive" | "users" | "records" | "appointments" | "services" | "payments" | "security" | "staff" | "audit";
type Theme = "light" | "dark";
type Tool = "assistant" | "memo" | "laws";

type DashboardData = {
  users: { total: number; active: number; suspended: number };
  appointments: { total: number; pending: number; confirmed: number };
  activities: { total: number; memos: number; questions: number; analyses: number };
  recentAppointments: Appointment[];
  recentRecords: ServiceRecord[];
  settings: ServiceSetting[];
};
type PublicUser = { id: string; name: string; phone: string; email: string; status: "active" | "suspended"; memo_limit: number; assistant_limit: number; memo_used: number; assistant_used: number; email_verified_at: string; created_at: string };
type ServiceRecord = { id: string; service_type: string; title: string; input_text?: string; output_text?: string; metadata_json?: string; status: string; created_at: string; user_name: string; user_email: string; user_phone?: string };
type Appointment = { id: number; name: string; phone: string; email: string; case_type: string; preferred_contact: string; message?: string; status: "new" | "confirmed" | "completed" | "cancelled"; created_at: string };
type ServiceSetting = { service_key: string; enabled: number | boolean; payment_required: number | boolean; price_fils: number; currency: string; updated_at: string };
type StaffRow = { id: string; email: string; name: string; role: AdminRole; status: "active" | "suspended"; permissions_json: string; created_by: string; created_at: string; updated_at: string };
type AuditRow = { id: number; staff_email: string; action: string; target_type: string; target_id: string; details_json: string; created_at: string };
type AiArchive = { id: string; staff_email: string; tool_type: Tool; title: string; input_json: string; output_text: string; sources_json: string; status: string; created_at: string };
type AiResponse = { tool: Tool; title: string; output: string; sources?: LegalSource[]; results?: LegalSource[]; archiveId: string };
type LegalSource = { title: string; category?: string; lawNumber?: number | null; lawYear?: number | null; article?: string | null; summary?: string; sourceUrl?: string; officialSource?: string };
type PaymentGateway = { provider: "myfatoorah" | "tap" | "upayments"; mode: "test" | "live"; enabled: boolean; hasApiKey: boolean; apiKeyMask: string; merchantId: string; publicKey: string; methods: string[]; connectionStatus: "unconfigured" | "untested" | "connected" | "failed"; lastTestedAt: string | null; lastErrorCode: string; updatedBy: string; updatedAt: string | null };
type PaymentTransaction = { id: string; user_id: string; service_key: string; provider: string; provider_reference: string; amount_fils: number; currency: string; status: string; created_at: string; updated_at: string };
type PaymentData = { gateway: PaymentGateway; transactions: PaymentTransaction[] };
type SecurityEvent = { id: number; event_type: string; severity: string; route: string; staff_email?: string; user_id?: string; detail_code: string; created_at: string };
type SecurityTotals = { total?: number; last_day?: number; critical_last_day?: number };
type SecurityData = { admin: { events: SecurityEvent[]; totals: SecurityTotals }; public: { events: SecurityEvent[]; totals: SecurityTotals; unavailable?: boolean } };

const permissionList: AdminPermission[] = ["dashboard.view", "users.view", "users.manage", "records.view", "ai.use", "archive.view", "appointments.view", "appointments.manage", "services.view", "services.manage", "payments.view", "payments.manage", "security.view", "staff.view", "staff.manage", "audit.view"];
const permissionLabels: Record<AdminPermission, string> = {
  "dashboard.view": "عرض المؤشرات", "users.view": "عرض المستخدمين", "users.manage": "تعديل المستخدمين وحدودهم", "records.view": "عرض سجلات الموقع العام",
  "ai.use": "استخدام أدوات الذكاء الاصطناعي", "archive.view": "عرض أرشيف الذكاء الاصطناعي", "appointments.view": "عرض المواعيد", "appointments.manage": "تحديث المواعيد",
  "services.view": "عرض الخدمات والأسعار", "services.manage": "تعديل الخدمات والأسعار", "payments.view": "عرض ربط بوابة الدفع", "payments.manage": "إدارة مفاتيح وربط الدفع", "security.view": "عرض الحماية والأحداث الأمنية", "staff.view": "عرض الموظفين", "staff.manage": "إدارة الموظفين والصلاحيات", "audit.view": "عرض سجل الإدارة",
};
const roleLabels: Record<AdminRole, string> = { owner: "مالك النظام", admin: "مدير", lawyer: "محامٍ", support: "خدمة العملاء", finance: "المالية" };
const roleTemplates: Record<AdminRole, AdminPermission[]> = {
  owner: [...permissionList],
  admin: permissionList.filter((item) => item !== "staff.manage"),
  lawyer: ["dashboard.view", "users.view", "records.view", "ai.use", "archive.view", "appointments.view", "appointments.manage"],
  support: ["dashboard.view", "users.view", "appointments.view", "appointments.manage"],
  finance: ["dashboard.view", "users.view", "services.view", "services.manage", "payments.view", "payments.manage"],
};
const serviceNames: Record<string, string> = { consultation: "حجز الاستشارات", assistant: "المساعد القانوني", memo: "توليد المذكرات", library: "المكتبة القانونية" };
const recordNames: Record<string, string> = { memo: "مذكرة قانونية", assistant: "سؤال قانوني", document_analysis: "تحليل مستندات", draft_tool: "تحسين صياغة" };
const toolNames: Record<string, string> = { memo: "مولد المذكرات", assistant: "المساعد القانوني", laws: "القوانين والتشريعات" };
const statusLabels: Record<string, string> = { active: "نشط", suspended: "موقوف", new: "جديد", confirmed: "مؤكد", completed: "مكتمل", cancelled: "ملغي" };
const auditLabels: Record<string, string> = { "user.updated": "تعديل حساب مستخدم", "appointment.updated": "تحديث موعد", "service.updated": "تعديل خدمة أو سعر", "payment.updated": "تعديل إعدادات بوابة الدفع", "payment.tested": "اختبار اتصال بوابة الدفع", "staff.created": "إضافة موظف", "staff.updated": "تعديل موظف", "ai.generated": "تشغيل أداة ذكاء اصطناعي" };

const navigation: Array<{ id: Section; label: string; description: string; icon: LucideIcon; permission: AdminPermission }> = [
  { id: "paths", label: "المسارات والربط", description: "حالة التكامل مع سابق", icon: Activity, permission: "audit.view" },
  { id: "analytics", label: "زيارات الموقع", description: "الزوار والجلسات والتفاعل", icon: BarChart3, permission: "dashboard.view" },
  { id: "overview", label: "نظرة عامة", description: "مؤشرات التشغيل", icon: LayoutDashboard, permission: "dashboard.view" },
  { id: "ai", label: "أدوات الذكاء الاصطناعي", description: "مذكرات ومساعد وقوانين", icon: Sparkles, permission: "ai.use" },
  { id: "aiArchive", label: "أرشيف الذكاء", description: "كل الطلبات والنتائج", icon: History, permission: "archive.view" },
  { id: "users", label: "المستخدمون", description: "الحسابات وحدود الاستخدام", icon: UsersRound, permission: "users.view" },
  { id: "records", label: "سجل خدمات الموقع", description: "المذكرات والأسئلة والتحليلات", icon: ClipboardList, permission: "records.view" },
  { id: "appointments", label: "المواعيد", description: "طلبات الاستشارة", icon: CalendarDays, permission: "appointments.view" },
  { id: "services", label: "الخدمات والأسعار", description: "التفعيل والتسعير", icon: BadgeDollarSign, permission: "services.view" },
  { id: "payments", label: "ربط بوابة الدفع", description: "المزود والمفاتيح والاتصال", icon: CreditCard, permission: "payments.view" },
  { id: "security", label: "الحماية والأمان", description: "الطبقات والأحداث الأمنية", icon: LockKeyhole, permission: "security.view" },
  { id: "staff", label: "الموظفون والصلاحيات", description: "الأدوار والتحكم", icon: UserCog, permission: "staff.view" },
  { id: "audit", label: "سجل الإدارة", description: "التغييرات الحساسة", icon: ShieldCheck, permission: "audit.view" },
];

function can(staff: AdminStaff, permission: AdminPermission) { return staff.role === "owner" || staff.permissions.includes(permission); }
function num(value: unknown) { return new Intl.NumberFormat("ar-KW").format(Number(value || 0)); }
function formatDate(value: string) {
  if (!value) return "—";
  const date = new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("ar-KW", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers }, cache: "no-store" });
  const data = await response.json().catch(() => ({ error: "استجابة غير صالحة." }));
  if (!response.ok) throw new Error(data.error || "تعذر تنفيذ الطلب.");
  return data as T;
}
function parsePermissions(row: StaffRow) {
  if (row.role === "owner") return [...permissionList];
  try {
    const parsed = JSON.parse(row.permissions_json);
    return Array.isArray(parsed) ? parsed.filter((item): item is AdminPermission => permissionList.includes(item)) : roleTemplates[row.role];
  } catch { return roleTemplates[row.role]; }
}

export function AdminDashboard({ initialStaff }: { initialStaff: AdminStaff }) {
  const [analyticsRevision,setAnalyticsRevision] = useState(0);
  const [section, setSection] = useState<Section>("overview");
  const [theme, setTheme] = useState<Theme>("light");
  const [drawer, setDrawer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<ServiceSetting[]>([]);
  const [paymentData, setPaymentData] = useState<SadadData | null>(null);
  const [pathData, setPathData] = useState<PathData | null>(null);
  const [securityData, setSecurityData] = useState<SecurityData | null>(null);
  const [staffRows, setStaffRows] = useState<StaffRow[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [archive, setArchive] = useState<AiArchive[]>([]);
  const [userQuery, setUserQuery] = useState("");
  const [userStatus, setUserStatus] = useState("");
  const [recordType, setRecordType] = useState("");
  const [appointmentStatus, setAppointmentStatus] = useState("");
  const [archiveTool, setArchiveTool] = useState("");
  const [recordModal, setRecordModal] = useState<ServiceRecord | null>(null);
  const [archiveModal, setArchiveModal] = useState<AiArchive | null>(null);
  const [staffEditor, setStaffEditor] = useState<StaffEditor | null>(null);

  const visibleNav = useMemo(() => navigation.filter((item) => can(initialStaff, item.permission)), [initialStaff]);
  const currentNav = navigation.find((item) => item.id === section) || navigation[0];

  useEffect(() => {
    const stored = localStorage.getItem("sabeq-admin-theme") as Theme | null;
    const frame = window.requestAnimationFrame(() => setTheme(stored === "light" || stored === "dark" ? stored : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
    return () => window.cancelAnimationFrame(frame);
  }, []);
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem("sabeq-admin-theme", theme); }, [theme]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(""), 2600); return () => clearTimeout(timer); }, [toast]);

  const load = useCallback(async (target: Section) => {
    setLoading(true); setError("");
    try {
      if (target === "analytics") setAnalyticsRevision(v=>v+1);
      if (target === "overview") setDashboard(await fetchJson<DashboardData>("/api/dashboard"));
      if (target === "users") {
        const params = new URLSearchParams(); if (userQuery) params.set("q", userQuery); if (userStatus) params.set("status", userStatus);
        setUsers((await fetchJson<{ users: PublicUser[] }>(`/api/users?${params}`)).users);
      }
      if (target === "records") {
        const params = new URLSearchParams({ limit: "100" }); if (recordType) params.set("type", recordType);
        setRecords((await fetchJson<{ records: ServiceRecord[] }>(`/api/records?${params}`)).records);
      }
      if (target === "appointments") {
        const params = new URLSearchParams(); if (appointmentStatus) params.set("status", appointmentStatus);
        setAppointments((await fetchJson<{ appointments: Appointment[] }>(`/api/appointments?${params}`)).appointments);
      }
      if (target === "services") setServices((await fetchJson<{ services: ServiceSetting[] }>("/api/services")).services);
      if (target === "payments") setPaymentData(await fetchJson<SadadData>("/api/payment-gateway"));
      if (target === "paths") setPathData(await fetchJson<PathData>("/api/engineering-paths"));
      if (target === "security") setSecurityData(await fetchJson<SecurityData>("/api/security"));
      if (target === "staff") setStaffRows((await fetchJson<{ staff: StaffRow[] }>("/api/staff")).staff);
      if (target === "audit") setAudit((await fetchJson<{ audit: AuditRow[] }>("/api/audit")).audit);
      if (target === "aiArchive") {
        const params = new URLSearchParams(); if (archiveTool) params.set("tool", archiveTool);
        setArchive((await fetchJson<{ archive: AiArchive[] }>(`/api/ai-archive?${params}`)).archive);
      }
    } catch (reason) { setError(reason instanceof Error ? reason.message : "تعذر تحميل البيانات."); }
    finally { setLoading(false); }
  }, [appointmentStatus, archiveTool, recordType, userQuery, userStatus]);
  useEffect(() => {
    if (section === "ai") return;
    const frame = window.requestAnimationFrame(() => void load(section));
    return () => window.cancelAnimationFrame(frame);
  }, [section, load]);

  function navigate(target: Section) { if (target === "ai") setLoading(false); setSection(target); setDrawer(false); window.scrollTo({ top: 0, behavior: "smooth" }); }
  async function updateAppointment(id: number, status: Appointment["status"]) {
    try { await fetchJson("/api/appointments", { method: "POST", body: JSON.stringify({ id, status }) }); setAppointments((rows) => rows.map((row) => row.id === id ? { ...row, status } : row)); setToast("تم تحديث الموعد."); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "تعذر التحديث."); }
  }
  async function updateService(service: ServiceSetting) {
    try {
      await fetchJson("/api/services", { method: "POST", body: JSON.stringify({ serviceKey: service.service_key, enabled: Boolean(service.enabled), paymentRequired: Boolean(service.payment_required), priceFils: Math.max(0, Math.round(Number(service.price_fils))) }) });
      setToast("تم حفظ إعدادات الخدمة والدفع."); await load("services");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "تعذر الحفظ."); }
  }
  async function saveStaff(editor: StaffEditor) {
    try { await fetchJson("/api/staff", { method: "POST", body: JSON.stringify(editor) }); setStaffEditor(null); setToast("تم حفظ بيانات الموظف وصلاحياته."); await load("staff"); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "تعذر حفظ الموظف."); }
  }
  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    window.location.reload();
  }

  return <div className="admin-shell">
    <aside className={`sidebar ${drawer ? "open" : ""}`}>
      <div className="brand"><span><Image src="/images/brand/sabeq-logo.png" alt="شعار سابق" width={48} height={48} priority /></span><div><strong>سابق القانونية</strong><small>لوحة التحكم</small></div><button className="icon-button close-side" onClick={() => setDrawer(false)}><X /></button></div>
      <nav>{visibleNav.map((item) => { const Icon = item.icon; return <button key={item.id} className={section === item.id ? "active" : ""} onClick={() => navigate(item.id)}><Icon /><span><b>{item.label}</b><small>{item.description}</small></span></button>; })}</nav>
      <div className="account"><CircleUserRound /><div><strong>{initialStaff.name}</strong><small>{roleLabels[initialStaff.role]}</small></div><button onClick={() => void signOut()} aria-label="تسجيل الخروج"><LogOut /></button></div>
    </aside>
    {drawer && <button className="scrim" onClick={() => setDrawer(false)} aria-label="إغلاق القائمة" />}
    <main className="main-panel">
      <header className="topbar"><div className="title-group"><button className="icon-button open-side" onClick={() => setDrawer(true)}><Menu /></button><div><span>النظام الإداري المستقل</span><h1>{currentNav.label}</h1></div></div><div className="top-actions"><button className="icon-button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="تغيير المظهر">{theme === "dark" ? <Sun /> : <Moon />}</button><button className="refresh" onClick={() => void load(section)} disabled={loading || section === "ai"}><RefreshCw className={loading ? "spin" : ""} /><span>تحديث</span></button></div></header>
      <div className="content"><div className="intro"><div><p className="eyebrow">إدارة آمنة ومركزية</p><h2>{currentNav.label}</h2><p>{currentNav.description}</p></div><span className="secure"><ShieldCheck />جلسة إدارية موثقة</span></div>
        {error && <div className="error"><span>{error}</span><button onClick={() => setError("")}><X /></button></div>}
        {loading && <Loading />}
        {!loading && section === "paths" && pathData && <EngineeringPathsView data={pathData} />}
        {!loading && section === "analytics" && <AnalyticsView revision={analyticsRevision} />}
        {!loading && section === "overview" && dashboard && <Overview data={dashboard} navigate={navigate} />}
        {!loading && section === "ai" && <AiTools onDone={() => setToast("تم التنفيذ والحفظ في الأرشيف.")} onError={setError} />}
        {!loading && section === "aiArchive" && <ArchiveView rows={archive} tool={archiveTool} setTool={setArchiveTool} reload={() => void load("aiArchive")} open={setArchiveModal} />}
        {!loading && section === "users" && <UsersView rows={users} query={userQuery} status={userStatus} setQuery={setUserQuery} setStatus={setUserStatus} reload={() => void load("users")} manage={can(initialStaff, "users.manage")} done={() => { setToast("تم حفظ حساب المستخدم."); void load("users"); }} fail={setError} />}
        {!loading && section === "records" && <RecordsView rows={records} type={recordType} setType={setRecordType} reload={() => void load("records")} open={setRecordModal} />}
        {!loading && section === "appointments" && <AppointmentsView rows={appointments} status={appointmentStatus} setStatus={setAppointmentStatus} reload={() => void load("appointments")} manage={can(initialStaff, "appointments.manage")} update={updateAppointment} />}
        {!loading && section === "services" && <ServicesView rows={services} setRows={setServices} manage={can(initialStaff, "services.manage")} save={updateService} />}
        {!loading && section === "payments" && paymentData && <PaymentGatewayView key={`${paymentData.gateway.updatedAt || "new"}-${paymentData.gateway.lastTestedAt || "untested"}`} data={paymentData} manage={can(initialStaff, "payments.manage")} reload={() => void load("payments")} done={setToast} fail={setError} />}
        {!loading && section === "security" && securityData && <SecurityView data={securityData} />}
        {!loading && section === "staff" && <StaffView rows={staffRows} manage={can(initialStaff, "staff.manage")} add={() => setStaffEditor(emptyStaff())} edit={(row) => setStaffEditor(fromStaff(row))} />}
        {!loading && section === "audit" && <AuditView rows={audit} />}
      </div>
    </main>
    {recordModal && <TextModal title={recordModal.title || recordNames[recordModal.service_type]} meta={`${recordModal.user_name} · ${formatDate(recordModal.created_at)}`} blocks={[{ title: "المدخلات والوقائع", text: recordModal.input_text || "لا توجد مدخلات محفوظة." }, { title: "الناتج المحفوظ", text: recordModal.output_text || "لا يوجد ناتج محفوظ." }]} close={() => setRecordModal(null)} />}
    {archiveModal && <TextModal title={archiveModal.title} meta={`${archiveModal.staff_email} · ${formatDate(archiveModal.created_at)}`} blocks={[{ title: "البيانات المدخلة", text: prettyJson(archiveModal.input_json) }, { title: "الناتج الكامل", text: archiveModal.output_text }]} close={() => setArchiveModal(null)} />}
    {staffEditor && <StaffModal value={staffEditor} setValue={setStaffEditor} close={() => setStaffEditor(null)} save={saveStaff} />}
    {toast && <div className="toast"><Check />{toast}</div>}
  </div>;
}

function Loading() { return <div className="loading"><i /><i /><i /><i /></div>; }
function Empty({ text }: { text: string }) { return <div className="empty"><FileSearch /><p>{text}</p></div>; }
function Filter({ children }: { children: ReactNode }) { return <div className="filter">{children}</div>; }
function Select({ value, onChange, children }: { value: string; onChange: (value: string) => void; children: ReactNode }) { return <label className="select"><select value={value} onChange={(event) => onChange(event.target.value)}>{children}</select><ChevronDown /></label>; }
function Panel({ title, icon: Icon, action, children }: { title: string; icon: LucideIcon; action?: ReactNode; children: ReactNode }) { return <section className="panel"><header><div><span><Icon /></span><h3>{title}</h3></div>{action}</header>{children}</section>; }

function Overview({ data, navigate }: { data: DashboardData; navigate: (section: Section) => void }) {
  const stats = [
    ["إجمالي المستخدمين", data.users.total, `${num(data.users.active)} نشط`, UsersRound, "users"],
    ["طلبات الاستشارة", data.appointments.total, `${num(data.appointments.pending)} جديد`, CalendarDays, "appointments"],
    ["المذكرات هذا الشهر", data.activities.memos, "سجلات محفوظة", FileText, "records"],
    ["الأسئلة والتحليلات", Number(data.activities.questions) + Number(data.activities.analyses), `${num(data.activities.analyses)} تحليل`, BarChart3, "records"],
  ] as const;
  return <><div className="stats">{stats.map(([label, value, note, Icon, target]) => <button key={label} onClick={() => navigate(target)}><span><Icon /></span><b>{num(value)}</b><strong>{label}</strong><small>{note}</small></button>)}</div><div className="split"><Panel title="أحدث المواعيد" icon={CalendarDays} action={<button onClick={() => navigate("appointments")}>عرض الكل</button>}><div className="compact">{data.recentAppointments.length ? data.recentAppointments.map((row) => <div key={row.id}><i className={row.status} /><span><b>{row.name}</b><small>{row.case_type} · {formatDate(row.created_at)}</small></span><em className={`badge ${row.status}`}>{statusLabels[row.status]}</em></div>) : <Empty text="لا توجد مواعيد." />}</div></Panel><Panel title="أحدث السجلات" icon={Activity} action={<button onClick={() => navigate("records")}>عرض السجل</button>}><div className="compact">{data.recentRecords.length ? data.recentRecords.map((row) => <div key={row.id}><span className="mini-icon"><FileText /></span><span><b>{recordNames[row.service_type] || row.title}</b><small>{row.user_name} · {formatDate(row.created_at)}</small></span></div>) : <Empty text="لا توجد سجلات." />}</div></Panel></div><Panel title="حالة الخدمات والدفع" icon={Settings2} action={<button onClick={() => navigate("services")}>إدارة الخدمات</button>}><div className="service-summary">{data.settings.map((row) => <div key={row.service_key}><i className={row.enabled ? "active" : "suspended"} /><span><b>{serviceNames[row.service_key] || row.service_key}</b><small>{row.enabled ? "مفعلة" : "متوقفة"} · {row.payment_required ? `دفع ${(Number(row.price_fils) / 1000).toFixed(3)} د.ك` : "بدون دفع"}</small></span></div>)}</div></Panel></>;
}

function AiTools({ onDone, onError }: { onDone: () => void; onError: (message: string) => void }) {
  const [tool, setTool] = useState<Tool>("assistant");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AiResponse | null>(null);
  const [assistant, setAssistant] = useState("");
  const [lawQuery, setLawQuery] = useState("");
  const [memo, setMemo] = useState({ caseType: "", court: "", caseNumber: "", clientName: "", partyRole: "", otherParty: "", allParties: "", facts: "", requests: "", legalIssues: "" });
  async function run(payload: Record<string, unknown>) {
    setBusy(true); setResult(null);
    try { const response = await fetchJson<AiResponse>("/api/ai", { method: "POST", body: JSON.stringify(payload) }); setResult(response); onDone(); }
    catch (reason) { onError(reason instanceof Error ? reason.message : "تعذر تنفيذ الأداة."); }
    finally { setBusy(false); }
  }
  return <div className="ai-workspace"><div className="tool-tabs"><button className={tool === "assistant" ? "active" : ""} onClick={() => setTool("assistant")}><Sparkles />المساعد القانوني</button><button className={tool === "memo" ? "active" : ""} onClick={() => setTool("memo")}><FileText />مولد المذكرات</button><button className={tool === "laws" ? "active" : ""} onClick={() => setTool("laws")}><Scale />القوانين</button></div><div className="ai-layout"><section className="ai-form"><header><span>{tool === "assistant" ? <Sparkles /> : tool === "memo" ? <FileText /> : <Scale />}</span><div><h3>{toolNames[tool]}</h3><p>كل طلب ونتيجته يحفظان تلقائيًا في الأرشيف.</p></div></header>{tool === "assistant" && <><label><span>السؤال القانوني</span><textarea rows={8} value={assistant} onChange={(event) => setAssistant(event.target.value)} placeholder="اكتب سؤالك مع الوقائع الأساسية..." /></label><button className="primary-button full" disabled={busy || assistant.trim().length < 4} onClick={() => void run({ tool, question: assistant })}><Send />{busy ? "جارٍ التحليل" : "إرسال للمساعد"}</button></>}{tool === "laws" && <><label><span>ابحث في القوانين والتشريعات</span><textarea rows={5} value={lawQuery} onChange={(event) => setLawQuery(event.target.value)} placeholder="مثال: وقف النفاذ في الاستئناف" /></label><button className="primary-button full" disabled={busy || lawQuery.trim().length < 2} onClick={() => void run({ tool, query: lawQuery })}><Search />{busy ? "جارٍ البحث" : "بحث موثق"}</button></>}{tool === "memo" && <div className="memo-form"><div className="form-grid">{([['caseType','نوع القضية'],['court','المحكمة'],['caseNumber','رقم القضية (اختياري)'],['clientName','اسم الموكل'],['partyRole','صفة الموكل'],['otherParty','الخصم']] as const).map(([key, label]) => <label key={key}><span>{label}</span><input value={memo[key]} onChange={(event) => setMemo({ ...memo, [key]: event.target.value })} /></label>)}</div><label><span>جميع الأطراف والصفات</span><textarea rows={3} value={memo.allParties} onChange={(event) => setMemo({ ...memo, allParties: event.target.value })} /></label><label><span>الوقائع</span><textarea rows={8} value={memo.facts} onChange={(event) => setMemo({ ...memo, facts: event.target.value })} /></label><label><span>الطلبات</span><textarea rows={5} value={memo.requests} onChange={(event) => setMemo({ ...memo, requests: event.target.value })} /></label><label><span>المسائل القانونية</span><textarea rows={4} value={memo.legalIssues} onChange={(event) => setMemo({ ...memo, legalIssues: event.target.value })} /></label><button className="primary-button full" disabled={busy || memo.facts.trim().length < 20 || memo.requests.trim().length < 5 || !memo.caseType || !memo.court || !memo.clientName || !memo.partyRole || !memo.otherParty} onClick={() => void run({ tool, ...memo })}><FileText />{busy ? "جارٍ توليد المذكرة" : "توليد وحفظ المذكرة"}</button></div>}</section><section className="ai-result"><header><BookOpen /><div><h3>النتيجة</h3><p>محتوى عمل داخلي يحتاج مراجعة مهنية.</p></div></header>{busy ? <div className="ai-busy"><Sparkles /><p>جارٍ الاستناد إلى قاعدة القوانين...</p></div> : result ? <><pre>{result.output}</pre>{(result.sources || result.results || []).length > 0 && <div className="sources"><h4>المصادر والنتائج</h4>{(result.sources || result.results || []).map((source, index) => <article key={`${source.title}-${index}`}><b>{source.title}</b><span>{source.category}{source.lawNumber ? ` · ${source.lawNumber}/${source.lawYear}` : ""}</span>{source.summary && <p>{source.summary}</p>}</article>)}</div>}<span className="archived"><Check />حُفظت العملية كاملة في الأرشيف</span></> : <Empty text="ستظهر النتيجة هنا بعد تشغيل الأداة." />}</section></div></div>;
}

function ArchiveView({ rows, tool, setTool, reload, open }: { rows: AiArchive[]; tool: string; setTool: (value: string) => void; reload: () => void; open: (row: AiArchive) => void }) {
  return <><Filter><Select value={tool} onChange={setTool}><option value="">كل الأدوات</option><option value="assistant">المساعد القانوني</option><option value="memo">مولد المذكرات</option><option value="laws">القوانين</option></Select><button className="primary-button" onClick={reload}><Search />تصفية</button></Filter><div className="records">{rows.length ? rows.map((row) => <button key={row.id} onClick={() => open(row)}><span className="record-icon">{row.tool_type === "memo" ? <FileText /> : row.tool_type === "laws" ? <Scale /> : <Sparkles />}</span><span><em className="badge neutral">{toolNames[row.tool_type]}</em><h3>{row.title}</h3><p>نفّذ بواسطة <bdi>{row.staff_email}</bdi></p><small>{formatDate(row.created_at)}</small></span><FileSearch /></button>) : <Empty text="لا توجد عمليات محفوظة." />}</div></>;
}

function UsersView({ rows, query, status, setQuery, setStatus, reload, manage, done, fail }: { rows: PublicUser[]; query: string; status: string; setQuery: (value: string) => void; setStatus: (value: string) => void; reload: () => void; manage: boolean; done: () => void; fail: (message: string) => void }) {
  return <><Filter><label className="search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === "Enter" && reload()} placeholder="الاسم أو الهاتف أو البريد" /></label><Select value={status} onChange={setStatus}><option value="">كل الحالات</option><option value="active">نشط</option><option value="suspended">موقوف</option></Select><button className="primary-button" onClick={reload}><Search />بحث</button></Filter><div className="user-list">{rows.length ? rows.map((row) => <UserCard key={row.id} row={row} manage={manage} done={done} fail={fail} />) : <Empty text="لا يوجد مستخدمون مطابقون." />}</div></>;
}
function UserCard({ row, manage, done, fail }: { row: PublicUser; manage: boolean; done: () => void; fail: (message: string) => void }) {
  const [status, setStatus] = useState(row.status); const [memo, setMemo] = useState(Number(row.memo_limit)); const [assistant, setAssistant] = useState(Number(row.assistant_limit)); const [busy, setBusy] = useState(false);
  async function save() { setBusy(true); try { await fetchJson("/api/users", { method: "POST", body: JSON.stringify({ id: row.id, status, memoLimit: memo, assistantLimit: assistant }) }); done(); } catch (reason) { fail(reason instanceof Error ? reason.message : "تعذر الحفظ."); } finally { setBusy(false); } }
  return <article><div className="identity"><span className="avatar">{row.name.charAt(0)}</span><div><h3>{row.name}</h3><small><bdi>{row.email}</bdi></small><small><bdi>{row.phone}</bdi></small></div></div><div className="usage"><span>المذكرات</span><b>{num(row.memo_used)} / {memo < 0 ? "∞" : num(memo)}</b><progress max={memo > 0 ? memo : 1} value={memo > 0 ? Math.min(row.memo_used, memo) : 0} /></div><div className="usage"><span>المساعد</span><b>{num(row.assistant_used)} / {assistant < 0 ? "∞" : num(assistant)}</b><progress max={assistant > 0 ? assistant : 1} value={assistant > 0 ? Math.min(row.assistant_used, assistant) : 0} /></div><div className="controls"><label><span>الحالة</span><select disabled={!manage} value={status} onChange={(event) => setStatus(event.target.value as PublicUser["status"])}><option value="active">نشط</option><option value="suspended">موقوف</option></select></label><label><span>حد المذكرات</span><input disabled={!manage} type="number" min="-1" max="500" value={memo} onChange={(event) => setMemo(Number(event.target.value))} /></label><label><span>حد المساعد</span><input disabled={!manage} type="number" min="-1" max="5000" value={assistant} onChange={(event) => setAssistant(Number(event.target.value))} /></label>{manage && <button className="save-button" disabled={busy} onClick={() => void save()}><Save />حفظ</button>}</div></article>;
}

function RecordsView({ rows, type, setType, reload, open }: { rows: ServiceRecord[]; type: string; setType: (value: string) => void; reload: () => void; open: (row: ServiceRecord) => void }) {
  return <><Filter><Select value={type} onChange={setType}><option value="">كل السجلات</option><option value="memo">المذكرات</option><option value="assistant">الأسئلة</option><option value="document_analysis">تحليل المستندات</option><option value="draft_tool">أدوات الصياغة</option></Select><button className="primary-button" onClick={reload}><FileSearch />تصفية</button></Filter><div className="records">{rows.length ? rows.map((row) => <button key={row.id} onClick={() => open(row)}><span className="record-icon"><FileText /></span><span><em className="badge neutral">{recordNames[row.service_type] || row.service_type}</em><h3>{row.title || "سجل خدمة"}</h3><p>{row.user_name} · <bdi>{row.user_email}</bdi></p><small>{formatDate(row.created_at)}</small></span><FileSearch /></button>) : <Empty text="لا توجد سجلات مطابقة." />}</div></>;
}

function AppointmentsView({ rows, status, setStatus, reload, manage, update }: { rows: Appointment[]; status: string; setStatus: (value: string) => void; reload: () => void; manage: boolean; update: (id: number, status: Appointment["status"]) => void }) {
  return <><Filter><Select value={status} onChange={setStatus}><option value="">كل المواعيد</option><option value="new">جديد</option><option value="confirmed">مؤكد</option><option value="completed">مكتمل</option><option value="cancelled">ملغي</option></Select><button className="primary-button" onClick={reload}><CalendarDays />تصفية</button></Filter><div className="appointments">{rows.length ? rows.map((row) => <article key={row.id}><header><div className="identity"><span className="avatar">{row.name.charAt(0)}</span><div><h3>{row.name}</h3><small>{formatDate(row.created_at)}</small></div></div><em className={`badge ${row.status}`}>{statusLabels[row.status]}</em></header><dl><div><dt>نوع القضية</dt><dd>{row.case_type}</dd></div><div><dt>التواصل</dt><dd>{row.preferred_contact}</dd></div><div><dt>الهاتف</dt><dd><bdi>{row.phone}</bdi></dd></div><div><dt>البريد</dt><dd><bdi>{row.email}</bdi></dd></div></dl>{row.message && <p className="message">{row.message}</p>}{manage && <label className="status-control"><span>الحالة</span><select value={row.status} onChange={(event) => update(row.id, event.target.value as Appointment["status"])}><option value="new">جديد</option><option value="confirmed">مؤكد</option><option value="completed">مكتمل</option><option value="cancelled">ملغي</option></select></label>}</article>) : <Empty text="لا توجد مواعيد مطابقة." />}</div></>;
}

function ServicesView({ rows, setRows, manage, save }: { rows: ServiceSetting[]; setRows: (rows: ServiceSetting[]) => void; manage: boolean; save: (row: ServiceSetting) => void }) {
  function patch(key: string, value: Partial<ServiceSetting>) { setRows(rows.map((row) => row.service_key === key ? { ...row, ...value } : row)); }
  return <div className="services">{rows.map((row) => <article key={row.service_key}><header><span><Settings2 /></span><div><h3>{serviceNames[row.service_key]}</h3><p>التشغيل والدفع لهذه الخدمة فقط</p></div></header><div className="toggle-row"><span><b>تفعيل الخدمة</b><small>السماح باستخدامها</small></span><button className={`toggle ${row.enabled ? "on" : ""}`} disabled={!manage} onClick={() => patch(row.service_key, { enabled: row.enabled ? 0 : 1 })}><i /></button></div><div className="toggle-row"><span><b>اشتراط الدفع</b><small>منع التنفيذ قبل الدفع</small></span><button className={`toggle ${row.payment_required ? "on" : ""}`} disabled={!manage} onClick={() => patch(row.service_key, { payment_required: row.payment_required ? 0 : 1 })}><i /></button></div><label className="price"><span>السعر بالدينار</span><div><input type="number" step="0.001" min="0" disabled={!manage || !row.payment_required} value={(Number(row.price_fils) / 1000).toFixed(3)} onChange={(event) => patch(row.service_key, { price_fils: Math.round(Number(event.target.value) * 1000) })} /><b>د.ك</b></div></label>{manage && <button className="save-button full" onClick={() => save(row)}><Save />حفظ الإعدادات</button>}</article>)}</div>;
}

const providerNames: Record<PaymentGateway["provider"], string> = { myfatoorah: "ماي فاتورة", tap: "Tap Payments", upayments: "UPayments" };
const methodNames: Record<string, string> = { knet: "كي نت", cards: "Visa / Mastercard", apple_pay: "Apple Pay", google_pay: "Google Pay", samsung_pay: "Samsung Pay" };
const connectionNames: Record<string, string> = { unconfigured: "غير مهيأة", untested: "محفوظة ولم تُختبر", connected: "متصلة", failed: "فشل الاتصال" };
const gatewayErrorNames: Record<string, string> = {
  invalid_credentials: "المفتاح مرفوض من مزود الدفع.", provider_rate_limit: "مزود الدفع طلب الانتظار قبل الاختبار مجدداً.",
  provider_unavailable: "خدمة مزود الدفع غير متاحة مؤقتاً.", network_error: "تعذر الوصول إلى مزود الدفع.",
  live_endpoint_confirmation_required: "يلزم تأكيد عنوان الإنتاج من UPayments قبل اختبار الوضع الفعلي.",
  myfatoorah_rejected_request: "رفضت ماي فاتورة طلب الاختبار.", tap_rejected_request: "رفض Tap طلب الاختبار.", upayments_rejected_request: "رفض UPayments طلب الاختبار.",
};

function PaymentGatewayView({ data, manage, reload, done, fail }: { data: PaymentData; manage: boolean; reload: () => void; done: (text: string) => void; fail: (text: string) => void }) {
  const [draft, setDraft] = useState({
    provider: data.gateway.provider, mode: data.gateway.mode, enabled: data.gateway.enabled,
    apiKey: "", merchantId: data.gateway.merchantId, publicKey: data.gateway.publicKey, methods: [...data.gateway.methods],
  });
  const [busy, setBusy] = useState<"save" | "test" | "">("");

  function toggleMethod(method: string) {
    setDraft((current) => ({ ...current, methods: current.methods.includes(method) ? current.methods.filter((item) => item !== method) : [...current.methods, method] }));
  }

  async function save() {
    setBusy("save");
    try {
      await fetchJson("/api/payment-gateway", { method: "POST", body: JSON.stringify({ action: "save", ...draft }) });
      done("تم حفظ إعدادات بوابة الدفع وتشفير المفتاح."); reload();
    } catch (reason) { fail(reason instanceof Error ? reason.message : "تعذر حفظ إعدادات الدفع."); }
    finally { setBusy(""); }
  }

  async function test() {
    setBusy("test");
    try {
      const result = await fetchJson<{ ok: boolean; code: string }>("/api/payment-gateway", { method: "POST", body: JSON.stringify({ action: "test" }) });
      if (result.ok) done("نجح اختبار الاتصال ببوابة الدفع.");
      else fail(gatewayErrorNames[result.code] || "فشل اختبار الاتصال ببوابة الدفع.");
      reload();
    } catch (reason) { fail(reason instanceof Error ? reason.message : "تعذر اختبار الاتصال."); }
    finally { setBusy(""); }
  }

  const statusClass = data.gateway.connectionStatus === "connected" ? "connected" : data.gateway.connectionStatus === "failed" ? "failed" : "pending";
  return <div className="payment-workspace">
    <section className="payment-status-card">
      <div className={`gateway-state ${statusClass}`}><span><CreditCard /></span><div><small>حالة الربط</small><h3>{connectionNames[data.gateway.connectionStatus]}</h3><p>{providerNames[data.gateway.provider]} · {data.gateway.mode === "live" ? "تشغيل فعلي" : "وضع اختباري"}</p></div></div>
      <dl><div><dt>المفتاح</dt><dd>{data.gateway.hasApiKey ? data.gateway.apiKeyMask : "غير محفوظ"}</dd></div><div><dt>آخر اختبار</dt><dd>{data.gateway.lastTestedAt ? formatDate(data.gateway.lastTestedAt) : "لم يُختبر"}</dd></div><div><dt>آخر تعديل</dt><dd>{data.gateway.updatedAt ? formatDate(data.gateway.updatedAt) : "—"}</dd></div></dl>
      {data.gateway.lastErrorCode && <p className="gateway-warning"><ShieldAlert />{gatewayErrorNames[data.gateway.lastErrorCode] || "تحتاج إعدادات الربط إلى مراجعة."}</p>}
    </section>

    <section className="gateway-form-card">
      <header><span><KeyRound /></span><div><h3>بيانات مزود الدفع</h3><p>المفتاح يُشفّر في الخادم ولا يُعاد عرضه بعد الحفظ.</p></div></header>
      <div className="form-grid gateway-grid">
        <label><span>مزود الدفع</span><select disabled={!manage} value={draft.provider} onChange={(event) => setDraft({ ...draft, provider: event.target.value as PaymentGateway["provider"] })}><option value="myfatoorah">ماي فاتورة</option><option value="tap">Tap Payments</option><option value="upayments">UPayments</option></select></label>
        <label><span>بيئة التشغيل</span><div className="mode-switch"><button type="button" disabled={!manage} className={draft.mode === "test" ? "active" : ""} onClick={() => setDraft({ ...draft, mode: "test" })}>اختبار</button><button type="button" disabled={!manage} className={draft.mode === "live" ? "active live" : ""} onClick={() => setDraft({ ...draft, mode: "live" })}>فعلي</button></div></label>
        <label className="wide"><span>مفتاح API السري</span><input type="password" dir="ltr" disabled={!manage} autoComplete="new-password" value={draft.apiKey} placeholder={data.gateway.hasApiKey ? `${data.gateway.apiKeyMask} — اتركه فارغاً للاحتفاظ به` : "ألصق المفتاح السري هنا"} onChange={(event) => setDraft({ ...draft, apiKey: event.target.value.trim() })} /><small>لن يظهر المفتاح في السجل أو في الواجهة بعد الحفظ.</small></label>
        <label><span>معرف التاجر</span><input dir="ltr" disabled={!manage} value={draft.merchantId} placeholder="اختياري حسب المزود" onChange={(event) => setDraft({ ...draft, merchantId: event.target.value.trim() })} /></label>
        <label><span>المفتاح العام</span><input dir="ltr" disabled={!manage} value={draft.publicKey} placeholder="اختياري" onChange={(event) => setDraft({ ...draft, publicKey: event.target.value.trim() })} /></label>
      </div>
      <div className="payment-methods"><div><h4>وسائل الدفع</h4><p>فعّل الوسائل المتاحة في حساب التاجر فقط.</p></div><div>{Object.keys(methodNames).map((method) => <button type="button" disabled={!manage} key={method} className={draft.methods.includes(method) ? "selected" : ""} onClick={() => toggleMethod(method)}><span>{draft.methods.includes(method) && <Check />}</span>{methodNames[method]}</button>)}</div></div>
      <div className="gateway-enable"><div><b>تشغيل بوابة الدفع</b><small>لا تجعلها فعالة قبل نجاح الاختبار في البيئة المطلوبة.</small></div><button type="button" aria-label="تشغيل بوابة الدفع" className={`toggle ${draft.enabled ? "on" : ""}`} disabled={!manage} onClick={() => setDraft({ ...draft, enabled: !draft.enabled })}><i /></button></div>
      {manage && <footer><button className="secondary-button" disabled={Boolean(busy) || !data.gateway.hasApiKey} onClick={() => void test()}><RefreshCw className={busy === "test" ? "spin" : ""} />اختبار الاتصال</button><button className="primary-button" disabled={Boolean(busy)} onClick={() => void save()}><Save />{busy === "save" ? "جارٍ الحفظ" : "حفظ وتشفير"}</button></footer>}
    </section>

    <Panel title="آخر عمليات الدفع" icon={BadgeDollarSign}>{data.transactions.length ? <div className="payment-transactions">{data.transactions.map((row) => <div key={row.id}><span className={`transaction-dot ${row.status}`} /><div><b>{serviceNames[row.service_key] || row.service_key}</b><small>{formatDate(row.created_at)} · {providerNames[row.provider as PaymentGateway["provider"]] || row.provider}</small></div><strong>{(Number(row.amount_fils) / 1000).toFixed(3)} {row.currency}</strong><em className={`badge ${row.status}`}>{statusLabels[row.status] || row.status}</em></div>)}</div> : <Empty text="لا توجد عمليات دفع مسجلة حتى الآن." />}</Panel>
  </div>;
}

function SecurityView({ data }: { data: SecurityData }) {
  const adminEvents = data.admin.events.map((event) => ({ ...event, scope: "لوحة التحكم" }));
  const publicEvents = (data.public.events || []).map((event) => ({ ...event, scope: "الموقع العام" }));
  const events = [...adminEvents, ...publicEvents].sort((left, right) => String(right.created_at).localeCompare(String(left.created_at))).slice(0, 100);
  const lastDay = Number(data.admin.totals?.last_day || 0) + Number(data.public.totals?.last_day || 0);
  const critical = Number(data.admin.totals?.critical_last_day || 0) + Number(data.public.totals?.critical_last_day || 0);
  return <div className="security-workspace">
    <div className="security-summary"><article><span><LockKeyhole /></span><div><small>طبقات الحماية</small><b>مفعّلة</b><p>رؤوس أمان، منع التضمين، والتحقق من المصدر.</p></div></article><article><span><ShieldCheck /></span><div><small>الجلسات الإدارية</small><b>مشفّرة</b><p>جلسة آمنة، انتهاء تلقائي، ورمز دخول لمرة واحدة.</p></div></article><article><span><Activity /></span><div><small>أحداث آخر 24 ساعة</small><b>{num(lastDay)}</b><p>{critical ? `${num(critical)} أحداث حرجة تحتاج مراجعة` : "لا توجد أحداث حرجة مسجلة"}</p></div></article></div>
    <Panel title="الحماية المطبقة" icon={ShieldCheck}><div className="protection-grid"><div><Check /><span><b>منع محاولات التخمين</b><small>حدود مستقلة حسب الجهاز والبريد والمسار.</small></span></div><div><Check /><span><b>حماية الجلسات</b><small>رموز مشفّرة، انتهاء خمول، وجلسة واحدة للمستخدم.</small></span></div><div><Check /><span><b>حماية الطلبات</b><small>رفض المصادر غير المصرح بها والأحجام غير المتوقعة.</small></span></div><div><Check /><span><b>فحص المستندات</b><small>الامتداد والنوع والتوقيع الفعلي قبل التحليل.</small></span></div><div><Check /><span><b>حماية العرض</b><small>منع Clickjacking وتقييد السكربتات والموارد.</small></span></div><div><Check /><span><b>حماية أسرار الدفع</b><small>تشفير AES-GCM وعدم إعادة المفاتيح للمتصفح.</small></span></div></div></Panel>
    <Panel title="سجل الأحداث الأمنية" icon={ShieldAlert}>{events.length ? <div className="security-events">{events.map((event) => <div key={`${event.scope}-${event.id}`}><span className={`severity ${event.severity}`}><ShieldAlert /></span><div><b>{event.event_type}</b><p>{event.scope} · {event.route || "—"}</p><small>{event.detail_code || "بدون تفاصيل إضافية"}</small></div><time>{formatDate(event.created_at)}</time></div>)}</div> : <Empty text="لا توجد أحداث أمنية مسجلة." />}</Panel>
  </div>;
}

type StaffEditor = { id: string; name: string; email: string; role: AdminRole; status: "active" | "suspended"; permissions: AdminPermission[] };
function emptyStaff(): StaffEditor { return { id: "", name: "", email: "", role: "support", status: "active", permissions: [...roleTemplates.support] }; }
function fromStaff(row: StaffRow): StaffEditor { return { id: row.id, name: row.name, email: row.email, role: row.role, status: row.status, permissions: parsePermissions(row) }; }
function StaffView({ rows, manage, add, edit }: { rows: StaffRow[]; manage: boolean; add: () => void; edit: (row: StaffRow) => void }) {
  return <><div className="section-head"><div><h3>فريق الإدارة</h3><p>دور وصلاحيات مستقلة لكل موظف.</p></div>{manage && <button className="primary-button" onClick={add}><UserCog />إضافة موظف</button>}</div><div className="staff">{rows.map((row) => <article key={row.id}><header><span className="avatar large">{row.name.charAt(0)}</span><div><h3>{row.name}</h3><p><bdi>{row.email}</bdi></p></div><em className={`badge ${row.status}`}>{statusLabels[row.status]}</em></header><div className="role"><ShieldCheck /><span><small>الدور</small><b>{roleLabels[row.role]}</b></span></div><div className="chips">{parsePermissions(row).slice(0, 4).map((permission) => <span key={permission}>{permissionLabels[permission]}</span>)}{parsePermissions(row).length > 4 && <span>+{parsePermissions(row).length - 4}</span>}</div>{manage && <button className="secondary-button full" onClick={() => edit(row)}><Pencil />تعديل الصلاحيات</button>}</article>)}</div></>;
}

function AuditView({ rows }: { rows: AuditRow[] }) { return <Panel title="سجل التغييرات الإدارية" icon={ShieldCheck}><div className="audit">{rows.length ? rows.map((row) => <div key={row.id}><span><Activity /></span><div><b>{auditLabels[row.action] || row.action}</b><p>بواسطة <bdi>{row.staff_email}</bdi></p><small>{formatDate(row.created_at)} · {row.target_type} {row.target_id && `#${row.target_id.slice(0, 10)}`}</small></div></div>) : <Empty text="لا توجد تغييرات مسجلة." />}</div></Panel>; }

function TextModal({ title, meta, blocks, close }: { title: string; meta: string; blocks: Array<{ title: string; text: string }>; close: () => void }) { return <div className="modal-bg" onMouseDown={(event) => event.target === event.currentTarget && close()}><section className="modal text-modal"><header><div><h2>{title}</h2><p>{meta}</p></div><button className="icon-button" onClick={close}><X /></button></header>{blocks.map((block) => <div className="text-block" key={block.title}><h3>{block.title}</h3><pre>{block.text}</pre></div>)}</section></div>; }
function prettyJson(value: string) { try { return JSON.stringify(JSON.parse(value), null, 2); } catch { return value; } }
function StaffModal({ value, setValue, close, save }: { value: StaffEditor; setValue: (value: StaffEditor) => void; close: () => void; save: (value: StaffEditor) => void }) {
  function role(role: AdminRole) { setValue({ ...value, role, permissions: [...roleTemplates[role]] }); }
  function toggle(permission: AdminPermission) { setValue({ ...value, permissions: value.permissions.includes(permission) ? value.permissions.filter((item) => item !== permission) : [...value.permissions, permission] }); }
  const valid = value.name.trim().length >= 2 && /^\S+@\S+\.\S+$/.test(value.email);
  return <div className="modal-bg" onMouseDown={(event) => event.target === event.currentTarget && close()}><section className="modal staff-modal"><header><div><p className="eyebrow">صلاحيات الموظفين</p><h2>{value.id ? "تعديل الموظف" : "إضافة موظف"}</h2></div><button className="icon-button" onClick={close}><X /></button></header><div className="form-grid"><label><span>الاسم الكامل</span><input value={value.name} onChange={(event) => setValue({ ...value, name: event.target.value })} /></label><label><span>البريد الإلكتروني</span><input type="email" dir="ltr" value={value.email} onChange={(event) => setValue({ ...value, email: event.target.value.trim() })} /></label><label><span>الدور</span><select value={value.role} onChange={(event) => role(event.target.value as AdminRole)}><option value="owner">مالك النظام</option><option value="admin">مدير</option><option value="lawyer">محامٍ</option><option value="support">خدمة العملاء</option><option value="finance">المالية</option></select></label><label><span>الحالة</span><select value={value.status} onChange={(event) => setValue({ ...value, status: event.target.value as StaffEditor["status"] })}><option value="active">نشط</option><option value="suspended">موقوف</option></select></label></div><div className="permission-box"><h3>الصلاحيات التفصيلية</h3><p>اختر فقط ما يحتاجه الموظف.</p><div>{permissionList.map((permission) => <label key={permission} className={value.permissions.includes(permission) ? "checked" : ""}><input type="checkbox" checked={value.permissions.includes(permission)} disabled={value.role === "owner"} onChange={() => toggle(permission)} /><span><Check /></span><b>{permissionLabels[permission]}</b></label>)}</div></div><footer><button className="secondary-button" onClick={close}>إلغاء</button><button className="primary-button" disabled={!valid} onClick={() => save(value)}><Save />حفظ</button></footer></section></div>;
}

type PathData = {checkedAt:string;connection:{database:boolean};paths:Array<{id:string;name:string;kind:string;purpose:string;status:string}>;notice:string};
function EngineeringPathsView({data}:{data:PathData}) {
  const labels:Record<string,string>={installed:'مثبت — أدوات تطوير',available:'متاح في الخادم',configured:'مهيأ — يحتاج اختباراً حياً',needs_configuration:'يحتاج إعداداً',unavailable:'تعذر التحقق'};
  return <Panel title="المسارات والربط مع سابق" icon={Activity}><p>قاعدة البيانات: {data.connection.database?'متصلة':'تعذر التحقق'} · آخر فحص: {formatDate(data.checkedAt)}</p><div className="form-grid">{data.paths.map(path=><section key={path.id} className="text-block"><h3>{path.name}</h3><p>{path.purpose}</p><strong>{labels[path.status]||path.status}</strong></section>)}</div><p>{data.notice}</p></Panel>;
}
type SadadData = {environment:string;priceFils:number;currency:string;required:boolean;publicCheckoutEnabled:boolean;hasCredentials:boolean;ready:boolean;testedAt:string|null;accountConfirmed:boolean;callbacksConfirmed:boolean;successUrl:string;failedUrl:string;webhookUrl:string;payments:Array<{id:string;reference:string;status:string;amount_fils:number;created_at:string}>};
function SadadGatewayView({data,manage,reload,done,fail}:{data:SadadData;manage:boolean;reload:()=>void;done:(s:string)=>void;fail:(s:string)=>void}) {
  const [draft,setDraft]=useState({environment:data.environment,priceKwd:(data.priceFils/1000).toFixed(3),clientKey:'',clientSecret:'',required:data.required,publicCheckoutEnabled:data.publicCheckoutEnabled,accountConfirmed:data.accountConfirmed,callbacksConfirmed:data.callbacksConfirmed});
  const [busy,setBusy]=useState(false);
  async function action(kind:'save'|'test') {setBusy(true);try{await fetchJson('/api/payment-gateway',{method:'POST',body:JSON.stringify(kind==='test'?{action:kind}:{...draft,action:kind})});done(kind==='test'?'نجحت مصادقة سداد دون إنشاء فاتورة أو خصم.':'حُفظت إعدادات سداد في خادم سابق.');reload();}catch(error){fail(error instanceof Error?error.message:'تعذر الاتصال بسداد.');}finally{setBusy(false);}}
  return <Panel title="سداد — إعدادات خادم سابق" icon={CreditCard}><p>{data.hasCredentials?'مفاتيح التاجر محفوظة في الخادم':'يحتاج الربط إلى مفاتيح التاجر'} · {data.ready?'الإعداد مهيأ':'الإعداد يحتاج مراجعة'}</p><p>الرسوم الحالية: <bdi>{(data.priceFils/1000).toFixed(3)} KWD</bdi></p><div className="form-grid"><label><span>بيئة الدفع</span><select disabled={!manage||busy} value={draft.environment} onChange={e=>setDraft({...draft,environment:e.target.value})}><option value="sandbox">اختبار</option><option value="live">إنتاج</option></select></label><label><span>الرسوم بالدينار</span><input disabled={!manage||busy} type="number" min="0" step="0.001" value={draft.priceKwd} onChange={e=>setDraft({...draft,priceKwd:e.target.value})}/></label>{(['clientKey','clientSecret'] as const).map(key=><label key={key}><span>{key} — اتركه فارغاً للاحتفاظ بالمحفوظ</span><input disabled={!manage||busy} type="password" autoComplete="new-password" value={draft[key]} onChange={e=>setDraft({...draft,[key]:e.target.value})}/></label>)}{([['publicCheckoutEnabled','إظهار خطوة الدفع للعملاء'],['required','اشتراط الدفع'],['accountConfirmed','حساب التاجر والتسوية معتمدان للمكتب'],['callbacksConfirmed','تم التحقق من روابط العودة والإشعار']] as const).map(([key,label])=><label key={key}><input disabled={!manage||busy} type="checkbox" checked={draft[key]} onChange={e=>setDraft({...draft,[key]:e.target.checked})}/><span>{label}</span></label>)}</div>{manage&&<div className="top-actions"><button disabled={busy||!data.hasCredentials} className="secondary-button" onClick={()=>void action('test')}>اختبار الاتصال دون خصم</button><button disabled={busy} className="primary-button" onClick={()=>void action('save')}>حفظ الإعدادات</button></div>}<div className="text-block"><h3>روابط سداد</h3>{[data.successUrl,data.failedUrl,data.webhookUrl].map(url=><p key={url}><bdi>{url}</bdi></p>)}</div><h3>طلبات الدفع من خادم سابق</h3>{data.payments.length?data.payments.map(p=><p key={p.id}><bdi>{p.reference}</bdi> — {(p.amount_fils/1000).toFixed(3)} KWD — {p.status}</p>):<p>لا توجد طلبات مسجلة.</p>}</Panel>;
}
