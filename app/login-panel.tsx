"use client";

import { FormEvent, useState } from "react";

export default function LoginPanel() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setError("");
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        cache: "no-store",
      });
      if (!response.ok) {
        const payload: unknown = await response.json().catch(() => null);
        const message = payload && typeof payload === "object" && "error" in payload
          && typeof (payload as { error?: unknown }).error === "string"
          ? (payload as { error: string }).error
          : "تعذّر التحقق من بيانات الدخول.";
        setError(message);
        return;
      }
      window.location.replace("/");
    } catch {
      setError("تعذّر الاتصال بالخدمة. تحقق من الشبكة ثم أعد المحاولة.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page" dir="rtl">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-emblem" aria-hidden="true">
          <svg viewBox="0 0 48 48" focusable="false">
            <path d="M24 4.5 8.5 10.8v10.8c0 10 6.4 18.8 15.5 21.9 9.1-3.1 15.5-11.9 15.5-21.9V10.8L24 4.5Zm0 5.3 10.2 4.1v7.7c0 7-4.2 13.4-10.2 16-6-2.6-10.2-9-10.2-16v-7.7L24 9.8Zm0 6.7a5.3 5.3 0 0 0-5.3 5.3v2.1h-1.1c-1.2 0-2.1 1-2.1 2.1v7.5c0 1.2.9 2.1 2.1 2.1h12.8c1.2 0 2.1-.9 2.1-2.1V26c0-1.2-.9-2.1-2.1-2.1h-1.1v-2.1A5.3 5.3 0 0 0 24 16.5Zm-2.1 7.4v-2.1a2.1 2.1 0 1 1 4.2 0v2.1h-4.2Z" />
          </svg>
        </div>
        <p className="login-kicker">دخول خاص</p>
        <h1 id="login-title">منصة العقود والترجمة القانونية</h1>
        <p className="login-description">أدخل بيانات حسابك للوصول إلى مساحة العمل الخاصة بك.</p>

        <form className="login-form" onSubmit={submit} noValidate>
          <label htmlFor="login-username">اسم المستخدم</label>
          <input
            id="login-username"
            name="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            disabled={submitting}
          />

          <label htmlFor="login-password">كلمة المرور</label>
          <input
            id="login-password"
            name="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
            disabled={submitting}
          />

          {error && <p className="login-error" role="alert">{error}</p>}

          <button className="login-submit" type="submit" disabled={submitting}>
            {submitting ? "جارٍ التحقق…" : "دخول آمن"}
          </button>
        </form>

        <p className="login-note">لكل مكتب مساحة بيانات مستقلة ومحمية.</p>
      </section>
    </main>
  );
}
