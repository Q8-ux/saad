(() => {
  'use strict';

  const AR_TITLE = 'النظام الرقمي الداخلي لمكتب المحامية حصة العبيد';
  const EN_TITLE = 'Hessa Al-Obaid Law Office Internal Digital System';
  let scheduled = false;

  function applyExactTitle() {
    const title = document.documentElement.lang === 'en' ? EN_TITLE : AR_TITLE;

    document.querySelectorAll('.sabeq-home-head h1, .dashboard-command h1').forEach((heading) => {
      if (heading.textContent.trim() !== title) heading.textContent = title;
    });
  }

  function scheduleTitleUpdate() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      applyExactTitle();
    });
  }

  const observer = new MutationObserver((mutations) => {
    const relevantChange = mutations.some((mutation) =>
      [...mutation.addedNodes].some((node) =>
        node.nodeType === Node.ELEMENT_NODE &&
        (node.matches?.('.sabeq-home-head, .dashboard-command, .sabeq-home-head h1, .dashboard-command h1') ||
         node.querySelector?.('.sabeq-home-head h1, .dashboard-command h1'))
      )
    );

    if (relevantChange) scheduleTitleUpdate();
  });

  observer.observe(document.body, { childList: true, subtree: true });

  document.getElementById('langToggle')?.addEventListener('click', () => {
    window.setTimeout(scheduleTitleUpdate, 120);
  });

  document.addEventListener('DOMContentLoaded', scheduleTitleUpdate, { once: true });
  window.addEventListener('load', scheduleTitleUpdate, { once: true });
  window.setTimeout(scheduleTitleUpdate, 180);
})();
