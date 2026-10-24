import { API_URL } from "./config.mjs";
import { escapeHTML } from "./core.mjs";
import { getLocale } from "./i18n.mjs";
import './theme.mjs';
const paths = {
  mic: "M9 5a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0zM5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8",
  volume: "M4 9h4l5-4v14l-5-4H4zM17 8a6 6 0 0 1 0 8M20 5a10 10 0 0 1 0 14",
  stop: "M6 6h12v12H6z",
  home: "M3 10 12 3l9 7M5 9v12h14V9M9 21v-7h6v7",
  building: "M4 21V5h10v16M14 11h6v10M8 9h2M8 13h2M8 17h2M18 15v2M2 21h20",
  search: "M20 20l-5-5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0",
  heart:
    "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8",
  compare: "M5 3v18M19 3v18M2 8h6M16 16h6M9 5h6M9 19h6",
  inbox: "M3 3h18v18H3zM3 14h5l2 3h4l2-3h5",
  calculator:
    "M5 3h14v18H5zM8 6h8M8 11h1M15 11h1M8 15h1M15 15h1M8 18h1M15 18h1",
  globe:
    "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M3 12h18M12 3c-5 5-5 13 0 18 5-5 5-13 0-18",
  plus: "M12 5v14M5 12h14",
  user: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M4 21v-3c0-6 16-6 16 0v3",
  settings:
    "M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8M10 2h4l1 3 3-1 3 3-1 3 2 1v3l-3 1 1 3-3 3-3-1-1 2h-3l-1-3-3 1-3-3 1-3-2-1v-3l3-1-1-3 3-3 3 1z",
  close: "M5 5l14 14M19 5 5 19",
  pin: "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  bed: "M3 18V8M3 13h18v5M6 13V8h12v5M3 18v3M21 18v3",
  area: "M3 8V3h5M16 3h5v5M21 16v5h-5M8 21H3v-5M7 17 17 7M7 11V7h4M13 17h4v-4",
  bath: "M4 12h17v3a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V6a3 3 0 0 1 6 0M8 20v2M17 20v2",
  filter: "M3 6h18M6 12h12M9 18h6M7 3v6M16 9v6M12 15v6",
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  list: "M9 5h12M9 12h12M9 19h12M3 5h1M3 12h1M3 19h1",
  share:
    "M15 8l-6 4 6 4M21 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0M9 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0M21 19a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  calendar: "M4 5h16v16H4zM4 10h16M8 3v4M16 3v4M8 14h2M14 17h2",
  arrow: "M19 12H5M11 6l-6 6 6 6",
  check: "M5 12l4 4L19 6",
  download: "M12 3v12M7 10l5 5 5-5M3 17v4h18v-4",
  upload: "M12 17V5M7 10l5-5 5 5M3 17v4h18v-4",
  clock: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M12 7v5l3 2",
  menu: "M3 6h18M3 12h18M3 18h18",
  file: "M5 3h9l5 5v13H5zM14 3v6h5M8 13h8M8 17h5",
  users:
    "M15 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0M5 21v-3c0-5 14-5 14 0v3M3 7a3 3 0 0 1 2 5M21 7a3 3 0 0 0-2 5",
  logout: "M9 3H4v18h5M9 12h12M16 7l5 5-5 5",
  whatsapp:
    "M21 11a9 9 0 0 1-13.5 7.8L3 21l1.7-5.5A9 9 0 1 1 21 11M8 7c0 5 4 9 8 9l1-3-3-1-1 1c-2-1-3-2-3-3l1-1-1-3z",
  lock: "M5 10h14v11H5zM8 10V6a4 4 0 0 1 8 0v4M12 14v3",
  spark: "M12 3l2 7 7 2-7 2-2 7-2-7-7-2 7-2z",
  money: "M3 6h18v12H3zM14 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0M6 9v6M18 9v6",
};
export const icon = (name, extra = "") =>
  `<svg class="icon ${extra}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.home}"/></svg>`;
export function hydrateIcons(root = document) {
  root.querySelectorAll("[data-icon]").forEach((el) => {
    if (!el.querySelector(":scope > svg"))
      el.insertAdjacentHTML("afterbegin", icon(el.dataset.icon));
  });
}
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export function toast(text, error = false) {
  const box = document.getElementById("toasts");
  const el = document.createElement("div");
  el.className = "toast" + (error ? " error" : "");
  el.textContent = text;
  box?.append(el);
  setTimeout(() => el.remove(), 5000);
}
export function getSession() {
  try {
    return JSON.parse(sessionStorage.getItem("aqari-session")) || null;
  } catch {
    return null;
  }
}
export function setSession(s) {
  s
    ? sessionStorage.setItem("aqari-session", JSON.stringify(s))
    : sessionStorage.removeItem("aqari-session");
}
export async function api(path, { method = "GET", data, signal } = {}) {
  if (!API_URL) throw new Error("الخادم غير مهيأ بعد");
  const s = getSession();
  const r = await fetch(API_URL.replace(/\/$/, "") + path, {
    method,
    headers: {
      ...(s ? { authorization: `Bearer ${s.token}` } : {}),
      ...(data ? { "content-type": "application/json" } : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
    signal: signal || AbortSignal.timeout(45000),
  });
  const out = await r
    .json()
    .catch(() => ({ error: "استجابة الخادم غير صالحة" }));
  if (!r.ok) {
    const e = Object.assign(new Error(out.error || "تعذرت العملية"), {
      status: r.status,
    });
    if (r.status === 401) setSession(null);
    throw e;
  }
  return out;
}
export const imageURL = (id) =>
  `${API_URL.replace(/\/$/, "")}/images/${encodeURIComponent(id)}`;
export function openDialog(title, html, onReady) {
  const dialog = $("#modal");
  if (dialog.open) dialog.close();
  $("#modal-title").textContent = title;
  $("#modal-content").innerHTML = html;
  hydrateIcons(dialog);
  dialog.showModal();
  onReady?.(dialog);
}
export const closeDialog = () => $("#modal").close();
export function formValues(form) {
  return Object.fromEntries(new FormData(form));
}
export function errorIn(form, text) {
  let el = form.querySelector(".form-error");
  if (!el) {
    el = document.createElement("p");
    el.className = "form-error";
    el.setAttribute("role", "alert");
    form.prepend(el);
  }
  el.textContent = text;
}
export async function withSubmit(form, fn) {
  const button = form.querySelector('[type="submit"]');
  const old = button?.innerHTML;
  if (button) {
    button.disabled = true;
    button.textContent = "جارٍ الحفظ…";
  }
  form.querySelector(".form-error")?.remove();
  try {
    await fn();
  } catch (e) {
    errorIn(form, e.message);
  } finally {
    if (button) {
      button.disabled = false;
      button.innerHTML = old;
    }
  }
}
export function field(name, label, type = "text", value = "", extra = "") {
  return `<label class="field"><span>${escapeHTML(label)}</span><input type="${type}" name="${name}" value="${escapeHTML(value)}" ${extra}></label>`;
}
export function selectField(name, label, options, value = "", empty = "الكل") {
  return `<label class="field"><span>${escapeHTML(label)}</span><select name="${name}">${empty === null ? "" : `<option value="">${escapeHTML(empty)}</option>`}${options
    .map((x) => {
      const val = Array.isArray(x) ? x[0] : x,
        label = Array.isArray(x) ? x[1] : x;
      return `<option value="${escapeHTML(val)}" ${String(val) === String(value) ? "selected" : ""}>${escapeHTML(label)}</option>`;
    })
    .join("")}</select></label>`;
}
export function empty(title, text, action = "") {
  return `<div class="empty-state"><div class="empty-symbol">${icon("building")}</div><h2>${escapeHTML(title)}</h2><p>${escapeHTML(text)}</p>${action}</div>`;
}
export function download(name, data, type = "application/json") {
  const blob = new Blob(
    [typeof data === "string" ? data : JSON.stringify(data, null, 2)],
    { type },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
export const dateLabel = (slot) =>
  new Intl.DateTimeFormat({ar:"ar-KW",en:"en-KW",ur:"ur-PK"}[getLocale()], {
    timeZone: "Asia/Kuwait",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(slot));
export function initDialog() {
  $("#modal-close")?.addEventListener("click", closeDialog);
  $("#modal")?.addEventListener("click", (e) => {
    if (e.target === $("#modal")) {
      const r = $("#modal").getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        closeDialog();
    }
  });
}
