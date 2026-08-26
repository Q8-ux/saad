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
      return new Response(JSON.stringify({ user: GUEST_USER, token: GUEST_TOKEN, guest: true, testMode: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const headers = new Headers(init.headers || (typeof input !== 'string' ? input?.headers : undefined));
    if (headers.get('Authorization') === `Bearer ${GUEST_TOKEN}`) headers.delete('Authorization');
    return nativeFetch(input, { ...init, headers });
  };

  const style = document.createElement('style');
  style.textContent = '.auth-gate,.auth-modal,.login-modal,.login-form,.drawer-account,[data-auth-gate],[data-login-modal],[data-login-form]{display:none!important}';
  document.head.appendChild(style);
})();
