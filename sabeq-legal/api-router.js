(() => {
  'use strict';

  const API_ORIGIN = 'https://sabeq-legal-public.centrino.chatgpt.site';
  const GITHUB_HOST = 'q8-ux.github.io';
  const LOCAL_DR_KHALIFA = '/saad/sabeq-legal/images/team/dr-khalifa.jpg';
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

  function isDrKhalifaImage(src) {
    return typeof src === 'string' && (
      src.endsWith('/images/team/dr-khalifa.jpg') ||
      src.includes('sabeq-legal-public.centrino.chatgpt.site/images/team/dr-khalifa.jpg')
    );
  }

  function pinDrKhalifaImage(root = document) {
    if (window.location.hostname !== GITHUB_HOST) return;

    const images = [];
    if (root instanceof HTMLImageElement) images.push(root);
    if (root && typeof root.querySelectorAll === 'function') {
      images.push(...root.querySelectorAll('img'));
    }

    for (const img of images) {
      const src = img.getAttribute('src') || img.src || '';
      if (isDrKhalifaImage(src) && !img.src.endsWith(LOCAL_DR_KHALIFA)) {
        img.src = LOCAL_DR_KHALIFA;
      }
    }
  }

  if (window.location.hostname === GITHUB_HOST) {
    const startImagePinning = () => {
      pinDrKhalifaImage();

      const observer = new MutationObserver((records) => {
        for (const record of records) {
          for (const node of record.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) pinDrKhalifaImage(node);
          }
        }
      });

      observer.observe(document.documentElement, { childList: true, subtree: true });

      document.addEventListener('error', (event) => {
        const target = event.target;
        if (target instanceof HTMLImageElement && isDrKhalifaImage(target.src)) {
          target.src = LOCAL_DR_KHALIFA;
        }
      }, true);
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', startImagePinning, { once: true });
    } else {
      startImagePinning();
    }
  }

  Object.defineProperty(window, '__SABEQ_API_ORIGIN__', {
    value: API_ORIGIN,
    configurable: false,
    enumerable: false,
    writable: false,
  });
})();
