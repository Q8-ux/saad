'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';

type Row = {
  id: string;
  channel: string;
  priority: string;
  recipientType: string;
  recipientValue?: string | null;
  title: string;
  message: string;
  status: string;
  errorMessage?: string | null;
  createdAt: string;
};

type AiResult = { summary: string; recommendations: string[]; confidenceNote: string };
const statusLabel: Record<string, string> = { PENDING: 'بانتظار الإرسال', PROCESSING: 'جارٍ الإرسال', SENT: 'تم الإرسال', PARTIAL: 'إرسال جزئي', FAILED: 'فشل الإرسال' };

function apiMessage(data: any, fallback: string) {
  return Array.isArray(data?.message) ? data.message.join('، ') : data?.message || fallback;
}

export default function NotificationsPage() {
  const api = process.env.NEXT_PUBLIC_API_URL!;
  const [rows, setRows] = useState<Row[]>([]);
  const [message, setMessage] = useState('');
  const [draft, setDraft] = useState<AiResult | null>(null);
  const [loading, setLoading] = useState(false);
  const headers = useCallback(() => ({ Authorization: `Bearer ${window.localStorage.getItem('token') || ''}`, 'Content-Type': 'application/json' }), []);

  const load = useCallback(async () => {
    if (!api) return setMessage('لم يتم إعداد رابط الخادم.');
    try {
      const response = await fetch(`${api}/notifications`, { headers: headers() });
      const data = await response.json().catch(() => ({}));
      if (response.ok) setRows(data);
      else setMessage(apiMessage(data, 'تعذر تحميل التنبيهات.'));
    } catch {
      setMessage('تعذر الاتصال بخدمة التنبيهات.');
    }
  }, [api, headers]);

  useEffect(() => { void load(); }, [load]);

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoading(true);
    try {
      const response = await fetch(`${api}/ai/analyze`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ section: 'NOTIFICATIONS', task: 'صغ تنبيهًا مؤسسيًا مختصرًا ومباشرًا.', data: { subject: form.get('subject'), details: form.get('details'), channel: form.get('channel'), priority: form.get('priority') } }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return setMessage(apiMessage(data, 'تعذر إنشاء المسودة.'));
      setDraft(data.result);
      setMessage('تم إنشاء المسودة. راجعها قبل الإرسال.');
    } catch {
      setMessage('تعذر الاتصال بخدمة صياغة المسودة.');
    } finally {
      setLoading(false);
    }
  }

  async function queue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form) as Record<string, FormDataEntryValue>;
    if (!payload.recipientValue) delete payload.recipientValue;
    setLoading(true);
    try {
      const response = await fetch(`${api}/notifications`, { method: 'POST', headers: headers(), body: JSON.stringify(payload) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return setMessage(apiMessage(data, 'تعذر إرسال التنبيه.'));
      if (data.status === 'SENT') setMessage('تم تسليم البريد إلى مزود الإرسال بنجاح.');
      else if (data.status === 'PARTIAL') setMessage(data.errorMessage || 'قبل مزود البريد بعض المستلمين ورفض آخرين.');
      else if (data.status === 'FAILED') setMessage(data.errorMessage || 'فشل إرسال البريد. يمكنك إعادة المحاولة بعد مراجعة SMTP.');
      else setMessage('تمت إضافة التنبيه إلى قائمة الانتظار.');
      event.currentTarget.reset();
      await load();
    } catch {
      setMessage('تعذر الاتصال بخدمة الإرسال.');
    } finally {
      setLoading(false);
    }
  }

  async function retry(id: string) {
    setMessage('جارٍ إعادة محاولة الإرسال...');
    try {
      const response = await fetch(`${api}/notifications/${id}/retry`, { method: 'POST', headers: headers() });
      const data = await response.json().catch(() => ({}));
      setMessage(response.ok && data.status === 'SENT' ? 'نجحت إعادة إرسال البريد.' : apiMessage(data, data.errorMessage || 'تعذرت إعادة الإرسال.'));
      await load();
    } catch {
      setMessage('تعذر الاتصال بخدمة الإرسال.');
    }
  }

  return (
    <main className="appMain">
      <section className="innerHero"><div><span className="eyebrow">منصة نطاق العمل</span><h1>مركز التنبيهات</h1><p>إنشاء التنبيهات وإرسال البريد ومتابعة نتيجة التسليم.</p></div></section>
      {message && <div className="notice" role="status">{message}</div>}
      <div className="grid twoCols section">
        <form className="card" onSubmit={generate}><h2>صياغة مسودة</h2>
          <input name="subject" placeholder="موضوع التنبيه" required /><textarea name="details" placeholder="تفاصيل الحالة والإجراء المطلوب" required />
          <select name="channel"><option value="APP">التطبيق</option><option value="WHATSAPP">واتساب</option><option value="EMAIL">البريد</option></select>
          <select name="priority"><option value="NORMAL">عادي</option><option value="HIGH">عالٍ</option><option value="CRITICAL">حرج</option></select>
          <button disabled={loading}>{loading ? 'جارٍ الصياغة...' : 'إنشاء المسودة'}</button>
          {draft && <div className="aiResult section"><h3>{draft.summary}</h3><ul>{draft.recommendations.map((item, index) => <li key={index}>{item}</li>)}</ul><small>{draft.confidenceNote}</small></div>}
        </form>
        <form className="card" onSubmit={queue}><h2>إرسال تنبيه</h2>
          <input name="title" placeholder="عنوان التنبيه" required /><textarea name="message" placeholder="نص التنبيه المعتمد" required />
          <label htmlFor="channel">قناة الإرسال</label><select id="channel" name="channel" defaultValue="EMAIL"><option value="EMAIL">البريد</option><option value="APP">التطبيق</option><option value="WHATSAPP">واتساب</option></select>
          <label htmlFor="priority">الأولوية</label><select id="priority" name="priority"><option value="NORMAL">عادي</option><option value="HIGH">عالٍ</option><option value="CRITICAL">حرج</option></select>
          <label htmlFor="recipientType">المستلمون</label><select id="recipientType" name="recipientType" defaultValue="DIRECT"><option value="DIRECT">بريد مباشر</option><option value="ROLE">حسب الصلاحية</option><option value="EMPLOYEE">موظف</option><option value="STATION">منشأة</option><option value="ALL">جميع المستخدمين النشطين</option></select>
          <input name="recipientValue" placeholder="البريد أو المعرّف أو اسم الصلاحية عند الحاجة" />
          <small className="muted">للصلاحية استخدم مثل COMPANY_ADMIN أو EMPLOYEE. لا يظهر عنوان أي مستلم لبقية المستلمين.</small>
          <button disabled={loading}>{loading ? 'جارٍ الإرسال...' : 'إرسال التنبيه'}</button>
        </form>
      </div>
      <section className="card section"><h2>سجل الإرسال</h2>
        {rows.length === 0 ? <p className="muted">لا توجد تنبيهات.</p> : rows.map(row => <div className="incident" key={row.id}>
          <div className="incidentHead"><b>{row.title}</b><span className={`badge ${['FAILED', 'PARTIAL'].includes(row.status) ? 'badgeRed' : 'badgeGray'}`}>{statusLabel[row.status] || row.status}</span></div>
          <p>{row.message}</p>{row.errorMessage && <p className="authMessage error">{row.errorMessage}</p>}
          <small className="muted">{row.channel} — {row.priority} — {new Date(row.createdAt).toLocaleString('ar-KW')}</small>
          {row.status === 'FAILED' && row.channel === 'EMAIL' && <button className="secondaryButton section" type="button" onClick={() => void retry(row.id)}>إعادة محاولة البريد</button>}
        </div>)}
      </section>
      <nav className="mobileNav"><Link href="/dashboard">⌂<span>الرئيسية</span></Link><Link href="/attendance-smart">◉<span>الحضور</span></Link><Link href="/transfers">↔<span>الانتقال</span></Link><Link href="/notifications">◇<span>التنبيهات</span></Link><Link href="/profile">○<span>حسابي</span></Link></nav>
    </main>
  );
}
