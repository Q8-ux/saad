// Expiry is an absolute instant: midnight on the return date in Kuwait (UTC+03).
(() => {
  'use strict';
  const notices = [...document.querySelectorAll('[data-expiring-notice]')];
  if (!notices.length) return;
  let timer;
  function refresh() {
    clearTimeout(timer);
    const now = Date.now();
    let next = Infinity;
    for (const notice of notices) {
      if (!notice.isConnected) continue;
      const expires = Date.parse(notice.dataset.expiresAt);
      if (!Number.isFinite(expires) || now >= expires) {
        if (notice.open && typeof notice.close === 'function') notice.close();
        notice.remove();
      } else {
        // A closed <dialog> must retain its native display behavior.
        if (notice.tagName !== 'DIALOG') notice.hidden = false;
        next = Math.min(next, expires - now);
      }
    }
    if (Number.isFinite(next)) timer = setTimeout(refresh, Math.min(next, 2147483647));
  }
  document.querySelectorAll('[data-open-clinic-notice]').forEach(link => {
    link.addEventListener('click', event => {
      refresh();
      const dialog = document.getElementById('clinic-leave-dialog');
      if (!dialog || !dialog.isConnected) { event.preventDefault(); return; }
      if (typeof dialog.showModal === 'function') { event.preventDefault(); dialog.showModal(); }
    });
  });
  document.addEventListener('visibilitychange', refresh);
  window.addEventListener('pageshow', refresh);
  window.addEventListener('focus', refresh);
  refresh();
})();
