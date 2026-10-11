import { analyzeNumber, enrichNumber, countries, reportText } from './core.mjs';
import manifest from '../public/data/manifest.json';

const $ = id => document.getElementById(id);
const form = $('phone-form');
const phoneInput = $('phone');
const countryInput = $('country');
const panel = document.querySelector('.results-panel');
let requestID = 0;
let result = null;
let controller;
let toastTimer;
const chunks = new Map();

const preferred = ['KW', 'SA', 'AE', 'BH', 'QA', 'OM', 'EG', 'JO', 'IQ', 'LB'];
countries.sort((a, b) => {
  const ai = preferred.indexOf(a.code), bi = preferred.indexOf(b.code);
  if (ai !== -1 || bi !== -1) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  return a.name.localeCompare(b.name, 'ar');
});
countryInput.replaceChildren(...countries.map(c => {
  const option = document.createElement('option');
  option.value = c.code;
  option.textContent = `${c.name} (+${c.callingCode})`;
  return option;
}));
countryInput.value = 'KW';

function setText(id, value) { $(id).textContent = value; }
function ready(busy = false) {
  $('analyze').disabled = busy;
  setText('analyze-label', busy ? 'جارٍ التحليل…' : 'تحليل الرقم');
  panel.setAttribute('aria-busy', String(busy));
  $('copy-report').disabled = busy;
  $('download-report').disabled = busy;
}
function toast(message) {
  clearTimeout(toastTimer);
  setText('toast', message);
  $('toast').hidden = false;
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, 4500);
}
function dismissResult() {
  ++requestID;
  controller?.abort();
  result = null;
  $('report').hidden = true;
  $('empty-state').hidden = false;
  $('error-message').hidden = true;
  phoneInput.removeAttribute('aria-invalid');
  setText('report-status', 'بانتظار الرقم');
  ready();
}
function render(r, pending = false) {
  $('empty-state').hidden = true;
  $('report').hidden = false;
  setText('report-status', pending ? 'تحميل البيانات الإضافية' : 'اكتمل التقرير');
  setText('result-number', r.international);
  setText('result-country', r.countryName);
  setText('valid-badge', r.valid ? 'مطابق لخطة الترقيم' : 'غير مطابق لخطة الترقيم');
  $('valid-badge').classList.toggle('invalid', !r.valid);
  setText('valid-description', r.lengthMessage + (r.valid ? ' لا تعني هذه النتيجة أن الخط يعمل أو أن ملكيته مؤكدة.' : ' لن نعرض مشغلاً أو منطقة لرقم غير مطابق.'));
  setText('country-value', r.countryName);
  setText('calling-code-value', '+' + r.callingCode);
  setText('type-value', r.typeLabel);
  setText('carrier-value', pending ? 'جارٍ القراءة…' : r.carrier || 'غير متوفر');
  setText('area-value', pending ? 'جارٍ القراءة…' : r.area || (r.valid ? 'لا تتوفر منطقة تفصيلية' : 'غير متوفر لرقم غير مطابق'));
  setText('timezone-value', pending ? '…' : r.timezones.join(' · ') || 'غير متوفرة');
  setText('international-value', r.international);
  setText('national-value', r.national);
  setText('e164-value', r.e164);
  setText('national-number-value', r.nationalNumber);
  setText('uri-value', r.uri);
  setText('length-value', r.digitCount + ' أرقام');
  setText('international-length-value', r.internationalDigits + ' أرقام');
  setText('possible-value', r.possible ? 'نعم، من حيث عدد الأرقام' : 'لا');
  setText('iso-value', r.country || r.possibleCountries.join(' / ') || 'غير محدد');
  setText('metadata-message', pending ? 'تُحمّل بيانات عامة خاصة بمفتاح الدولة؛ رقم الهاتف نفسه لا يُرسل.' : r.metadataAvailable ? `البيانات الإضافية: الإصدار ${manifest.version} · أُعدّت في ${manifest.generatedAt}. بعض المناطق وأسماء المشغلين قد تظهر بلغتها الأصلية.` : r.valid ? 'تعذر تحميل البيانات الإضافية. نتائج التنسيق والتحقق الأساسية ما زالت متاحة.' : 'التحليل يعتمد على خطة الترقيم؛ لم يتم إجراء تحقق باتصال أو رسالة.');
}

async function getChunk(code, signal) {
  if (!/^\d{1,3}$/.test(code) || !manifest.countryCallingCodes.includes(code)) throw new Error('Invalid calling code');
  if (chunks.has(code)) return chunks.get(code);
  const response = await fetch(new URL(`../data/${code}.json`, document.currentScript?.src || new URL('assets/app.js', document.baseURI)), { signal, credentials: 'omit' });
  if (!response.ok) throw new Error('Metadata unavailable');
  const chunk = await response.json();
  chunks.set(code, chunk);
  return chunk;
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  controller?.abort();
  const id = ++requestID;
  $('error-message').hidden = true;
  phoneInput.removeAttribute('aria-invalid');
  let next;
  try { next = analyzeNumber(phoneInput.value, countryInput.value); }
  catch (error) {
    dismissResult();
    setText('error-message', error.message);
    $('error-message').hidden = false;
    phoneInput.setAttribute('aria-invalid', 'true');
    phoneInput.focus();
    return;
  }
  ready(next.valid);
  render(next, next.valid);
  if (next.valid) {
    const requestController = new AbortController();
    controller = requestController;
    const timer = setTimeout(() => requestController.abort(), 10000);
    try { next = enrichNumber(next, await getChunk(next.callingCode, requestController.signal), manifest); }
    catch { /* Basic results remain usable if an optional metadata chunk is unavailable. */ }
    finally { clearTimeout(timer); }
  }
  if (id !== requestID) return;
  result = next;
  render(result);
  ready();
});

phoneInput.addEventListener('input', dismissResult);
countryInput.addEventListener('change', dismissResult);
$('clear').addEventListener('click', () => { phoneInput.value = ''; dismissResult(); document.querySelector('.technical-details').open = false; phoneInput.focus(); });
$('copy-report').addEventListener('click', async () => {
  if (!result) return;
  try { await navigator.clipboard.writeText(reportText(result)); toast('تم نسخ التقرير.'); }
  catch { toast('المتصفح لم يسمح بالنسخ. يمكنك تنزيل التقرير.'); }
});
$('download-report').addEventListener('click', () => {
  if (!result) return;
  const url = URL.createObjectURL(new Blob(['\uFEFF' + reportText(result)], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'phone-report.txt';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('تم تجهيز التقرير للتنزيل.');
});
ready();
