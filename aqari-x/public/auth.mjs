import {
  $,
  api,
  openDialog,
  closeDialog,
  field,
  selectField,
  formValues,
  withSubmit,
  getSession,
  setSession,
  toast,
} from "./ui.mjs";
import { escapeHTML } from "./core.mjs";
export function showAuth(after, mode = "login") {
  if (getSession()) {
    openDialog(
      "حسابي",
      `<div class="section-box"><h3>${escapeHTML(getSession().user.name)}</h3><p class="muted">${escapeHTML(getSession().user.email)}</p><button class="btn danger wide" id="logout">تسجيل الخروج</button></div>`,
      () => {
        $("#logout").onclick = async () => {
          try {
            await api("/auth/logout", { method: "POST" });
          } catch {}
          setSession(null);
          closeDialog();
          document.dispatchEvent(new Event("aqari:session"));
          toast("تم تسجيل الخروج");
        };
      },
    );
    return;
  }
  const signup = mode === "register";
  openDialog(
    signup ? "إنشاء حساب" : "تسجيل الدخول",
    `<div class="tabs"><button class="tab ${!signup ? "active" : ""}" id="login-mode">تسجيل الدخول</button><button class="tab ${signup ? "active" : ""}" id="register-mode">حساب جديد</button></div><form id="auth-form" class="form-grid">${signup ? field("name", "الاسم الكامل", "text", "", 'required maxlength="100" autocomplete="name"') : ""}${field("email", "البريد الإلكتروني", "email", "", 'required autocomplete="email" dir="ltr"')}${signup ? field("phone", "رقم الهاتف مع مفتاح الدولة", "tel", "", 'required placeholder="965…" autocomplete="tel" dir="ltr"') : ""}${field("password", "كلمة المرور", "password", "", 'required minlength="10" maxlength="128" autocomplete="' + (signup ? "new-password" : "current-password") + '"')}${
      signup
        ? selectField(
            "role",
            "نوع الحساب",
            [
              ["buyer", "باحث عن عقار"],
              ["owner", "مالك"],
              ["broker", "وسيط"],
            ],
            "buyer",
            null,
          )
        : ""
    }<p class="fineprint span-full">${signup ? "بيانات الحساب والطلبات تحفظ لدى المكتب. الإعلانات تخضع للمراجعة قبل النشر. البريد ورقم الهاتف غير موثقين تلقائياً." : "كلمة مرور الحساب مطلوبة. بيانات الإدارة والصلاحيات يتحقق منها الخادم."}</p><button class="btn primary wide span-full" type="submit">${signup ? "إنشاء الحساب" : "دخول"}</button>${!signup ? '<button type="button" class="text-btn span-full" id="recovery">نسيت كلمة المرور</button>' : ""}</form>`,
    () => {
      $("#login-mode").onclick = () => showAuth(after, "login");
      $("#register-mode").onclick = () => showAuth(after, "register");
      $("#auth-form").onsubmit = (e) => {
        e.preventDefault();
        withSubmit(e.target, async () => {
          const data = formValues(e.target);
          const s = await api("/auth/" + (signup ? "register" : "login"), {
            method: "POST",
            data,
          });
          setSession(s);
          closeDialog();
          document.dispatchEvent(new Event("aqari:session"));
          toast("تم تسجيل الدخول");
          after?.();
        });
      };
      $("#recovery")?.addEventListener("click", () =>
        openDialog(
          "استعادة الحساب",
          `<form id="recover-form">${field("email", "البريد الإلكتروني", "email", "", 'required dir="ltr"')}<p class="fineprint">تسجل الإدارة الطلب وتتحقق من هويتك قبل إعادة تعيين الدخول. الإرسال التلقائي للبريد غير مفعل.</p><button class="btn primary wide" type="submit">تسجيل طلب الاستعادة</button></form>`,
          () => {
            $("#recover-form").onsubmit = (e) => {
              e.preventDefault();
              withSubmit(e.target, async () => {
                const out = await api("/auth/recovery", {
                  method: "POST",
                  data: formValues(e.target),
                });
                closeDialog();
                toast(out.message);
              });
            };
          },
        ),
      );
    },
  );
}
export function requireAuth(fn) {
  if (!getSession()) showAuth(fn);
  else fn();
}
