'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';

export default function RequestActivationPage() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const api = process.env.NEXT_PUBLIC_API_URL;
    if (!api) return setMessage('لم يتم إعداد رابط الخادم.');
    setLoading(true);
    try {
      const form = new FormData(event.currentTarget);
      const response = await fetch(`${api}/auth/request-activation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(form)),
      });
      const data = await response.json().catch(() => ({}));
      setMessage(Array.isArray(data.message) ? data.message.join('، ') : data.message || 'تم استلام الطلب.');
    } catch {
      setMessage('تعذر الاتصال بالخادم. حاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="authPage"><section className="authCard">
      <span className="authEyebrow">منصة نطاق العمل</span><h1>إعادة إرسال رابط التفعيل</h1>
      <p>استخدم هذه الصفحة إذا انتهت صلاحية دعوة حسابك.</p>
      <form onSubmit={submit}>
        <label htmlFor="companyId">معرّف الجهة</label>
        <input id="companyId" name="companyId" defaultValue="00000000-0000-0000-0000-000000000001" required />
        <label htmlFor="email">البريد الإلكتروني</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
        <button disabled={loading}>{loading ? 'جارٍ الإرسال...' : 'إرسال رابط جديد'}</button>
      </form>
      {message && <p className="authMessage" role="status">{message}</p>}
      <div className="authLinks"><Link href="/login">العودة إلى تسجيل الدخول</Link></div>
    </section></main>
  );
}
