(() => {
  'use strict';

  const API_ORIGIN = 'https://sabeq-legal-research-api.onrender.com';
  const LEGACY_API_ORIGIN = 'https://sabeq-legal-public.centrino.chatgpt.site';
  const TEAM_BASE = 'https://raw.githubusercontent.com/Q8-ux/saad/main/sabeq-legal/images/team';
  const TEAM_IMAGE_VERSION = '20260902-14';

  const TEAM_FILES = [
    'dr-khalifa.jpg',
    'khalid-alhabib.jpg',
    'mishal-metaab.jpg',
    'mohammed-saheb.jpg',
    'abdulaziz-mashaan.png',
    'hamad-almadi.jpg',
    'khalid-alhazeem.jpg'
  ];

  const TEAM_ALIASES = new Map([
    ['dr-khalifa.jpg', 'dr-khalifa.jpg'], ['dr_khalifa.jpg', 'dr-khalifa.jpg'], ['khalifa.jpg', 'dr-khalifa.jpg'],
    ['khalid-alhabib.jpg', 'khalid-alhabib.jpg'], ['khalid_alhabib.jpg', 'khalid-alhabib.jpg'],
    ['mishal-metaab.jpg', 'mishal-metaab.jpg'], ['metaab.jpg', 'mishal-metaab.jpg'],
    ['mohammed-saheb.jpg', 'mohammed-saheb.jpg'], ['md_saheb.jpg', 'mohammed-saheb.jpg'],
    ['abdulaziz-mashaan.png', 'abdulaziz-mashaan.png'], ['mageed.png', 'abdulaziz-mashaan.png'],
    ['hamad-almadi.jpg', 'hamad-almadi.jpg'], ['hamad_almadi.jpg', 'hamad-almadi.jpg'],
    ['khalid-alhazeem.jpg', 'khalid-alhazeem.jpg'], ['khalid_mishal.jpg', 'khalid-alhazeem.jpg'], ['khalid_mishal.jpeg', 'khalid-alhazeem.jpg']
  ]);

  const nativeFetch = window.fetch.bind(window);

  function routeApiUrl(value) {
    try {
      const url = new URL(value, window.location.href);
      const isApiPath = url.pathname.startsWith('/api/');
      const isCurrentOrigin = url.origin === window.location.origin;
      const isLegacyApi = url.origin === LEGACY_API_ORIGIN;
      if (isApiPath && (isCurrentOrigin || isLegacyApi)) return `${API_ORIGIN}${url.pathname}${url.search}${url.hash}`;
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

  function canonicalFromImage(img, index) {
    const candidates = [img.getAttribute('src'), img.getAttribute('data-src'), img.getAttribute('data-lazy-src'), img.currentSrc, img.src];
    for (const candidate of candidates) {
      const canonical = TEAM_ALIASES.get(imageBasename(candidate || ''));
      if (canonical) return canonical;
    }
    return TEAM_FILES[index] || null;
  }

  function fitTeamPhoto(img) {
    const photo = img.closest('.team-photo');
    if (!photo) return;
    photo.classList.add('team-photo-fitted');
    photo.style.removeProperty('background-image');
    img.style.display = 'block';
    img.style.visibility = 'visible';
    img.style.opacity = '1';
  }

  function pinTeamImages(root = document) {
    if (!root || typeof root.querySelectorAll !== 'function') return;
    const imgs = Array.from(root.querySelectorAll('.team-grid .team-card img, .team-grid .team-photo img'));
    imgs.forEach((img, index) => {
      const canonical = canonicalFromImage(img, index);
      if (!canonical) return;
      const target = `${TEAM_BASE}/${canonical}?v=${TEAM_IMAGE_VERSION}`;
      img.removeAttribute('srcset');
      img.removeAttribute('sizes');
      img.removeAttribute('data-srcset');
      img.removeAttribute('data-src');
      img.removeAttribute('data-lazy-src');
      img.loading = 'eager';
      img.decoding = 'async';
      if (img.getAttribute('src') !== target) img.setAttribute('src', target);
      fitTeamPhoto(img);
    });
  }

  function startImagePinning() {
    pinTeamImages();
    const observer = new MutationObserver(() => pinTeamImages());
    observer.observe(document.documentElement, { childList: true, subtree: true });
    document.addEventListener('error', event => {
      const img = event.target;
      if (!(img instanceof HTMLImageElement) || !img.closest('.team-grid')) return;
      const all = Array.from(document.querySelectorAll('.team-grid .team-card img, .team-grid .team-photo img'));
      const index = Math.max(0, all.indexOf(img));
      const canonical = canonicalFromImage(img, index);
      if (!canonical || img.dataset.sabeqImageRetry === '1') return;
      img.dataset.sabeqImageRetry = '1';
      img.src = `${TEAM_BASE}/${canonical}?v=${TEAM_IMAGE_VERSION}&retry=1`;
      fitTeamPhoto(img);
    }, true);
    [100, 350, 900, 1800, 3500, 7000].forEach(delay => setTimeout(pinTeamImages, delay));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startImagePinning, { once: true });
  else startImagePinning();

  Object.defineProperty(window, '__SABEQ_API_ORIGIN__', { value: API_ORIGIN, configurable: false, enumerable: false, writable: false });
})();
