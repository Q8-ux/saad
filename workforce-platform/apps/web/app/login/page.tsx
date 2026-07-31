'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

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
    <main>
      <div className="card" style={{ maxWidth: 460, margin: '80px auto' }}>
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
      </div>
    </main>
  );
}
