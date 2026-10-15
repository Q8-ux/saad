import { EVENT, whatsappUrl, replyMessage, countdownText, googleCalendarUrl, shareText } from './event.mjs';

const $ = selector => document.querySelector(selector);
let toastTimer;
let lastDialogTrigger;

function toast(text) {
  const element = $('#toast');
  element.textContent = text;
  element.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { element.hidden = true; }, 4000);
}

function openDialog(id, trigger) {
  const dialog = document.getElementById(id);
  if (!dialog || typeof dialog.showModal !== 'function') {
    if (id === 'original-dialog') location.href = 'assets/invitation-original.jpg';
    else if (id === 'calendar-dialog') location.href = 'hamad-wedding.ics';
    else if (id === 'rsvp-dialog') location.href = whatsappUrl(EVENT.contacts[0], 'السلام عليكم، بخصوص دعوة زفاف حمد يوم الثلاثاء 20 أكتوبر 2026 مساءً.');
    else if (id === 'qr-dialog') location.href = EVENT.mapUrl;
    else if (id === 'share-dialog') location.href = `https://wa.me/?text=${encodeURIComponent(shareText())}`;
    return;
  }
  lastDialogTrigger = trigger || document.activeElement;
  dialog.showModal();
  document.body.style.overflow = 'hidden';
}

function showQr(kind, trigger) {
  const invitation = kind === 'invitation';
  $('#qr-title').textContent = invitation ? 'شارك دعوة الفرح' : 'موقع ديوان الماضي';
  $('#qr-image').src = invitation ? 'assets/invitation-qr.svg' : 'assets/location-qr.svg';
  $('#qr-image').alt = invitation ? 'رمز رابط دعوة زفاف حمد' : 'رمز موقع الديوان المستخرج من البطاقة الأصلية';
  $('#qr-description').textContent = invitation ? 'امسح الرمز لفتح دعوة زفاف حمد' : 'امسح الرمز لفتح رابط الموقع من البطاقة الأصلية';
  $('#qr-link').href = invitation ? EVENT.publicUrl : EVENT.mapUrl;
  openDialog('qr-dialog', trigger);
}

async function copyLink() {
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(EVENT.publicUrl);
    toast('تم نسخ رابط الدعوة');
  } catch {
    $('#copy-fallback').hidden = false;
    $('#share-link').focus();
    $('#share-link').select();
    toast('اضغط مطوّلًا على الرابط لنسخه');
  }
}

async function nativeShare() {
  if (!navigator.share) { await copyLink(); return; }
  try {
    await navigator.share({ title: EVENT.title, text: 'الثلاثاء 20 أكتوبر 2026 مساءً • ديوان الماضي • بحضوركم يتم الفرح والسرور', url: EVENT.publicUrl });
  } catch (error) {
    if (error.name !== 'AbortError') await copyLink();
  }
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const dark = theme === 'dark';
  const button = $('[data-action="theme"]');
  button.setAttribute('aria-pressed', String(dark));
  button.setAttribute('aria-label', dark ? 'تفعيل المظهر النهاري' : 'تفعيل المظهر الليلي');
  button.querySelector('use').setAttribute('href', dark ? '#i-sun' : '#i-moon');
  $('meta[name="theme-color"]').content = dark ? '#1d1e1c' : '#f7f4ee';
  try { localStorage.setItem('hamad-invitation-theme', theme); } catch { /* Optional preference. */ }
}

document.addEventListener('click', event => {
  const close = event.target.closest('[data-close]');
  if (close) { close.closest('dialog').close(); return; }
  const counter = event.target.closest('[data-count]');
  if (counter) {
    const field = $('#guest-count');
    field.value = Math.min(20, Math.max(1, (Number(field.value) || 1) + Number(counter.dataset.count)));
    return;
  }
  const trigger = event.target.closest('[data-action]');
  if (!trigger) return;
  const action = trigger.dataset.action;
  if (action === 'rsvp') openDialog('rsvp-dialog', trigger);
  else if (action === 'calendar') openDialog('calendar-dialog', trigger);
  else if (action === 'share') openDialog('share-dialog', trigger);
  else if (action === 'original') openDialog('original-dialog', trigger);
  else if (action === 'location-qr') showQr('location', trigger);
  else if (action === 'invitation-qr') showQr('invitation', trigger);
  else if (action === 'copy-link') void copyLink();
  else if (action === 'native-share') void nativeShare();
  else if (action === 'theme') setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
});

document.querySelectorAll('dialog').forEach(dialog => {
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.body.style.overflow = '';
    lastDialogTrigger?.focus?.();
  });
});

const form = $('#rsvp-form');
form.addEventListener('change', () => {
  const going = form.elements.response.value === 'going';
  $('#guest-count-field').hidden = !going;
  $('#guest-count').disabled = !going;
  $('#rsvp-feedback').hidden = true;
});
form.addEventListener('submit', event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  try {
    const message = replyMessage({ name: data.get('name'), response: data.get('response'), count: data.get('count') || 1 });
    const url = whatsappUrl(String(data.get('recipient')), message);
    const feedback = $('#rsvp-feedback');
    feedback.hidden = false;
    feedback.textContent = 'تابع في واتساب واضغط إرسال لإيصال ردّك للعائلة.';
    window.location.assign(url);
  } catch (error) { toast(error.message); }
});

document.querySelectorAll('.location-link').forEach(a => { a.href = EVENT.mapUrl; });
$('#google-calendar').href = googleCalendarUrl();
$('#whatsapp-share').href = `https://wa.me/?text=${encodeURIComponent(shareText())}`;

function refreshCountdown() { $('#countdown-label').textContent = countdownText(new Date()); }
refreshCountdown();
setInterval(refreshCountdown, 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshCountdown(); });

try {
  const stored = localStorage.getItem('hamad-invitation-theme');
  if (stored === 'dark' || stored === 'light') setTheme(stored);
} catch { /* Private browsing must not prevent invitation access. */ }

const guest = new URLSearchParams(location.search).get('to');
if (guest?.trim()) {
  const greeting = $('#personal-greeting');
  greeting.textContent = `حياك الله، ${guest.trim().slice(0,60)}`;
  greeting.hidden = false;
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {});
  });
}
