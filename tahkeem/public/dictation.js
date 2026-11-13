const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const localLanguages = new Set();
let active;

if (typeof Recognition?.available === 'function') {
  for (const lang of ['ar-KW', 'ar-SA', 'en-GB', 'en-US']) {
    Promise.resolve().then(() => Recognition.available({ langs: [lang], processLocally: true }))
      .then(status => { if (status === 'available') localLanguages.add(lang); })
      .catch(() => {});
  }
}

const errors = {
  'not-allowed': 'اسمح باستخدام الميكروفون من إعدادات الموقع في المتصفح ثم أعد المحاولة.',
  'service-not-allowed': 'خدمة الإملاء غير متاحة في هذا المتصفح. جرّب ميكروفون لوحة المفاتيح.',
  'audio-capture': 'تعذر الوصول إلى الميكروفون. تحقق من اتصاله وإذن المتصفح.',
  'no-speech': 'لم ألتقط كلامًا واضحًا. اضغط الميكروفون وتحدث من جديد.',
  network: 'تعذر الاتصال بخدمة الإملاء في المتصفح. أعد المحاولة أو استخدم ميكروفون لوحة المفاتيح.',
  'language-not-supported': 'لغة الإملاء غير متاحة في هذا المتصفح. جرّب ميكروفون لوحة المفاتيح.',
};

function showStatus(field, message = '', error = false) {
  const status = field.closest('[data-voice-field]')?.querySelector('[data-voice-status]');
  if (!status) return;
  status.textContent = message;
  status.hidden = !message;
  status.classList.toggle('voice-error', error);
}

function finish(session, message, error = false) {
  if (active !== session) return;
  active = null;
  clearTimeout(session.timer);
  session.button.setAttribute('aria-pressed', 'false');
  showStatus(session.field, message, error);
  if (session.wrote && session.field.isConnected) session.onText(session.field);
}

export function cancelDictation(scope = document) {
  if (!active || !scope.contains(active.field)) return;
  const session = active;
  active = null;
  clearTimeout(session.timer);
  session.button.setAttribute('aria-pressed', 'false');
  showStatus(session.field);
  try { session.recognition.abort(); } catch {}
}

export function finishDictation(scope = document) {
  if (!active || !scope.contains(active.field)) return false;
  const session = active;
  if (session.stopping) return true;
  session.stopping = true;
  showStatus(session.field, 'جارٍ إنهاء الإملاء…');
  clearTimeout(session.timer);
  session.timer = setTimeout(() => {
    finish(session, session.wrote ? 'تم إدخال النص الملتقط.' : errors['no-speech']);
    try { session.recognition.abort(); } catch {}
  }, 4000);
  try { session.recognition.stop(); }
  catch { finish(session, session.wrote ? 'تم إدخال النص الملتقط.' : errors['no-speech']); }
  return true;
}

function appendText(session, transcript) {
  const { field } = session;
  const text = transcript.trim().replace(/\s+/gu, ' ');
  if (!text) return;
  const prefix = field.value && !/\s$/u.test(field.value) && !/^[,.،؛؟!؟:]/u.test(text) ? ' ' : '';
  const limit = field.maxLength >= 0 ? field.maxLength - field.value.length : Number.POSITIVE_INFINITY;
  const insert = (prefix + text).slice(0, Math.max(0, limit)).replace(/[\uD800-\uDBFF]$/u, '');
  if (insert.trim()) {
    field.value += insert;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    session.wrote = true;
  }
  if (insert.length < prefix.length + text.length) {
    finish(session, 'بلغ الحقل الحد الأقصى للطول.');
    try { session.recognition.abort(); } catch {}
  }
}

export function toggleDictation(button, language, onText) {
  const field = button.closest('[data-voice-field]')?.querySelector('[data-voice-input]');
  if (!field || field.disabled || field.readOnly || !field.isConnected) return;
  if (active?.field === field) {
    finishDictation();
    return;
  }
  cancelDictation();
  if (!Recognition) {
    showStatus(field, 'الإملاء غير مدعوم في هذا المتصفح. استخدم ميكروفون لوحة المفاتيح أو افتح تحكيم في متصفح يدعم الإملاء.', true);
    field.focus();
    return;
  }
  const recognition = new Recognition();
  const candidates = language === 'en' ? ['en-GB', 'en-US'] : ['ar-KW', 'ar-SA'];
  const local = candidates.find(lang => localLanguages.has(lang));
  recognition.lang = local || candidates[0];
  if (local) recognition.processLocally = true;
  recognition.continuous = true;
  recognition.interimResults = false;

  const session = { recognition, field, button, onText, received: 0, wrote: false, stopping: false };
  active = session;
  button.setAttribute('aria-pressed', 'true');
  showStatus(field, 'جارٍ تشغيل الميكروفون…');
  recognition.onstart = () => {
    if (active !== session || session.stopping) return;
    showStatus(field, 'الميكروفون يعمل. اضغط الأيقونة لإيقاف الإملاء.');
  };
  recognition.onresult = event => {
    if (active !== session || !field.isConnected) return;
    const finalized = [];
    for (let index = Math.max(event.resultIndex, session.received); index < event.results.length; index++) {
      const result = event.results[index];
      if (!result.isFinal) break;
      finalized.push(result[0].transcript);
      session.received = index + 1;
    }
    appendText(session, finalized.join(' '));
  };
  recognition.onerror = event => {
    finish(session, errors[event.error] || 'تعذر إكمال الإملاء. أعد المحاولة.', true);
  };
  recognition.onend = () => finish(session, session.wrote ? 'تم إدخال النص. راجعه قبل المتابعة.' : errors['no-speech']);
  try { recognition.start(); }
  catch { finish(session, errors['not-allowed'], true); }
}
