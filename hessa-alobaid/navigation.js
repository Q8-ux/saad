(() => {
  'use strict';

  function initNavigation() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const openButton = document.getElementById('openSidebar');
    const closeButton = document.getElementById('closeSidebar');
    const homeButton = document.getElementById('homeButton');

    if (!sidebar || !overlay || !openButton) return;

    const isMobile = () => window.matchMedia('(max-width: 900px)').matches;

    const setMenu = (open, restoreFocus = false) => {
      sidebar.classList.toggle('open', open);
      sidebar.classList.toggle('is-open', open);
      overlay.hidden = !open;
      document.body.classList.toggle('menu-open', open);
      openButton.setAttribute('aria-expanded', String(open));
      sidebar.setAttribute('aria-hidden', String(isMobile() && !open));
      document.body.style.overflow = open && isMobile() ? 'hidden' : '';
      if (restoreFocus && !open) openButton.focus({ preventScroll: true });
    };

    const goDashboard = () => {
      if (window.HessaInternal && typeof window.HessaInternal.home === 'function') {
        window.HessaInternal.home();
      } else if (typeof switchView === 'function') {
        switchView('dashboard');
      } else {
        window.location.reload();
      }
      setMenu(false);
    };

    openButton.setAttribute('aria-controls', 'sidebar');
    openButton.setAttribute('aria-expanded', 'false');
    sidebar.setAttribute('aria-hidden', String(isMobile()));

    document.addEventListener('click', (event) => {
      const openTrigger = event.target.closest('#openSidebar');
      if (openTrigger) {
        event.preventDefault();
        event.stopImmediatePropagation();
        setMenu(true);
        return;
      }

      const closeTrigger = event.target.closest('#closeSidebar');
      if (closeTrigger || event.target === overlay) {
        event.preventDefault();
        event.stopImmediatePropagation();
        setMenu(false, true);
        return;
      }

      const homeTrigger = event.target.closest('#homeButton');
      if (homeTrigger) {
        event.preventDefault();
        event.stopImmediatePropagation();
        goDashboard();
        return;
      }

      const sabeqItem = event.target.closest('#sidebarNav [data-sabeq-view]');
      if (sabeqItem) {
        event.preventDefault();
        event.stopImmediatePropagation();
        const view = sabeqItem.dataset.sabeqView;
        setMenu(false);
        if (window.HessaInternal && typeof window.HessaInternal.open === 'function') {
          window.HessaInternal.open(view);
        } else if (typeof switchView === 'function') {
          switchView(view);
        }
        return;
      }

      const officeTool = event.target.closest('#sidebarNav [data-office-view]');
      if (officeTool) {
        event.preventDefault();
        event.stopImmediatePropagation();
        const view = officeTool.dataset.officeView;
        setMenu(false);
        if (window.HessaOfficeTools && typeof window.HessaOfficeTools.open === 'function') {
          window.HessaOfficeTools.open(view);
        }
        return;
      }

      const menuItem = event.target.closest('#sidebarNav .nav-item[data-view]');
      if (menuItem) {
        event.preventDefault();
        event.stopImmediatePropagation();
        const view = menuItem.dataset.view;
        setMenu(false);
        if (typeof switchView === 'function') switchView(view);
      }
    }, true);

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && sidebar.classList.contains('is-open')) setMenu(false, true);
    });

    window.addEventListener('resize', () => {
      if (!isMobile()) {
        setMenu(false);
        sidebar.setAttribute('aria-hidden', 'false');
      } else if (!sidebar.classList.contains('is-open')) {
        sidebar.setAttribute('aria-hidden', 'true');
      }
    }, { passive: true });

    closeButton?.setAttribute('type', 'button');
    homeButton?.setAttribute('type', 'button');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavigation, { once: true });
  } else {
    initNavigation();
  }
})();
