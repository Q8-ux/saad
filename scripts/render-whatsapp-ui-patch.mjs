import { readFile, writeFile } from "node:fs/promises";

const path = new URL("../app/legal-office-app.tsx", import.meta.url);
let source = await readFile(path, "utf8");
const original = source;

function replaceOnce(oldText, newText, marker) {
  if (source.includes(newText)) return;
  if (!source.includes(oldText)) throw new Error(`WhatsApp UI patch failed: ${marker}`);
  source = source.replace(oldText, newText);
}

replaceOnce(
  '  | "memos"\n  | "settings"',
  '  | "memos"\n  | "whatsapp"\n  | "settings"',
  'PageKey whatsapp',
);

replaceOnce(
  '  { key: "memos", label: "مولّد المذكرات", short: { ar: "مذ", en: "ME", ur: "یا" } },\n  { key: "settings", label: "الإعدادات", short: { ar: "ضب", en: "ST", ur: "تر" } },',
  '  { key: "memos", label: "مولّد المذكرات", short: { ar: "مذ", en: "ME", ur: "یا" } },\n  { key: "whatsapp", label: "واتساب المكتب", short: { ar: "وا", en: "WA", ur: "وا" } },\n  { key: "settings", label: "الإعدادات", short: { ar: "ضب", en: "ST", ur: "تر" } },',
  'NAV whatsapp',
);

replaceOnce(
  '  settings: { title: "الإعدادات", sub: "بيانات المكتب وتفضيلات العرض" },',
  '  whatsapp: { title: "واتساب المكتب", sub: "استقبال وإرسال رسائل العملاء وربط المحادثات بالملفات والقضايا" },\n  settings: { title: "الإعدادات", sub: "بيانات المكتب وتفضيلات العرض" },',
  'PAGE_META whatsapp',
);

replaceOnce(
  '          {page === "memos" && (',
  [
    '          {page === "whatsapp" && (',
    '            <WhatsAppOfficePage',
    '              office={office}',
    '              role={activeOffice.role}',
    '              onToast={showToast}',
    '            />',
    '          )}',
    '          {page === "memos" && (',
  ].join('\n'),
  'render WhatsApp page',
);

if (!source.includes('function WhatsAppOfficePage(')) {
  source += `

// Office WhatsApp Cloud API inbox. Provider secrets remain server-side; this
// component only receives configuration status, conversations and messages.
type WhatsAppConversation = {
  id: string;
  waId: string;
  contactName: string;
  clientId: number | null;
  clientName: string | null;
  caseId: number | null;
  caseNumber: string | null;
  lastMessageAt: string;
  lastMessagePreview: string;
  unreadCount: number;
};

type WhatsAppMessage = {
  id: string;
  providerMessageId: string;
  direction: string;
  messageType: string;
  body: string;
  status: string;
  errorCode: string;
  errorMessage: string;
  providerTimestamp: string;
  createdAt: string;
};

type WhatsAppAccount = {
  officeId: string;
  phoneNumberId: string;
  businessAccountId: string;
  displayPhoneNumber: string;
  label: string;
  status: string;
};

type WhatsAppSnapshot = {
  account: WhatsAppAccount | null;
  runtime: {
    tokenConfigured: boolean;
    verifyTokenConfigured: boolean;
    appSecretConfigured: boolean;
    graphVersion: string;
  };
  connected: boolean;
  webhookUrl: string;
  conversations: WhatsAppConversation[];
  canConfigure: boolean;
  canSend: boolean;
};

function WhatsAppOfficePage({
  office,
  role,
  onToast,
}: {
  office: OfficeData;
  role: ActiveOffice["role"];
  onToast: (message: string) => void;
}) {
  const { locale, t } = useI18n();
  const [snapshot, setSnapshot] = useState<WhatsAppSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState("");
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [phone, setPhone] = useState("");
  const [text, setText] = useState("");
  const [clientId, setClientId] = useState("");
  const [caseId, setCaseId] = useState("");

  const selectedConversation = snapshot?.conversations.find((item) => item.id === selectedId) ?? null;

  async function loadSnapshot(silent = false) {
    if (!silent) setLoading(true);
    try {
      const data = await readJson<WhatsAppSnapshot>(
        await fetch("/api/whatsapp", { cache: "no-store" }),
      );
      setSnapshot(data);
      if (!selectedId && data.conversations.length) setSelectedId(data.conversations[0].id);
    } catch (error) {
      if (!silent) onToast(t(error instanceof Error ? error.message : "تعذّر تحميل واتساب المكتب"));
    } finally {
      if (!silent) setLoading(false);
    }
  }

  async function loadMessages(conversationId: string) {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    setMessagesLoading(true);
    try {
      const data = await readJson<{ messages: WhatsAppMessage[] }>(
        await fetch("/api/whatsapp?conversation=" + encodeURIComponent(conversationId), { cache: "no-store" }),
      );
      setMessages(data.messages);
      setSnapshot((current) => current ? {
        ...current,
        conversations: current.conversations.map((item) => item.id === conversationId ? { ...item, unreadCount: 0 } : item),
      } : current);
    } catch (error) {
      onToast(t(error instanceof Error ? error.message : "تعذّر تحميل رسائل واتساب"));
    } finally {
      setMessagesLoading(false);
    }
  }

  useEffect(() => {
    void loadSnapshot();
    const timer = window.setInterval(() => void loadSnapshot(true), 15000);
    return () => window.clearInterval(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedId) void loadMessages(selectedId);
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  function chooseClient(value: string) {
    setClientId(value);
    const client = office.clients.find((item) => String(item.id) === value);
    if (client?.phone) setPhone(client.phone.replace(/[^0-9]/g, ""));
    const matchingCases = office.cases.filter((item) => String(item.clientId ?? "") === value);
    if (matchingCases.length === 1) setCaseId(String(matchingCases[0].id));
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!phone.trim() || !text.trim() || sending) return;
    setSending(true);
    try {
      const result = await readJson<{ ok: boolean; conversationId: string }>(
        await fetch("/api/whatsapp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "send",
            to: phone,
            text,
            clientId: clientId || null,
            caseId: caseId || null,
          }),
        }),
      );
      setText("");
      await loadSnapshot(true);
      setSelectedId(result.conversationId);
      await loadMessages(result.conversationId);
      onToast(t("تم إرسال رسالة واتساب."));
    } catch (error) {
      onToast(t(error instanceof Error ? error.message : "تعذّر إرسال رسالة واتساب"));
    } finally {
      setSending(false);
    }
  }

  async function configureAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await readJson(
        await fetch("/api/whatsapp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "configure",
            phoneNumberId: form.get("phoneNumberId"),
            businessAccountId: form.get("businessAccountId"),
            displayPhoneNumber: form.get("displayPhoneNumber"),
            label: form.get("label"),
          }),
        }),
      );
      await loadSnapshot();
      onToast(t("تم حفظ إعدادات واتساب المكتب."));
    } catch (error) {
      onToast(t(error instanceof Error ? error.message : "تعذّر حفظ إعدادات واتساب"));
    }
  }

  if (loading) return <LoadingState label="جارٍ تحميل واتساب المكتب..." />;
  if (!snapshot) return <EmptyState title={t("واتساب المكتب")} text={t("تعذّر تحميل إعدادات واتساب المكتب.")} />;

  return (
    <div className="whatsapp-office-page">
      <section className="whatsapp-status panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">{t("WhatsApp Cloud API")}</span>
            <h2>{t("ربط رقم واتساب المكتب")}</h2>
          </div>
          <span className={"status-badge " + (snapshot.connected ? "tone-good" : "tone-warning")}>
            <span className="status-dot" />
            {t(snapshot.connected ? "متصل" : "غير مكتمل")}
          </span>
        </div>
        <div className="whatsapp-runtime-grid">
          <div><strong>{t("رقم المكتب")}</strong><span>{snapshot.account?.displayPhoneNumber || "—"}</span></div>
          <div><strong>Phone Number ID</strong><span>{snapshot.account?.phoneNumberId || "—"}</span></div>
          <div><strong>{t("Webhook")}</strong><code>{snapshot.webhookUrl}</code></div>
          <div><strong>{t("حالة أسرار Meta")}</strong><span>{snapshot.runtime.tokenConfigured && snapshot.runtime.verifyTokenConfigured && snapshot.runtime.appSecretConfigured ? t("مهيأة") : t("تحتاج إعداد الخادم")}</span></div>
        </div>
        {snapshot.canConfigure && (
          <details className="whatsapp-config">
            <summary>{t("إعداد الربط")}</summary>
            <form onSubmit={configureAccount} className="whatsapp-config-form">
              <label><span>Phone Number ID</span><input name="phoneNumberId" required defaultValue={snapshot.account?.phoneNumberId || ""} /></label>
              <label><span>WhatsApp Business Account ID</span><input name="businessAccountId" defaultValue={snapshot.account?.businessAccountId || ""} /></label>
              <label><span>{t("رقم المكتب الظاهر")}</span><input name="displayPhoneNumber" placeholder="965xxxxxxxx" defaultValue={snapshot.account?.displayPhoneNumber || ""} /></label>
              <label><span>{t("اسم القناة")}</span><input name="label" defaultValue={snapshot.account?.label || "واتساب المكتب"} /></label>
              <button className="button primary" type="submit">{t("حفظ إعدادات واتساب")}</button>
            </form>
            <p className="muted-line">{t("مفتاح Meta وVerify Token وApp Secret تبقى أسراراً في الخادم ولا تظهر للمستخدمين.")}</p>
          </details>
        )}
      </section>

      <section className="whatsapp-compose panel">
        <div className="panel-heading"><div><span className="eyebrow">{t("رسالة جديدة")}</span><h2>{t("إرسال من رقم المكتب")}</h2></div></div>
        <form className="whatsapp-send-form" onSubmit={sendMessage}>
          <label><span>{t("العميل")}</span><select value={clientId} onChange={(event) => chooseClient(event.target.value)}><option value="">{t("بدون ربط بعميل")}</option>{office.clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>
          <label><span>{t("القضية")}</span><select value={caseId} onChange={(event) => setCaseId(event.target.value)}><option value="">{t("بدون ربط بقضية")}</option>{office.cases.filter((item) => !clientId || String(item.clientId ?? "") === clientId).map((item) => <option key={item.id} value={item.id}>{item.caseNumber}</option>)}</select></label>
          <label><span>{t("رقم واتساب")}</span><input value={phone} onChange={(event) => setPhone(event.target.value.replace(/[^0-9+]/g, ""))} placeholder="965xxxxxxxx" required /></label>
          <label className="whatsapp-message-field"><span>{t("الرسالة")}</span><textarea value={text} onChange={(event) => setText(event.target.value)} maxLength={4096} required placeholder={t("اكتب رسالة العميل...")} /></label>
          <button className="button primary" type="submit" disabled={!snapshot.canSend || !snapshot.connected || sending}>{t(sending ? "جارٍ الإرسال..." : "إرسال واتساب")}</button>
        </form>
      </section>

      <section className="whatsapp-inbox">
        <aside className="whatsapp-conversations panel">
          <div className="panel-heading"><div><span className="eyebrow">{t("صندوق الوارد")}</span><h2>{snapshot.conversations.length.toLocaleString(locale)} {t("محادثة")}</h2></div></div>
          {snapshot.conversations.length === 0 ? <EmptyState title={t("لا توجد محادثات بعد")} text={t("ستظهر الرسائل الواردة هنا بعد تفعيل Webhook في Meta.")} /> : (
            <div className="whatsapp-conversation-list">{snapshot.conversations.map((item) => (
              <button type="button" key={item.id} className={"whatsapp-conversation-item " + (item.id === selectedId ? "active" : "")} onClick={() => setSelectedId(item.id)}>
                <span className="whatsapp-avatar">{(item.contactName || item.clientName || "W").slice(0, 1)}</span>
                <span className="whatsapp-conversation-copy"><strong>{item.contactName || item.clientName || item.waId}</strong><small>{item.clientName ? item.clientName + " · " : ""}{item.waId}</small><span>{item.lastMessagePreview || "—"}</span></span>
                {item.unreadCount > 0 && <b className="whatsapp-unread">{item.unreadCount}</b>}
              </button>
            ))}</div>
          )}
        </aside>

        <div className="whatsapp-thread panel">
          {!selectedConversation ? <EmptyState title={t("اختر محادثة")} text={t("اختر محادثة من صندوق الوارد لعرض الرسائل.")} /> : (
            <>
              <div className="whatsapp-thread-heading"><div><strong>{selectedConversation.contactName || selectedConversation.clientName || selectedConversation.waId}</strong><span>{selectedConversation.clientName || ""}{selectedConversation.caseNumber ? " · " + selectedConversation.caseNumber : ""}</span></div><span dir="ltr">+{selectedConversation.waId}</span></div>
              {messagesLoading ? <LoadingState /> : <div className="whatsapp-messages">{messages.map((message) => (
                <article key={message.id} className={"whatsapp-message " + (message.direction === "outbound" ? "outbound" : "inbound")}>
                  <p>{message.body}</p>
                  <small>{new Date(message.providerTimestamp || message.createdAt).toLocaleString(locale)} · {t(message.status)}</small>
                  {message.errorMessage && <span className="whatsapp-message-error">{message.errorMessage}</span>}
                </article>
              ))}</div>}
              {snapshot.canSend && (
                <form className="whatsapp-reply" onSubmit={async (event) => { event.preventDefault(); if (!text.trim()) return; setPhone(selectedConversation.waId); await sendMessage(event); }}>
                  <textarea value={text} onChange={(event) => setText(event.target.value)} maxLength={4096} placeholder={t("اكتب الرد...")} />
                  <button type="submit" className="button primary" disabled={!snapshot.connected || sending}>{t(sending ? "جارٍ الإرسال..." : "إرسال")}</button>
                </form>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
`;
}

if (source !== original) {
  await writeFile(path, source, "utf8");
  console.log("Applied WhatsApp office inbox UI patch.");
} else {
  console.log("WhatsApp office inbox UI patch already applied.");
}
