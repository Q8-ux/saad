(() => {
  'use strict';

  // Temporary public test mode. Remove this file from index.html when authentication is re-enabled.
  const TEST_TOKEN = 'sabeq-temporary-guest-mode';
  const TEST_USER = {
    id: 'guest-test',
    name: 'مستخدم تجريبي',
    email: 'test-guest@sabeq.legal',
    role: 'guest'
  };

  try {
    window.localStorage.setItem('sabeq-session-token', TEST_TOKEN);
  } catch (_) {}

  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (input, init = {}) => {
    const rawUrl = typeof input === 'string' ? input : input?.url || '';
    let pathname = '';
    try {
      pathname = new URL(rawUrl, window.location.href).pathname;
    } catch (_) {
      pathname = rawUrl;
    }

    // Make the React application see a valid temporary guest session.
    if (pathname.endsWith('/api/auth/session')) {
      return new Response(JSON.stringify({ user: TEST_USER, testMode: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Do not send the synthetic guest token to the real API.
    const headers = new Headers(init.headers || (typeof input !== 'string' ? input?.headers : undefined));
    const auth = headers.get('Authorization');
    if (auth === `Bearer ${TEST_TOKEN}`) headers.delete('Authorization');

    const nextInit = { ...init, headers };
    return nativeFetch(input, nextInit);
  };

  // Keep the temporary guest account UI out of the mobile menu.
  const style = document.createElement('style');
  style.textContent = '.drawer-account{display:none!important}.auth-gate{display:none!important}';
  document.head.appendChild(style);
})();
