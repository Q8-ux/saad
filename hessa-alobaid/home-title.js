(() => {
  'use strict';

  const AR_TITLE = 'النظام الرقمي الداخلي لمكتب المحامية حصة العبيد';
  const EN_TITLE = 'Hessa Al-Obaid Law Office Internal Digital System';

  function applyExactTitle() {
    const title = document.documentElement.lang === 'en' ? EN_TITLE : AR_TITLE;

    document.querySelectorAll('.sabeq-home-head h1, .dashboard-command h1').forEach((heading) => {
      heading.textContent = title;
    });
  }

  const observer = new MutationObserver(applyExactTitle);
  observer.observe(document.body, { childList: true, subtree: true });

  document.getElementById('langToggle')?.addEventListener('click', () => {
    window.setTimeout(applyExactTitle, 150);
  });

  document.addEventListener('DOMContentLoaded', applyExactTitle, { once: true });
  window.addEventListener('load', applyExactTitle, { once: true });
  window.setTimeout(applyExactTitle, 200);
})();
