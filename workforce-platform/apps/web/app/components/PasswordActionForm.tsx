'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';

type Props = {
  endpoint: 'activate' | 'reset-password';
  title: string;
  description: string;
  buttonLabel: string;
};

export default function PasswordActionForm({ endpoint, title, description, buttonLabel }: Props) {
  const [token, setToken] = useState('');
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get('token') || '');
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setSuccess(false);
    const form = new FormData(event.currentTarget);
    const password = String(form.get('password') || '');
    const confirmation = String(form.get('confirmation') || '');
    if (!token) return setMessage('الرابط غير مكتمل. اطلب رابطاً جديداً.');
    if (password.length < 12) return setMessage('يجب ألا تقل كلمة المرور عن 12 حرفاً.');
    if (password !== confirmation) return setMessage('كلمتا المرور غير متطابقتين.');

    const api = process.env.NEXT_PUBLIC_API_URL;
    if (!api) return setMessage('لم يتم إعداد رابط الخادم.');
    setLoading(true);
    try {
      const response = await fetch(`${api}/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json().catch(() => ({}));
      const responseMessage = Array.isArray(data.message) ? data.message.join('، ') : data.message;
      if (!response.ok) return setMessage(responseMessage || 'تعذر إكمال الطلب.');
      setSuccess(true);
      setMessage(responseMessage || 'تم تنفيذ الطلب بنجاح.');
      event.currentTarget.reset();
    } catch {
      setMessage('تعذر الاتصال بالخادم. حاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="authPage">
      <section className="authCard">
        <span className="authEyebrow">منصة نطاق العمل</span>
        <h1>{title}</h1>
        <p>{description}</p>
        {!success && (
          <form onSubmit={submit}>
            <label htmlFor="password">كلمة المرور الجديدة</label>
            <input id="password" name="password" type="password" minLength={12} maxLength={128} autoComplete="new-password" required />
            <label htmlFor="confirmation">تأكيد كلمة المرور</label>
            <input id="confirmation" name="confirmation" type="password" minLength={12} maxLength={128} autoComplete="new-password" required />
            <small className="authHint">استخدم 12 حرفاً على الأقل، ولا تعِد استخدام كلمة مرور قديمة.</small>
            <button disabled={loading || !token}>{loading ? 'جارٍ التنفيذ...' : buttonLabel}</button>
          </form>
        )}
        {message && <p className={success ? 'authMessage success' : 'authMessage error'} role="alert">{message}</p>}
        <div className="authLinks"><Link href="/login">العودة إلى تسجيل الدخول</Link></div>
      </section>
    </main>
  );
}
