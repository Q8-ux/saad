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
