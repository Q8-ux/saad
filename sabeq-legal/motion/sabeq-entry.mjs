import { createPlayer } from './motion-core.mjs';

const COPY = {
  ar: { heading: 'كيف تستفيد من خدماتنا؟', intro: 'شاهد الخطوات من توضيح طلبك إلى مراجعة المسودة مع المختص.', play: 'شاهد الخطوات', pause: 'إيقاف مؤقت', timeline: 'موضع العرض', brand: 'مجموعة سابق القانونية', steps: [['وضّح طلبك', 'حدّد موضوعك والمساعدة التي تحتاجها.'], ['جهّز معلوماتك', 'رتّب الوقائع والمستندات المرتبطة بطلبك.'], ['راجع المسودة', 'تحقّق من المعلومات والصياغة مع المختص.']] },
  en: { heading: 'How to use our services', intro: 'From describing your request to reviewing a draft with a professional.', play: 'Watch the steps', pause: 'Pause', timeline: 'Playback position', brand: 'Sabeq Legal Group', steps: [['Describe your request', 'Explain your issue and the help you need.'], ['Prepare your information', 'Organize the facts and relevant documents.'], ['Review the draft', 'Check the information and wording with a professional.']] },
  ur: { heading: 'ہماری خدمات سے کیسے فائدہ اٹھائیں؟', intro: 'اپنی درخواست واضح کرنے سے مسودے کے پیشہ ورانہ جائزے تک۔', play: 'مراحل دیکھیں', pause: 'روکیں', timeline: 'نمائش کی جگہ', brand: 'سابق لیگل گروپ', steps: [['درخواست واضح کریں', 'اپنا معاملہ اور مطلوبہ مدد بیان کریں۔'], ['معلومات تیار کریں', 'متعلقہ حقائق اور دستاویزات ترتیب دیں۔'], ['مسودے کا جائزہ لیں', 'ماہر کے ساتھ معلومات اور عبارت کی جانچ کریں۔']] },
};

let mounted;
let player;
let currentLanguage;
function mount() {
  const services = document.querySelector('#services');
  if (!services) return;
  if (!mounted && document.getElementById('sabeq-service-motion')) return;
  const language = Object.hasOwn(COPY, document.body.dataset.language) ? document.body.dataset.language : 'ar';
  if (mounted?.isConnected && currentLanguage === language) return;
  player?.destroy(); mounted?.remove(); currentLanguage = language;
  const copy = COPY[language];
  mounted = document.createElement('section');
  mounted.lang = language; mounted.id = 'sabeq-service-motion'; mounted.className = 'sabeq-service-motion'; mounted.dir = language === 'en' ? 'ltr' : 'rtl';
  mounted.setAttribute('aria-labelledby', 'sabeq-motion-heading');
  // All HTML below is static; translated text is assigned using textContent.
  mounted.innerHTML = '<div class="container pm-service-layout"><div class="pm-service-copy"><h2 id="sabeq-motion-heading"></h2><p></p><ol></ol></div><div class="pm-service-player"><canvas width="1280" height="720" role="img"></canvas><div class="pm-service-controls"><button type="button"></button><input type="range" min="0" max="18" step="0.1" value="0.8"></div></div></div>';
  mounted.querySelector('h2').textContent = copy.heading;
  mounted.querySelector('p').textContent = copy.intro;
  copy.steps.forEach(([title, body]) => {
    const item = document.createElement('li');
    const strong = document.createElement('strong'); strong.textContent = title;
    const span = document.createElement('span'); span.textContent = body;
    item.append(strong, span); mounted.querySelector('ol').append(item);
  });
  const canvas = mounted.querySelector('canvas'); canvas.setAttribute('aria-label', copy.heading);
  const button = mounted.querySelector('button'); button.textContent = copy.play;
  const range = mounted.querySelector('input'); range.setAttribute('aria-label', copy.timeline);
  const font = language === 'ur' ? '"Sabeq Motion Urdu", Tahoma, sans-serif' : language === 'en' ? 'Arial, Tahoma, sans-serif' : '"Al Mohanad", Tahoma, sans-serif';
  player = createPlayer(canvas, {}, font, (time, playing) => {
    range.value = String(time); button.textContent = playing ? copy.pause : copy.play;
    button.setAttribute('aria-pressed', String(playing));
  });
  const project = { theme: 'legal', language, aspect: 'landscape', duration: 18, brand: copy.brand, title: copy.heading, scenes: copy.steps.map(([title, body], index) => ({ title, body, label: language === 'en' ? `STEP 0${index + 1}` : language === 'ur' ? `مرحلہ ${['١', '٢', '٣'][index]}` : ['الخطوة الأولى', 'الخطوة الثانية', 'الخطوة الثالثة'][index] })) };
  player.set(project);
  const localPlayer = player;
  button.addEventListener('click', () => localPlayer.play());
  range.addEventListener('input', () => localPlayer.seek(range.value));
  services.after(mounted);
  const fontReady = language === 'ur' ? document.fonts.load('32px "Sabeq Motion Urdu"') : document.fonts.ready;
  fontReady.then(() => { if (mounted?.isConnected && player === localPlayer && !player.playing) player.seek(.8); });
}

let queued = false;
const observer = new MutationObserver(() => {
  if (mounted?.isConnected) return;
  if (!queued) { queued = true; queueMicrotask(() => { queued = false; mount(); }); }
});
observer.observe(document.getElementById('root') || document.body, { childList: true, subtree: true });
new MutationObserver(mount).observe(document.body, { attributes: true, attributeFilter: ['data-language'] });
mount();

function mountVerifyChallengeModal() {
  if (typeof window === 'undefined' || typeof URLSearchParams === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  let challengeId = (params.get('verify_challenge') || '').trim();
  const email = (params.get('email') || '').trim().toLowerCase();
  const name = (params.get('name') || 'العميل').trim();
  const phone = (params.get('phone') || '00000000').trim();
  if (!challengeId || !email || document.getElementById('sabeq-verify-link-modal')) return;

  const apiBase = 'https://sabeq-legal-public.centrino.chatgpt.site';
  const backdrop = document.createElement('div');
  backdrop.id = 'sabeq-verify-link-modal';
  backdrop.className = 'modal-backdrop';
  backdrop.dir = 'rtl';
  backdrop.innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="sabeq-verify-link-title"><button type="button" class="icon-button modal-close" aria-label="إغلاق">×</button><div class="modal-content auth-gate"><h2></h2><p data-desc></p><form data-verify-form><label class="field"><span>رمز التحقق (6 أرقام)</span><input class="verification-code" name="code" required inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" minlength="6" maxlength="6" dir="ltr"></label><button class="button button-primary button-block" type="submit">تحقق وتابع</button><button class="text-button auth-edit" type="button" data-resend>إرسال رمز جديد إلى البريد</button></form><p class="auth-notice" data-notice aria-live="polite" hidden></p></div></div>';
  backdrop.querySelector('h2').id = 'sabeq-verify-link-title';
  backdrop.querySelector('h2').textContent = 'تفعيل الحساب برمز البريد';
  backdrop.querySelector('[data-desc]').textContent = `أدخل الرمز المرسل من noreply@sabeq.legal إلى ${email}`;

  const notice = backdrop.querySelector('[data-notice]');
  const setNotice = (msg, ok = false) => {
    notice.hidden = !msg;
    notice.textContent = msg;
    notice.className = ok ? 'auth-notice success' : 'auth-notice';
  };
  const close = () => {
    const url = new URL(window.location.href);
    ['verify_challenge', 'email', 'name', 'phone'].forEach(k => url.searchParams.delete(k));
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    backdrop.remove();
  };
  backdrop.querySelector('.modal-close').addEventListener('click', close);

  backdrop.querySelector('[data-resend]').addEventListener('click', async event => {
    const btn = event.currentTarget;
    btn.disabled = true;
    setNotice('جارٍ إرسال رمز جديد...');
    try {
      const res = await fetch(`${apiBase}/api/auth/request-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.length >= 2 ? name : 'العميل', phone: phone.length >= 6 ? phone : '00000000', email, language: 'ar' })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.challengeId) throw new Error(data.error || 'تعذر إرسال رمز جديد حالياً.');
      challengeId = data.challengeId;
      setNotice('تم إرسال رمز جديد إلى بريدك الإلكتروني.', true);
    } catch (err) {
      setNotice(err.message || 'تعذر إرسال رمز جديد حالياً.');
    } finally {
      btn.disabled = false;
    }
  });

  backdrop.querySelector('[data-verify-form]').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const submitBtn = form.querySelector('button[type="submit"]');
    const code = String(new FormData(form).get('code') || '').trim();
    submitBtn.disabled = true;
    setNotice('جارٍ التحقق...');
    try {
      const res = await fetch(`${apiBase}/api/auth/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId, email, code })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.token) throw new Error(data.error || 'تعذر التحقق من الرمز.');
      window.localStorage.setItem('sabeq-session-token', data.token);
      setNotice('تم تفعيل حسابك بنجاح. جارٍ المتابعة...', true);
      const url = new URL(window.location.href);
      ['verify_challenge', 'email', 'name', 'phone'].forEach(k => url.searchParams.delete(k));
      window.location.replace(url.pathname + url.search + url.hash);
    } catch (err) {
      setNotice(err.message || 'تعذر التحقق من الرمز.');
      submitBtn.disabled = false;
    }
  });

  document.body.appendChild(backdrop);
  backdrop.querySelector('input[name="code"]')?.focus();
}

mountVerifyChallengeModal();
