(() => {
  'use strict';

  const API_ORIGIN = 'https://sabeq-legal-research-api.onrender.com';
  const LEGACY_API_ORIGIN = 'https://sabeq-legal-public.centrino.chatgpt.site';
  const GITHUB_HOST = 'q8-ux.github.io';
  const TEAM_BASE = 'https://q8-ux.github.io/saad/sabeq-legal/images/team';
  const TEAM_IMAGE_VERSION = '20260902-13';

  const TEAM_ALIASES = new Map([
    ['dr-khalifa.jpg', 'dr-khalifa.jpg'],
    ['dr_khalifa.jpg', 'dr-khalifa.jpg'],
    ['khalifa.jpg', 'dr-khalifa.jpg'],
    ['khalid-alhabib.jpg', 'khalid-alhabib.jpg'],
    ['khalid_alhabib.jpg', 'khalid-alhabib.jpg'],
    ['mishal-metaab.jpg', 'mishal-metaab.jpg'],
    ['metaab.jpg', 'mishal-metaab.jpg'],
    ['mohammed-saheb.jpg', 'mohammed-saheb.jpg'],
    ['md_saheb.jpg', 'mohammed-saheb.jpg'],
    ['abdulaziz-mashaan.png', 'abdulaziz-mashaan.png'],
    ['mageed.png', 'abdulaziz-mashaan.png'],
    ['hamad-almadi.jpg', 'hamad-almadi.jpg'],
    ['hamad_almadi.jpg', 'hamad-almadi.jpg'],
    ['khalid-alhazeem.jpg', 'khalid-alhazeem.jpg'],
    ['khalid_mishal.jpg', 'khalid-alhazeem.jpg'],
    ['khalid_mishal.jpeg', 'khalid-alhazeem.jpg'],
  ]);

  const nativeFetch = window.fetch.bind(window);

  function routeApiUrl(value) {
    try {
      const url = new URL(value, window.location.href);
      const isApiPath = url.pathname.startsWith('/api/');
      const isCurrentOrigin = url.origin === window.location.origin;
      const isLegacyApi = url.origin === LEGACY_API_ORIGIN;
      if (isApiPath && (isCurrentOrigin || isLegacyApi)) {
        return `${API_ORIGIN}${url.pathname}${url.search}${url.hash}`;
      }
    } catch (_) {}
    return null;
  }

  window.fetch = function sabeqFetch(input, init) {
    if (typeof input === 'string' || input instanceof URL) {
      const routed = routeApiUrl(String(input));
      return nativeFetch(routed || input, init);
    }

    if (input instanceof Request) {
      const routed = routeApiUrl(input.url);
      if (routed) return nativeFetch(new Request(routed, input), init);
    }

    return nativeFetch(input, init);
  };

  function imageBasename(value) {
    if (!value || typeof value !== 'string') return '';
    try {
      const url = new URL(value, window.location.href);
      return decodeURIComponent(url.pathname.split('/').filter(Boolean).pop() || '').toLowerCase();
    } catch (_) {
      return value.split('?')[0].split('#')[0].split('/').pop()?.toLowerCase() || '';
    }
  }

  function localTeamImage(src) {
    const canonical = TEAM_ALIASES.get(imageBasename(src));
    if (!canonical) return null;
    return `${TEAM_BASE}/${canonical}?v=${TEAM_IMAGE_VERSION}`;
  }

  function fitTeamPhoto(img) {
    const photo = img.closest('.team-photo');
    if (!photo) return;
    photo.classList.add('team-photo-fitted');
    photo.style.removeProperty('background-image');
    photo.style.removeProperty('display');
    photo.style.removeProperty('visibility');
    photo.style.removeProperty('opacity');
  }

  function pinTeamImage(img) {
    if (!(img instanceof HTMLImageElement)) return;
    const src = img.getAttribute('src') || img.currentSrc || img.src || '';
    const localSrc = localTeamImage(src);
    if (!localSrc) return;

    img.removeAttribute('srcset');
    img.removeAttribute('sizes');
    img.removeAttribute('data-srcset');
    img.loading = 'eager';
    img.decoding = 'async';

    if (img.getAttribute('src') !== localSrc) img.setAttribute('src', localSrc);
    fitTeamPhoto(img);
  }

  function pinTeamImages(root = document) {
    if (window.location.hostname !== GITHUB_HOST) return;

    if (root instanceof HTMLImageElement) pinTeamImage(root);
    if (root && typeof root.querySelectorAll === 'function') {
      root.querySelectorAll('.team-grid img, .team-card img, .team-photo img, img[src*="/images/team/"]').forEach(pinTeamImage);
    }
  }

  if (window.location.hostname === GITHUB_HOST) {
    const startImagePinning = () => {
      pinTeamImages();

      const observer = new MutationObserver((records) => {
        for (const record of records) {
          if (record.type === 'attributes' && record.target instanceof HTMLImageElement) {
            pinTeamImage(record.target);
            continue;
          }
          for (const node of record.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) pinTeamImages(node);
          }
        }
      });

      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['src', 'srcset', 'data-src', 'data-lazy-src'],
      });

      document.addEventListener('error', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLImageElement)) return;
        const localSrc = localTeamImage(target.getAttribute('src') || target.src || '');
        if (!localSrc) return;
        if (target.dataset.sabeqImageRetry === '1') return;
        target.dataset.sabeqImageRetry = '1';
        target.removeAttribute('srcset');
        target.removeAttribute('sizes');
        target.setAttribute('src', `${localSrc}&retry=1`);
        fitTeamPhoto(target);
      }, true);

      [250, 800, 1600, 3200].forEach(delay => setTimeout(() => pinTeamImages(), delay));
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
