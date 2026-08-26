(() => {
  'use strict';

  // Login remains the default. Guest is an explicit temporary choice only.
  try {
    if (window.sessionStorage.getItem('sabeq-guest-mode') !== '1') {
      window.localStorage.removeItem('sabeq-session-token');
    }
  } catch (_) {}

  function addGuestChoice() {
    if (document.getElementById('sabeq-guest-entry')) return;
    const nodes = [...document.querySelectorAll('form,[role="dialog"],section,div')];
    const host = nodes.find(el => {
      const text = (el.textContent || '').replace(/\s+/g, ' ');
      return /تسجيل الدخول|البريد الإلكتروني|رمز التحقق|Login|Sign in/i.test(text) && el.querySelector('button');
    });
    if (!host) return;

    const box = document.createElement('div');
    box.id = 'sabeq-guest-entry';
    box.style.cssText = 'margin-top:14px;padding-top:14px;border-top:1px solid rgba(148,163,184,.3);text-align:center';

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'الدخول كضيف';
    button.style.cssText = 'width:100%;min-height:46px;border-radius:12px;border:1px solid #2f7ea8;background:transparent;color:inherit;font:inherit;font-weight:700;cursor:pointer';
    button.onclick = () => {
      try { window.sessionStorage.setItem('sabeq-guest-mode','1'); } catch (_) {}
      document.querySelectorAll('.auth-gate,[role="dialog"]').forEach(el => el.style.display = 'none');
    };

    const note = document.createElement('div');
    note.textContent = 'دخول مؤقت أثناء مرحلة الاختبار';
    note.style.cssText = 'margin-top:7px;font-size:12px;opacity:.7';

    box.append(button,note);
    host.appendChild(box);
  }

  const start = () => {
    addGuestChoice();
    new MutationObserver(addGuestChoice).observe(document.documentElement,{childList:true,subtree:true});
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();
