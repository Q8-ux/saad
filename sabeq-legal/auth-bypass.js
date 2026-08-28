(() => {
  'use strict';

  const GUEST_TOKEN = 'sabeq-temporary-guest-session';
  const GUEST_USER = {
    id: 'guest-test',
    name: 'مستخدم ضيف',
    email: 'guest@sabeq.legal',
    role: 'guest'
  };

  try {
    window.sessionStorage.setItem('sabeq-guest-mode', '1');
    window.localStorage.setItem('sabeq-session-token', GUEST_TOKEN);
  } catch (_) {}

  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (input, init = {}) => {
    const rawUrl = typeof input === 'string' ? input : input?.url || '';
    let pathname = '';
    try { pathname = new URL(rawUrl, window.location.href).pathname; }
    catch (_) { pathname = rawUrl; }

    if (pathname.endsWith('/api/auth/session')) {
      return new Response(JSON.stringify({
        user: GUEST_USER,
        token: GUEST_TOKEN,
        authenticated: true,
        verified: true,
        guest: true,
        testMode: true
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const headers = new Headers(init.headers || (typeof input !== 'string' ? input?.headers : undefined));
    if (headers.get('Authorization') === `Bearer ${GUEST_TOKEN}`) headers.delete('Authorization');
    return nativeFetch(input, { ...init, headers });
  };

  const style = document.createElement('style');
  style.textContent = `
    .auth-gate,.auth-modal,.login-modal,.login-form,.drawer-account,
    [data-auth-gate],[data-login-modal],[data-login-form],
    [aria-modal="true"][data-auth], .secure-login-modal {
      display:none!important;
      visibility:hidden!important;
      pointer-events:none!important;
    }
  `;
  document.head.appendChild(style);

  const authText = /(تسجيل الدخول الآمن|يلزم التحقق من حسابك|إرسال رمز التحقق)/i;
  const authSelector = [
    '.auth-gate',
    '.auth-modal',
    '.login-modal',
    '.login-form',
    '[data-auth-gate]',
    '[data-login-modal]',
    '[data-login-form]',
    '[aria-modal="true"][data-auth]',
    '.secure-login-modal'
  ].join(',');

  function removeAuthUi(root = document) {
    const explicitAuthElements = [];
    if (root instanceof Element && root.matches(authSelector)) {
      explicitAuthElements.push(root);
    }
    if (root && typeof root.querySelectorAll === 'function') {
      explicitAuthElements.push(...root.querySelectorAll(authSelector));
    }

    for (const el of explicitAuthElements) {
      if (el !== document.body && el !== document.documentElement) el.remove();
    }

    // Only inspect actual dialog elements. The previous implementation scanned
    // every container for generic field labels such as "email" and could remove
    // the entire application shell when the contact form was rendered.
    const dialogs = root.querySelectorAll?.('[role="dialog"],[aria-modal="true"]') || [];
    for (const el of dialogs) {
      const text = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
      if (!text || !authText.test(text)) continue;
      if (el !== document.body && el !== document.documentElement) el.remove();
    }

    document.body?.style.removeProperty('overflow');
  }

  function startRemoval() {
    removeAuthUi();
    const observer = new MutationObserver(() => removeAuthUi());
    observer.observe(document.documentElement, { childList: true, subtree: true });

    // React may render the modal after state changes; repeat briefly after load/clicks.
    let ticks = 0;
    const timer = setInterval(() => {
      removeAuthUi();
      if (++ticks > 40) clearInterval(timer);
    }, 250);

    document.addEventListener('click', () => {
      setTimeout(removeAuthUi, 0);
      setTimeout(removeAuthUi, 100);
      setTimeout(removeAuthUi, 350);
    }, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startRemoval, { once: true });
  } else {
    startRemoval();
  }
})();
