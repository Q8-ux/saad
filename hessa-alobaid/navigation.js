(() => {
  'use strict';

  function initNavigation() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const openButton = document.getElementById('openSidebar');
    const closeButton = document.getElementById('closeSidebar');

    if (!sidebar || !overlay || !openButton) return;

    const setState = (isOpen) => {
      sidebar.classList.toggle('open', isOpen);
      sidebar.classList.toggle('is-open', isOpen);
      overlay.hidden = !isOpen;
      document.body.classList.toggle('menu-open', isOpen);
      openButton.setAttribute('aria-expanded', String(isOpen));
      sidebar.setAttribute('aria-hidden', String(!isOpen));

      if (isOpen) {
        window.setTimeout(() => {
          const firstItem = sidebar.querySelector('.nav-item');
          firstItem?.focus({ preventScroll: true });
        }, 80);
      } else {
        openButton.focus({ preventScroll: true });
      }
    };

    const openMenu = (event) => {
      event?.preventDefault();
      event?.stopPropagation();
      setState(true);
    };

    const closeMenu = (event) => {
      event?.preventDefault();
      setState(false);
    };

    openButton.setAttribute('aria-controls', 'sidebar');
    openButton.setAttribute('aria-expanded', 'false');
    sidebar.setAttribute('aria-hidden', String(window.innerWidth <= 900));

    openButton.addEventListener('click', openMenu, { capture: true });
    openButton.addEventListener('pointerup', (event) => {
      if (event.pointerType === 'touch') openMenu(event);
    }, { capture: true });

    closeButton?.addEventListener('click', closeMenu, { capture: true });
    overlay.addEventListener('click', closeMenu, { capture: true });

    sidebar.addEventListener('click', (event) => {
      const navigationItem = event.target.closest('.nav-item');
      if (navigationItem && window.innerWidth <= 900) {
        window.setTimeout(() => setState(false), 80);
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && sidebar.classList.contains('is-open')) {
        setState(false);
      }
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 900) {
        sidebar.classList.remove('open', 'is-open');
        overlay.hidden = true;
        document.body.classList.remove('menu-open');
        openButton.setAttribute('aria-expanded', 'false');
        sidebar.setAttribute('aria-hidden', 'false');
      } else if (!sidebar.classList.contains('is-open')) {
        sidebar.setAttribute('aria-hidden', 'true');
      }
    }, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavigation, { once: true });
  } else {
    initNavigation();
  }
})();
