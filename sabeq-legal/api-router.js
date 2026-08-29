(() => {
  'use strict';

  const API_ORIGIN = 'https://sabeq-legal-public.centrino.chatgpt.site';
  const GITHUB_HOST = 'q8-ux.github.io';
  const TEAM_IMAGE_VERSION = '20260829-12';
  const OFFICIAL_TEAM_IMAGES = new Map([
    ['dr-khalifa.jpg', `https://www.sabeq.legal/images/team/DR_khalifa.jpg?v=${TEAM_IMAGE_VERSION}`],
    ['khalid-alhabib.jpg', `https://www.sabeq.legal/images/team/khalid_alhabib.jpg?v=${TEAM_IMAGE_VERSION}`],
    ['mishal-metaab.jpg', `https://www.sabeq.legal/images/team/Metaab.jpg?v=${TEAM_IMAGE_VERSION}`],
    ['mohammed-saheb.jpg', `https://www.sabeq.legal/images/team/Md_saheb.jpg?v=${TEAM_IMAGE_VERSION}`],
    ['abdulaziz-mashaan.png', `https://www.sabeq.legal/images/team/Mageed.png?v=${TEAM_IMAGE_VERSION}`],
    ['hamad-almadi.jpg', `https://www.sabeq.legal/images/team/Hamad_almadi.jpg?v=${TEAM_IMAGE_VERSION}`],
    ['khalid-alhazeem.jpg', `https://www.sabeq.legal/images/team/khalid_mishal.jpg?v=${TEAM_IMAGE_VERSION}`],
  ]);
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

  function officialTeamImage(src) {
    if (typeof src !== 'string') return null;

    for (const [filename, officialSrc] of OFFICIAL_TEAM_IMAGES) {
      if (src.includes(`/images/team/${filename}`)) return officialSrc;
    }

    return null;
  }

  function fitTeamPhoto(img) {
    const photo = img.closest('.team-photo');
    if (!photo) return;

    photo.classList.add('team-photo-fitted');
    photo.style.removeProperty('background-image');
  }

  function pinTeamImages(root = document) {
    if (window.location.hostname !== GITHUB_HOST) return;

    const images = [];
    if (root instanceof HTMLImageElement) images.push(root);
    if (root && typeof root.querySelectorAll === 'function') {
      images.push(...root.querySelectorAll('img'));
    }

    for (const img of images) {
      const src = img.getAttribute('src') || img.src || '';
      const officialSrc = officialTeamImage(src);
      if (officialSrc && img.getAttribute('src') !== officialSrc) {
        img.src = officialSrc;
      }
      if (officialSrc) fitTeamPhoto(img);
    }
  }

  if (window.location.hostname === GITHUB_HOST) {
    const startImagePinning = () => {
      pinTeamImages();

      const observer = new MutationObserver((records) => {
        for (const record of records) {
          for (const node of record.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) pinTeamImages(node);
          }
        }
      });

      observer.observe(document.documentElement, { childList: true, subtree: true });

      document.addEventListener('error', (event) => {
        const target = event.target;
        if (target instanceof HTMLImageElement) {
          const localSrc = localTeamImage(target.src);
          if (localSrc && target.getAttribute('src') !== localSrc) target.src = localSrc;
          if (localSrc) fitTeamPhoto(target, localSrc);
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
