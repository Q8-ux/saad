(() => {
  'use strict';

  if (typeof state === 'undefined') return;

  const residuals = new Map([
    ['د.ك', 'KWD'],
    ['ح ع', 'H A'],
    ['اللغة', 'Language'],
    ['المظهر', 'Appearance'],
    ['الإشعارات', 'Notifications'],
    ['فتح القائمة', 'Open menu'],
    ['إغلاق القائمة', 'Close menu'],
    ['الرجوع إلى الرئيسية', 'Return to home'],
    ['الدخول التجريبي: admin / admin123', 'Demo access: admin / admin123'],
    ['منصة موحدة لإدارة القضايا والعملاء والجلسات والمستندات والمراسلات والشؤون المالية.', 'A unified platform for cases, clients, hearings, documents, correspondence, and finance.'],
    ['مرحبا', 'Welcome'],
    ['مرحبًا', 'Welcome'],
    ['لديك', 'You have'],
    ['عناصر تحتاج متابعة', 'items require follow-up'],
    ['تأكيد الحذف؟', 'Confirm deletion?'],
    ['سيتم حذف البيانات المحلية وإعادة النسخة التجريبية. متابعة؟', 'Local data will be deleted and the demo version will be restored. Continue?']
  ]);

  const hasArabic = value => /[\u0600-\u06FF]/.test(value || '');

  function translateResidual(value) {
    if (!value || !hasArabic(value)) return value;
    let result = value;
    [...residuals.entries()].sort((a, b) => b[0].length - a[0].length).forEach(([arabic, english]) => {
      result = result.split(arabic).join(english);
    });
    return result;
  }

  function polish() {
    const english = state.language === 'en';
    const languageButton = document.getElementById('langToggle');
    if (languageButton) {
      languageButton.textContent = english ? 'AR' : 'EN';
      languageButton.setAttribute('aria-label', english ? 'Switch to Arabic' : 'التحويل إلى الإنجليزية');
      languageButton.title = english ? 'Switch to Arabic' : 'التحويل إلى الإنجليزية';
    }

    document.querySelectorAll('.legal-logo > span, .legal-logo-lg > span').forEach(logo => {
      logo.textContent = english ? 'H A' : 'ح ع';
    });

    if (!english) return;

    document.querySelectorAll('[aria-label], [title], [placeholder]').forEach(element => {
      ['aria-label', 'title', 'placeholder'].forEach(attribute => {
        const value = element.getAttribute(attribute);
        if (value && hasArabic(value)) {
          const translated = window.HessaFullI18n?.translateString ? window.HessaFullI18n.translateString(value) : translateResidual(value);
          element.setAttribute(attribute, translateResidual(translated));
        }
      });
    });

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || ['SCRIPT', 'STYLE', 'TEXTAREA'].includes(parent.tagName) || parent.isContentEditable) return NodeFilter.FILTER_REJECT;
        return hasArabic(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      const translated = window.HessaFullI18n?.translateString ? window.HessaFullI18n.translateString(node.nodeValue) : node.nodeValue;
      node.nodeValue = translateResidual(translated);
    });
  }

  let queued = false;
  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      polish();
    });
  };

  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  document.getElementById('langToggle')?.addEventListener('click', () => setTimeout(polish, 140));
  window.addEventListener('load', polish, { once: true });
  setTimeout(polish, 220);
})();
