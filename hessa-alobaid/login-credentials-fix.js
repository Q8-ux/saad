(() => {
  'use strict';

  const ADMIN_USER = 'Saad';
  const ADMIN_PASSWORD_SHA256 = 'ef797c8118f02dfb649607dd5d3f8c7623048c9c063d532cc95c5ed7a898a64f';
  const SESSION_KEY = 'hessaLawLmsSession';

  function isEnglish() {
    return document.documentElement.lang === 'en' || document.documentElement.dir === 'ltr';
  }

  async function sha256(value) {
    const data = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('');
  }

  function syncLoginUi() {
    const user = document.getElementById('loginUser');
    const pass = document.getElementById('loginPassword');
    const hint = document.querySelector('[data-i18n="demoCredentials"]');

    if (user && !user.matches(':focus')) user.value = ADMIN_USER;
    if (pass && !pass.matches(':focus')) pass.value = '';
    if (hint) hint.textContent = isEnglish() ? `Admin username: ${ADMIN_USER}` : `اسم مستخدم المدير: ${ADMIN_USER}`;
  }

  function showLoginError(message) {
    if (typeof toast === 'function') {
      toast(message);
      return;
    }
    const form = document.getElementById('loginForm');
    if (!form) return;
    let error = document.getElementById('loginCredentialsError');
    if (!error) {
      error = document.createElement('div');
      error.id = 'loginCredentialsError';
      error.setAttribute('role', 'alert');
      error.style.cssText = 'margin-top:10px;color:#b42318;font-weight:700;text-align:center';
      form.appendChild(error);
    }
    error.textContent = message;
  }

  function completeLogin(username) {
    localStorage.setItem(SESSION_KEY, '1');
    const sidebarUsername = document.getElementById('sidebarUsername');
    if (sidebarUsername) sidebarUsername.textContent = username;
    document.getElementById('loginScreen')?.classList.add('hidden');
    document.getElementById('appShell')?.classList.remove('hidden');
    try {
      if (typeof updateHeader === 'function' && typeof state !== 'undefined') updateHeader(state.currentView);
      if (typeof renderView === 'function' && typeof state !== 'undefined') renderView(state.currentView);
    } catch (_) {}
  }

  function bindCredentials() {
    syncLoginUi();
    const form = document.getElementById('loginForm');
    if (!form || form.dataset.saadCredentialsBound === '1') return;
    form.dataset.saadCredentialsBound = '1';

    form.addEventListener('submit', async event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const username = document.getElementById('loginUser')?.value.trim() || '';
      const password = document.getElementById('loginPassword')?.value || '';
      const validUser = username.toLowerCase() === ADMIN_USER.toLowerCase();
      let validPassword = false;
      try { validPassword = (await sha256(password)) === ADMIN_PASSWORD_SHA256; } catch (_) {}

      if (validUser && validPassword) completeLogin(ADMIN_USER);
      else showLoginError(isEnglish() ? 'Incorrect username or password.' : 'اسم المستخدم أو كلمة المرور غير صحيحة');
    }, true);

    document.getElementById('langToggle')?.addEventListener('click', () => setTimeout(syncLoginUi, 0));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindCredentials, { once: true });
  else bindCredentials();
})();
