(() => {
  'use strict';

  const TEST_TOKEN = 'sabeq-temporary-guest-mode';
  const TEST_USER = {
    id: 'guest-test',
    name: 'مستخدم ضيف',
    email: 'guest@sabeq.legal',
    role: 'guest'
  };

  // Critical: the compiled React app only checks /api/auth/session when a token exists.
  // Seed a temporary token before React starts so the app resolves a guest user instead of opening the login gate.
  try {
    window.sessionStorage.setItem('sabeq-guest-mode', '1');
    window.localStorage.setItem('sabeq-session-token', TEST_TOKEN);
  } catch (_) {}

  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (input, init = {}) => {
    const rawUrl = typeof input === 'string' ? input : input?.url || '';
    let pathname = '';
    try { pathname = new URL(rawUrl, window.location.href).pathname; }
    catch (_) { pathname = rawUrl; }

    if (pathname.endsWith('/api/auth/session')) {
      return new Response(JSON.stringify({ user: TEST_USER, token: TEST_TOKEN, testMode: true, guest: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Keep the synthetic token out of the real backend until guest APIs are formally implemented there.
    const headers = new Headers(init.headers || (typeof input !== 'string' ? input?.headers : undefined));
    if (headers.get('Authorization') === `Bearer ${TEST_TOKEN}`) {
      headers.delete('Authorization');
    }
    return nativeFetch(input, { ...init, headers });
  };

  // Safety net: never display the authentication modal while temporary no-login mode is active.
  const style = document.createElement('style');
  style.textContent = '.auth-gate{display:none!important}.drawer-account{display:none!important}';
  document.head.appendChild(style);
})();
