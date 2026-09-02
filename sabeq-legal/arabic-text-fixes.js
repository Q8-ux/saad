(() => {
  'use strict';
  const fixes = [
    [/برخ/g, 'برج'],
    [/الاستخراخ/g, 'الاستخراج'],
    [/استخراخ/g, 'استخراج']
  ];
  function correctText(root = document.body) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const parent = node.parentElement;
      if (!parent || /^(SCRIPT|STYLE|TEXTAREA|INPUT)$/i.test(parent.tagName)) continue;
      let value = node.nodeValue || '';
      let next = value;
      for (const [pattern, replacement] of fixes) next = next.replace(pattern, replacement);
      if (next !== value) node.nodeValue = next;
    }
    root.querySelectorAll?.('input[placeholder], textarea[placeholder], [title], [aria-label]').forEach(el => {
      for (const attr of ['placeholder','title','aria-label']) {
        if (!el.hasAttribute(attr)) continue;
        let value = el.getAttribute(attr) || '';
        let next = value;
        for (const [pattern, replacement] of fixes) next = next.replace(pattern, replacement);
        if (next !== value) el.setAttribute(attr, next);
      }
    });
  }
  function boot() {
    correctText();
    let scheduled = false;
    const observer = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => { scheduled = false; correctText(); });
    });
    observer.observe(document.body, {childList:true, subtree:true, characterData:true});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
