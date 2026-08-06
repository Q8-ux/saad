(() => {
  'use strict';

  const isArabic = () => document.documentElement.lang === 'ar' || document.documentElement.dir === 'rtl';

  function goHome() {
    if (typeof switchView === 'function') {
      switchView('dashboard');
      return;
    }
    window.location.hash = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cleanLmsLabels(root = document) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach((node) => {
      const original = node.nodeValue || '';
      let updated = original
        .replace(/LMS\s*[•·|-]?\s*/gi, '')
        .replace(/\s{2,}/g, ' ');

      if (!updated.trim() && /^\s*LMS\s*$/i.test(original)) {
        updated = isArabic() ? 'إدارة المكتب' : 'Office Management';
      }

      if (updated !== original) node.nodeValue = updated;
    });
  }

  function initHomeControl() {
    const button = document.getElementById('homeButton');
    if (button) {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        goHome();
      });
    }

    cleanLmsLabels(document.body);

    const target = document.getElementById('appContent') || document.body;
    const observer = new MutationObserver(() => cleanLmsLabels(target));
    observer.observe(target, { childList: true, subtree: true, characterData: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHomeControl, { once: true });
  } else {
    initHomeControl();
  }
})();
