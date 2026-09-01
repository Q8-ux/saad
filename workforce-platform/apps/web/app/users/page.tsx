'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';

type UserRow = {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  employee?: { fullNameAr: string; employeeNo: string } | null;
};

type EmailStatus = {
  provider: string;
  configured: boolean;
  fromDomain: string | null;
  webAppUrlConfigured: boolean;
  tokenSigningConfigured: boolean;
};

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: 'مدير عام',
  COMPANY_ADMIN: 'مدير الجهة',
  HR_MANAGER: 'مدير الموارد البشرية',
  SUPERVISOR: 'مشرف',
  EMPLOYEE: 'موظف',
  AUDITOR: 'مدقق',
};

function responseMessage(data: any, fallback: string) {
  return Array.isArray(data?.message) ? data.message.join('، ') : data?.message || fallback;
}

export default function UsersPage() {
  const api = process.env.NEXT_PUBLIC_API_URL!;
  const [users, setUsers] = useState<UserRow[]>([]);
  const [emailStatus, setEmailStatus] = useState<EmailStatus | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const headers = useCallback(() => ({
    Authorization: `Bearer ${window.localStorage.getItem('token') || ''}`,
    'Content-Type': 'application/json',
  }), []);

  const load = useCallback(async () => {
    if (!api) return setMessage('لم يتم إعداد رابط الخادم.');
    try {
      const [usersResponse, statusResponse] = await Promise.all([
        fetch(`${api}/auth/users`, { headers: headers() }),
        fetch(`${api}/auth/email-status`, { headers: headers() }),
      ]);
      const usersData = await usersResponse.json().catch(() => ({}));
      const statusData = await statusResponse.json().catch(() => ({}));
      if (!usersResponse.ok) return setMessage(responseMessage(usersData, 'تعذر تحميل المستخدمين.'));
      setUsers(usersData);
      if (statusResponse.ok) setEmailStatus(statusData);
    } catch {
      setMessage('تعذر الاتصال بخدمة المستخدمين.');
    }
  }, [api, headers]);

  useEffect(() => { void load(); }, [load]);

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const form = new FormData(event.currentTarget);
      const payload = Object.fromEntries(form) as Record<string, FormDataEntryValue>;
      if (!payload.employeeId) delete payload.employeeId;
      const response = await fetch(`${api}/auth/invitations`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return setMessage(responseMessage(data, 'تعذر إرسال الدعوة.'));
      setMessage(`تم إنشاء الحساب وإرسال رابط التفعيل إلى ${data.email}.`);
      event.currentTarget.reset();
      await load();
    } catch {
      setMessage('تعذر الاتصال بخدمة الدعوات.');
    } finally {
      setLoading(false);
    }
  }

  async function resend(email: string) {
    setMessage('جارٍ إعادة إرسال رابط التفعيل...');
    const response = await fetch(`${api}/auth/invitations/resend`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ email }),
    });
    const data = await response.json().catch(() => ({}));
    setMessage(response.ok ? `تم إرسال رابط جديد إلى ${email}.` : responseMessage(data, 'تعذر إعادة الإرسال.'));
  }

  const ready = emailStatus?.configured && emailStatus?.tokenSigningConfigured && emailStatus?.webAppUrlConfigured;

  return (
    <main className="appMain">
      <section className="innerHero"><div><span className="eyebrow">إدارة الوصول</span><h1>المستخدمون وتفعيل الحسابات</h1><p>دعوة المستخدمين ومتابعة حالة التفعيل دون إرسال كلمات مرور مؤقتة.</p></div></section>
      {message && <div className="notice" role="status">{message}</div>}
      <div className="grid twoCols section">
        <form className="card" onSubmit={invite}>
          <h2>دعوة مستخدم جديد</h2>
          <label htmlFor="inviteEmail">البريد الإلكتروني</label>
          <input id="inviteEmail" name="email" type="email" autoComplete="email" required />
          <label htmlFor="inviteRole">الصلاحية</label>
          <select id="inviteRole" name="role" defaultValue="EMPLOYEE">
            <option value="EMPLOYEE">موظف</option><option value="SUPERVISOR">مشرف</option><option value="HR_MANAGER">مدير الموارد البشرية</option><option value="COMPANY_ADMIN">مدير الجهة</option><option value="AUDITOR">مدقق</option>
          </select>
          <label htmlFor="employeeId">معرّف الموظف (اختياري)</label>
          <input id="employeeId" name="employeeId" placeholder="UUID" />
          <button disabled={loading || !ready}>{loading ? 'جارٍ الإرسال...' : 'إنشاء الحساب وإرسال التفعيل'}</button>
          {!ready && <p className="muted">يجب إكمال إعداد SMTP ومفتاح توقيع الروابط قبل إرسال الدعوات.</p>}
        </form>
        <section className="card">
          <h2>جاهزية البريد</h2>
          {!emailStatus ? <p className="muted">جارٍ فحص الإعداد...</p> : <>
            <div className="row"><span>مزود الإرسال</span><b>{emailStatus.provider.toUpperCase()}</b></div>
            <div className="row"><span>إعداد SMTP</span><b>{emailStatus.configured ? 'جاهز' : 'غير مكتمل'}</b></div>
            <div className="row"><span>توقيع الروابط</span><b>{emailStatus.tokenSigningConfigured ? 'جاهز' : 'غير مكتمل'}</b></div>
            <div className="row"><span>نطاق المرسل</span><b>{emailStatus.fromDomain || 'غير محدد'}</b></div>
          </>}
        </section>
      </div>
      <section className="card section"><h2>حسابات الجهة</h2>
        {users.length === 0 ? <p className="muted">لا توجد حسابات متاحة.</p> : users.map(user => <div className="incident" key={user.id}>
          <div className="incidentHead"><div><b>{user.employee?.fullNameAr || user.email}</b><p className="muted">{user.email}</p></div><span className={`badge ${user.isActive ? 'badgeGray' : 'badgeRed'}`}>{user.isActive ? 'نشط' : 'بانتظار التفعيل'}</span></div>
          <small className="muted">{roleLabels[user.role] || user.role} — أُنشئ {new Date(user.createdAt).toLocaleDateString('ar-KW')}</small>
          {!user.isActive && <button className="secondaryButton section" type="button" onClick={() => void resend(user.email)}>إعادة إرسال رابط التفعيل</button>}
        </div>)}
      </section>
      <nav className="mobileNav"><Link href="/dashboard">⌂<span>الرئيسية</span></Link><Link href="/attendance-smart">◉<span>الحضور</span></Link><Link href="/transfers">↔<span>الانتقال</span></Link><Link href="/notifications">◇<span>التنبيهات</span></Link><Link href="/profile">○<span>حسابي</span></Link></nav>
    </main>
  );
}
