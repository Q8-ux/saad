(() => {
  'use strict';

  const AR_TITLE = 'النظام الرقمي الداخلي لمكتب المحامية حصة العبيد';
  const EN_TITLE = 'Hessa Al-Obaid Law Office Internal Digital System';
  const oldTitles = new Set([
    'مرحبًا بك في مكتب المحامية حصة العبيد',
    'مرحبا بك في مكتب المحامية حصة العبيد',
    'Welcome to Hessa Al-Obaid Law Office'
  ]);

  function updateHomeTitle() {
    const english = document.documentElement.lang === 'en';
    document.querySelectorAll('.sabeq-home-head h1').forEach((heading) => {
      const current = heading.textContent.trim();
      if (oldTitles.has(current) || current === AR_TITLE || current === EN_TITLE) {
        heading.textContent = english ? EN_TITLE : AR_TITLE;
      }
    });
  }

  const observer = new MutationObserver(updateHomeTitle);
  observer.observe(document.body, { childList: true, subtree: true });

  document.getElementById('langToggle')?.addEventListener('click', () => {
    window.setTimeout(updateHomeTitle, 120);
  });

  document.addEventListener('DOMContentLoaded', updateHomeTitle, { once: true });
  window.setTimeout(updateHomeTitle, 180);
})();
