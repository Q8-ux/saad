(() => {
  'use strict';

  // Temporary no-login test mode. Remove this bridge when real authentication is restored.
  const TEST_USER = {
    id: 'guest-test',
    name: 'مستخدم ضيف',
    email: 'guest@sabeq.legal',
    role: 'guest'
  };

  try {
    window.sessionStorage.setItem('sabeq-guest-mode', '1');
    window.localStorage.removeItem('sabeq-session-token');
  } catch (_) {}

  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (input, init = {}) => {
    const rawUrl = typeof input === 'string' ? input : input?.url || '';
    let pathname = '';
    try { pathname = new URL(rawUrl, window.location.href).pathname; }
    catch (_) { pathname = rawUrl; }

    // The application always sees a temporary guest session; no login gate is required.
    if (pathname.endsWith('/api/auth/session')) {
      return new Response(JSON.stringify({ user: TEST_USER, testMode: true, guest: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return nativeFetch(input, init);
  };

  // Remove any authentication UI that the compiled application may render.
  const style = document.createElement('style');
  style.textContent = `
    .auth-gate,.auth-modal,.login-modal,.login-form,.drawer-account,
    [data-auth-gate],[data-login-modal],[data-login-form]{display:none!important}
  `;
  document.head.appendChild(style);

  function removeLoginUi(root = document) {
    const nodes = root.querySelectorAll?.('form,[role="dialog"],button,a') || [];
    for (const node of nodes) {
      const text = (node.textContent || '').replace(/\s+/g, ' ').trim();
      if (/^(تسجيل الدخول|دخول|Login|Sign in)$/i.test(text)) {
        const container = node.closest('[role="dialog"],.auth-gate,.auth-modal,.login-modal,.login-form');
        if (container) container.style.setProperty('display','none','important');
        else node.style.setProperty('display','none','important');
      }
    }
  }

  const start = () => {
    removeLoginUi();
    const observer = new MutationObserver(() => removeLoginUi());
    observer.observe(document.documentElement, { childList: true, subtree: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
