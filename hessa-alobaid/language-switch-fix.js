(() => {
  'use strict';

  function syncLanguageSwitch() {
    const button = document.getElementById('langToggle');
    if (!button) return;

    const isArabic = document.documentElement.lang !== 'en';
    button.classList.add('language-switch');
    button.dataset.currentLanguage = isArabic ? 'ar' : 'en';
    button.setAttribute('aria-label', isArabic ? 'تغيير اللغة — العربية مفعلة' : 'Change language — English active');
    button.setAttribute('title', isArabic ? 'تغيير اللغة' : 'Change language');
    button.innerHTML = `
      <span class="language-choice ${isArabic ? 'active' : ''}" lang="ar" dir="rtl">عربي</span>
      <span class="language-choice ${isArabic ? '' : 'active'}" lang="en" dir="ltr">EN</span>
    `;
  }

  function init() {
    syncLanguageSwitch();
    const button = document.getElementById('langToggle');
    button?.addEventListener('click', () => setTimeout(syncLanguageSwitch, 0));

    const observer = new MutationObserver(mutations => {
      if (mutations.some(item => item.attributeName === 'lang' || item.attributeName === 'dir')) {
        syncLanguageSwitch();
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang', 'dir'] });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
