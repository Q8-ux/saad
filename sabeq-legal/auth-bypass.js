(() => {
  'use strict';

  const GUEST_TOKEN = 'sabeq-temporary-guest-session';
  const GUEST_USER = {
    id: 'guest-test',
    name: 'مستخدم ضيف',
    email: 'guest@sabeq.legal',
    role: 'guest'
  };

  const isGuest = () => {
    try { return window.sessionStorage.getItem('sabeq-guest-mode') === '1'; }
    catch (_) { return false; }
  };

  // Important: never delete a real login token. Only seed a token after the user explicitly chooses Guest.
  if (isGuest()) {
    try { window.localStorage.setItem('sabeq-session-token', GUEST_TOKEN); } catch (_) {}
  }

  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const rawUrl = typeof input === 'string' ? input : input?.url || '';
    let pathname = '';
    try { pathname = new URL(rawUrl, window.location.href).pathname; }
    catch (_) { pathname = rawUrl; }

    // Resolve only the explicit temporary guest session locally.
    if (isGuest() && pathname.endsWith('/api/auth/session')) {
      return new Response(JSON.stringify({
        user: GUEST_USER,
        token: GUEST_TOKEN,
        guest: true,
        testMode: true
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Never send the synthetic guest token to the real backend.
    if (isGuest()) {
      const headers = new Headers(init.headers || (typeof input !== 'string' ? input?.headers : undefined));
      if (headers.get('Authorization') === `Bearer ${GUEST_TOKEN}`) headers.delete('Authorization');
      return nativeFetch(input, { ...init, headers });
    }

    // Normal login path is untouched and continues to use the application's real authentication flow.
    return nativeFetch(input, init);
  };

  function addGuestChoice() {
    if (isGuest() || document.getElementById('sabeq-guest-entry')) return;

    const candidates = [...document.querySelectorAll('form,[role="dialog"],section,div')];
    const host = candidates.find(el => {
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
      return /تسجيل الدخول|البريد الإلكتروني|رمز التحقق|Login|Sign in/i.test(text) && el.querySelector('button');
    });
    if (!host) return;

    const box = document.createElement('div');
    box.id = 'sabeq-guest-entry';
    box.setAttribute('data-test-mode', 'guest-entry');
    box.style.cssText = 'margin-top:16px;padding-top:16px;border-top:1px solid rgba(148,163,184,.35);text-align:center';

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'الدخول كضيف';
    button.setAttribute('aria-label', 'الدخول كضيف مؤقتاً');
    button.style.cssText = 'width:100%;min-height:48px;border-radius:12px;border:1px solid #2f7ea8;background:transparent;color:inherit;font:inherit;font-size:16px;font-weight:800;cursor:pointer';
    button.addEventListener('click', () => {
      try {
        window.sessionStorage.setItem('sabeq-guest-mode', '1');
        window.localStorage.setItem('sabeq-session-token', GUEST_TOKEN);
      } catch (_) {}
      // Reload so the compiled React app initializes with a valid guest session from its first render.
      window.location.reload();
    });

    const note = document.createElement('div');
    note.textContent = 'دخول مؤقت أثناء مرحلة الاختبار';
    note.style.cssText = 'margin-top:8px;font-size:13px;opacity:.72';

    box.append(button, note);
    host.appendChild(box);
  }

  function start() {
    addGuestChoice();
    new MutationObserver(addGuestChoice).observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
