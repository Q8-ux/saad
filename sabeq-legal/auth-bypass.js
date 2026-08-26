(() => {
  'use strict';

  const GUEST_KEY = 'sabeq-guest-mode';
  const TEST_USER = {
    id: 'guest-test',
    name: 'مستخدم ضيف',
    email: 'guest@sabeq.legal',
    role: 'guest'
  };

  const nativeFetch = window.fetch.bind(window);

  function isGuestEnabled() {
    try { return window.sessionStorage.getItem(GUEST_KEY) === '1'; } catch (_) { return false; }
  }

  function enableGuest() {
    try {
      window.sessionStorage.setItem(GUEST_KEY, '1');
      window.localStorage.removeItem('sabeq-session-token');
    } catch (_) {}
    window.location.reload();
  }

  function disableGuest() {
    try { window.sessionStorage.removeItem(GUEST_KEY); } catch (_) {}
  }

  window.fetch = async (input, init = {}) => {
    const rawUrl = typeof input === 'string' ? input : input?.url || '';
    let pathname = '';
    try { pathname = new URL(rawUrl, window.location.href).pathname; }
    catch (_) { pathname = rawUrl; }

    if (isGuestEnabled() && pathname.endsWith('/api/auth/session')) {
      return new Response(JSON.stringify({ user: TEST_USER, testMode: true, guest: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return nativeFetch(input, init);
  };

  function injectGuestButton(root = document) {
    const candidates = root.querySelectorAll?.('form, [role="dialog"], .auth-gate, .auth-modal, .login-modal, .login-form') || [];
    for (const box of candidates) {
      if (box.querySelector?.('[data-sabeq-guest]')) continue;
      const text = (box.textContent || '').replace(/\s+/g, ' ');
      if (!/(تسجيل الدخول|دخول|Login|Sign in)/i.test(text)) continue;

      const wrap = document.createElement('div');
      wrap.setAttribute('data-sabeq-guest', '1');
      wrap.className = 'sabeq-guest-entry';
      wrap.innerHTML = '<div class="sabeq-guest-separator"><span>أو</span></div><button type="button" class="sabeq-guest-btn">الدخول كضيف</button><p class="sabeq-guest-note">دخول مؤقت أثناء مرحلة الاختبار</p>';
      wrap.querySelector('button').addEventListener('click', enableGuest);
      box.appendChild(wrap);
    }
  }

  const style = document.createElement('style');
  style.textContent = `
    .sabeq-guest-entry{margin-top:16px;text-align:center;width:100%}
    .sabeq-guest-separator{display:flex;align-items:center;gap:10px;color:#8a96a3;font-size:13px;margin:12px 0}
    .sabeq-guest-separator:before,.sabeq-guest-separator:after{content:'';height:1px;background:rgba(148,163,184,.35);flex:1}
    .sabeq-guest-btn{width:100%;min-height:46px;border:1px solid rgba(94,169,181,.55);border-radius:10px;background:rgba(20,74,86,.08);color:inherit;font-weight:700;font-size:16px;cursor:pointer}
    .sabeq-guest-btn:hover{background:rgba(20,74,86,.14)}
    .sabeq-guest-note{margin:7px 0 0;font-size:12px;color:#84909c}
  `;
  document.head.appendChild(style);

  if (!isGuestEnabled()) {
    const start = () => {
      injectGuestButton();
      const observer = new MutationObserver(records => {
        for (const record of records) {
          for (const node of record.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) injectGuestButton(node);
          }
        }
        injectGuestButton();
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
  }

  window.__SABEQ_GUEST__ = { enable: enableGuest, disable: disableGuest, active: isGuestEnabled };
})();
