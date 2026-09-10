'use strict';
(() => {
  const menu = document.querySelector('.menu-button');
  const nav = document.querySelector('#main-nav');
  if (!menu || !nav) return;
  document.documentElement.classList.add('has-menu-js');
  menu.hidden = false;
  const narrow = window.matchMedia('(max-width: 820px)');
  const closeMenu = (restoreFocus = false) => {
    menu.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-label', 'فتح القائمة');
    nav.classList.remove('is-open');
    if (restoreFocus) menu.focus();
  };
  menu.addEventListener('click', () => {
    const opening = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(opening));
    menu.setAttribute('aria-label', opening ? 'إغلاق القائمة' : 'فتح القائمة');
    nav.classList.toggle('is-open', opening);
  });
  document.addEventListener('click', event => {
    if (!nav.contains(event.target) && !menu.contains(event.target)) closeMenu();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') closeMenu(true);
  });
  document.addEventListener('focusin', event => {
    if (!nav.contains(event.target) && !menu.contains(event.target)) closeMenu();
  });
  nav.addEventListener('click', event => {
    const anchor = event.target.closest('a');
    if (anchor) {
      closeMenu();
      if (narrow.matches) {
        const section = document.querySelector(anchor.getAttribute('href'));
        if (section) {
          section.setAttribute('tabindex', '-1');
          section.focus({ preventScroll: true });
          section.addEventListener('blur', () => section.removeAttribute('tabindex'), { once: true });
        }
      }
    }
  });
  if (typeof narrow.addEventListener === 'function') narrow.addEventListener('change', () => closeMenu());
  else if (typeof narrow.addListener === 'function') narrow.addListener(() => closeMenu());
  const links = Array.from(nav.querySelectorAll('a[href^="#"]'));
  const setActive = id => {
    links.forEach(link => {
      const active = link.getAttribute('href') === '#' + id;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  };
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      if (visible.length) setActive(visible[0].target.id);
    }, { rootMargin: '-15% 0px -55% 0px', threshold: 0 });
    links.forEach(link => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) observer.observe(target);
    });
  }
  window.addEventListener('hashchange', () => setActive(location.hash.slice(1) || 'home'));
})();
