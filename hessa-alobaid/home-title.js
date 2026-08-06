(() => {
  'use strict';

  const EXACT_TITLE = 'النظام الرقمي الداخلي لمكتب المحامية حصة العبيد';

  function applyExactTitle() {
    if (document.documentElement.lang === 'en') return;

    document.querySelectorAll('.sabeq-home-head h1').forEach((heading) => {
      heading.textContent = EXACT_TITLE;
    });
  }

  const observer = new MutationObserver(applyExactTitle);
  observer.observe(document.body, { childList: true, subtree: true });

  document.getElementById('langToggle')?.addEventListener('click', () => {
    window.setTimeout(applyExactTitle, 120);
  });

  document.addEventListener('DOMContentLoaded', applyExactTitle, { once: true });
  window.setTimeout(applyExactTitle, 180);
})();
