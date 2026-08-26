(() => {
  'use strict';

  const API_ORIGIN = 'https://sabeq-legal-public.centrino.chatgpt.site';

  // Reduce DNS/TLS setup time before the user reaches document analysis.
  for (const rel of ['preconnect', 'dns-prefetch']) {
    const link = document.createElement('link');
    link.rel = rel;
    link.href = API_ORIGIN;
    if (rel === 'preconnect') link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  }

  const isAnalysisError = (text = '') =>
    /تعذر الاتصال بخدمة التحليل|لم تُرسل الملفات للقراءة|could not be reached|analysis service/i.test(text);

  function enhanceMemoFailure(root = document) {
    const notices = root.querySelectorAll?.('.analysis-notice.error,.form-notice.error,.draft-notice.error') || [];
    for (const notice of notices) {
      if (!isAnalysisError(notice.textContent || '')) continue;

      // Keep the selected files in place; let the user retry without re-selecting.
      notice.dataset.sabeqResilient = '1';

      const memo = notice.closest('.memo-modal') || document.querySelector('.memo-modal');
      if (!memo) continue;

      const actions = memo.querySelector('.memo-actions');
      const next = actions?.querySelector('.button-primary');
      if (next) {
        next.disabled = false;
        next.removeAttribute('disabled');
        next.dataset.analysisFallback = '1';
        const lang = document.documentElement.lang || 'ar';
        next.textContent = lang === 'en' ? 'Continue with manual entry' : lang === 'ur' ? 'دستی اندراج کے ساتھ آگے بڑھیں' : 'المتابعة بالإدخال اليدوي';
      }

      if (!memo.querySelector('.sabeq-analysis-help')) {
        const box = document.createElement('div');
        box.className = 'sabeq-analysis-help';
        box.innerHTML = '<strong>لم تفقد ملفاتك.</strong><span>يمكنك إعادة محاولة التحليل، أو المتابعة بالإدخال اليدوي الآن ثم إعادة التحليل لاحقاً.</span>';
        notice.insertAdjacentElement('afterend', box);
      }
    }
  }

  const style = document.createElement('style');
  style.textContent = `
    .sabeq-analysis-help{margin-top:10px;padding:11px 13px;border:1px solid #bfd9e6;border-radius:10px;background:#f2f9fc;color:#31576a;display:flex;flex-direction:column;gap:3px;font-size:14px;line-height:1.65}
    .sabeq-analysis-help strong{color:#0b6f9f;font-size:15px}
    html[data-theme="dark"] .sabeq-analysis-help{background:#102f3d;border-color:#355564;color:#bdd4df}
    html[data-theme="dark"] .sabeq-analysis-help strong{color:#72d4f6}
  `;
  document.head.appendChild(style);

  const boot = () => {
    enhanceMemoFailure();
    const observer = new MutationObserver(records => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.nodeType === 1) enhanceMemoFailure(node);
        }
      }
      enhanceMemoFailure();
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();