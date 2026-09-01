'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Login() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const form = new FormData(event.currentTarget);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;

      if (!apiUrl) {
        throw new Error('لم يتم إعداد رابط الخادم بعد');
      }

      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(form)),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.message ?? 'فشل تسجيل الدخول');
        return;
      }

      localStorage.setItem('token', data.accessToken);
      router.push('/dashboard');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'تعذر الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="authPage">
      <div className="card authCard">
        <h1>تسجيل الدخول</h1>
        <form onSubmit={submit}>
          <input
            name="companyId"
            defaultValue="00000000-0000-0000-0000-000000000001"
            required
            aria-label="معرّف الجهة"
          />
          <input
            name="email"
            type="email"
            defaultValue="admin@example.com"
            required
            aria-label="البريد الإلكتروني"
          />
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="كلمة المرور"
            aria-label="كلمة المرور"
          />
          <button disabled={loading}>{loading ? 'جارٍ الدخول...' : 'دخول'}</button>
        </form>
        {error && <p role="alert">{error}</p>}
        <div className="authLinks">
          <Link href="/forgot-password">نسيت كلمة المرور؟</Link>
          <Link href="/request-activation">إعادة إرسال رابط التفعيل</Link>
        </div>
      </div>
    </main>
  );
}
