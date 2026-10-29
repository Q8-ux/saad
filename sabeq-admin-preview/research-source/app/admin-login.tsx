"use client";

import { Check, KeyRound, Mail, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { FormEvent, useState } from "react";

export function AdminLogin() {
  const [stage, setStage] = useState<"details" | "code">("details");
  const [challengeId, setChallengeId] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  async function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setNotice("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/request-code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.get("name"), email: form.get("email") }) });
      const data = await response.json() as { challengeId?: string; error?: string };
      if (!response.ok || !data.challengeId) throw new Error(data.error || "تعذر إرسال الرمز.");
      setChallengeId(data.challengeId); setStage("code"); setNotice("أرسلنا رمزًا من ست خانات إلى البريد الإداري.");
    } catch (reason) { setNotice(reason instanceof Error ? reason.message : "تعذر إرسال الرمز."); }
    finally { setBusy(false); }
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setNotice("");
    const code = new FormData(event.currentTarget).get("code");
    try {
      const response = await fetch("/api/auth/verify-code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ challengeId, code }) });
      const data = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) throw new Error(data.error || "تعذر التحقق.");
      setNotice("تم التحقق بنجاح."); window.location.reload();
    } catch (reason) { setNotice(reason instanceof Error ? reason.message : "تعذر التحقق."); }
    finally { setBusy(false); }
  }

  return <main className="login-page"><section className="login-card"><div className="login-brand"><span><Image src="/images/brand/sabeq-logo.png" alt="شعار مجموعة سابق القانونية" width={56} height={56} priority /></span><div><strong>مجموعة سابق القانونية</strong><small>النظام الإداري المستقل</small></div></div><div className="login-icon"><ShieldCheck /></div><p className="eyebrow">دخول الموظفين المصرح لهم</p><h1>{stage === "details" ? "تسجيل الدخول الآمن" : "التحقق من البريد"}</h1><p className="login-copy">{stage === "details" ? "أدخل بياناتك الإدارية. لن يُسمح بالدخول إلا للبريد المضاف مسبقًا ضمن الموظفين النشطين." : "أدخل الرمز المرسل إلى بريدك. تنتهي صلاحيته خلال عشر دقائق."}</p>{stage === "details" ? <form onSubmit={requestCode}><label><span>الاسم الكامل</span><div><KeyRound /><input name="name" required minLength={2} autoComplete="name" /></div></label><label><span>البريد الإداري</span><div><Mail /><input name="email" required type="email" dir="ltr" autoComplete="email" /></div></label><button className="primary-button full" disabled={busy}><Mail />{busy ? "جارٍ الإرسال" : "إرسال رمز الدخول"}</button></form> : <form onSubmit={verify}><label><span>رمز التحقق</span><div><KeyRound /><input className="login-code" name="code" required inputMode="numeric" pattern="[0-9]{6}" minLength={6} maxLength={6} dir="ltr" autoComplete="one-time-code" /></div></label><button className="primary-button full" disabled={busy}><Check />{busy ? "جارٍ التحقق" : "تحقق وادخل"}</button><button className="text-button" type="button" onClick={() => { setStage("details"); setNotice(""); }}>تعديل البريد</button></form>}{notice && <p className="login-notice" aria-live="polite">{notice}</p>}<p className="login-security"><ShieldCheck />الجلسة مشفرة ومحددة المدة، وتُسجل الإجراءات الحساسة في سجل الإدارة.</p></section></main>;
}
