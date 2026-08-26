(() => {
  'use strict';

  const API_ORIGIN = 'https://sabeq-legal-public.centrino.chatgpt.site';
  const nativeFetch = window.fetch.bind(window);

  function routeApiUrl(value) {
    try {
      const url = new URL(value, window.location.href);
      if (url.origin === window.location.origin && url.pathname.startsWith('/api/')) {
        return `${API_ORIGIN}${url.pathname}${url.search}${url.hash}`;
      }
    } catch (_) {
      // Leave non-URL fetch inputs untouched.
    }
    return null;
  }

  window.fetch = function sabeqFetch(input, init) {
    if (typeof input === 'string' || input instanceof URL) {
      const routed = routeApiUrl(String(input));
      return nativeFetch(routed || input, init);
    }

    if (input instanceof Request) {
      const routed = routeApiUrl(input.url);
      if (routed) {
        return nativeFetch(new Request(routed, input), init);
      }
    }

    return nativeFetch(input, init);
  };

  Object.defineProperty(window, '__SABEQ_API_ORIGIN__', {
    value: API_ORIGIN,
    configurable: false,
    enumerable: false,
    writable: false,
  });
})();
