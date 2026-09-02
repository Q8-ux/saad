(() => {
  'use strict';

  const replacements = [
    [/برخ/g, 'برج'],
    [/الاستخراخ/g, 'الاستخراج'],
    [/استخراخ/g, 'استخراج']
  ];

  function fixText(value) {
    let next = value;
    for (const [pattern, replacement] of replacements) next = next.replace(pattern, replacement);
    return next;
  }

  function fixRoot(root = document.body) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const next = fixText(node.nodeValue || '');
      if (next !== node.nodeValue) node.nodeValue = next;
    }
    root.querySelectorAll?.('input[placeholder], textarea[placeholder], [title], [aria-label]').forEach(el => {
      for (const attr of ['placeholder', 'title', 'aria-label']) {
        if (!el.hasAttribute(attr)) continue;
        const oldValue = el.getAttribute(attr) || '';
        const next = fixText(oldValue);
        if (next !== oldValue) el.setAttribute(attr, next);
      }
    });
  }

  function boot() {
    fixRoot(document.body);
    const observer = new MutationObserver(records => {
      for (const record of records) {
        if (record.type === 'characterData' && record.target) {
          const next = fixText(record.target.nodeValue || '');
          if (next !== record.target.nodeValue) record.target.nodeValue = next;
        }
        for (const node of record.addedNodes || []) {
          if (node.nodeType === Node.TEXT_NODE) {
            const next = fixText(node.nodeValue || '');
            if (next !== node.nodeValue) node.nodeValue = next;
          } else if (node.nodeType === Node.ELEMENT_NODE) fixRoot(node);
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
