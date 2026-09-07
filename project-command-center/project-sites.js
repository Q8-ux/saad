(() => {
  'use strict';

  const projectSites = {
    legal: 'https://www.sabeq.legal/',
    command: 'https://ai-project-command-center-pg1n.onrender.com/',
    websites: null,
    social: null,
    restaurant: null,
    messaging: null,
    procurement: null,
    docs: null,
    education: null,
    vas: null
  };

  const isEn = () => document.documentElement.lang === 'en';

  function addSiteButtons() {
    document.querySelectorAll('.project-card[data-project]').forEach(card => {
      const id = card.dataset.project;
      const actions = card.querySelector('.project-actions');
      if (!actions || actions.querySelector('[data-site-button]')) return;

      const url = projectSites[id];
      if (url) {
        const link = document.createElement('a');
        link.dataset.siteButton = 'true';
        link.className = 'primary project-live-site';
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = isEn() ? 'Open website' : 'فتح الموقع';
        link.setAttribute('aria-label', isEn() ? 'Open project website' : 'فتح موقع المشروع');
        actions.prepend(link);
      } else {
        const button = document.createElement('button');
        button.dataset.siteButton = 'true';
        button.type = 'button';
        button.disabled = true;
        button.className = 'project-site-pending';
        button.textContent = isEn() ? 'Not published yet' : 'الموقع غير منشور بعد';
        button.title = isEn() ? 'A public website URL has not been verified for this project yet.' : 'لم يتم التحقق من رابط نشر عام لهذا المشروع حتى الآن.';
        actions.prepend(button);
      }
    });
  }

  const observer = new MutationObserver(addSiteButtons);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', addSiteButtons);
  window.addEventListener('load', addSiteButtons);
})();
