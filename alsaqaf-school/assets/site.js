'use strict';
(() => {
  const theme = document.createElement('link');
  theme.rel = 'stylesheet';
  theme.href = 'assets/school-v2.css';
  document.head.appendChild(theme);
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) themeMeta.setAttribute('content', '#0b1f3a');

  const nav = document.querySelector('#main-nav');
  if (nav && !nav.querySelector('a[href="#student-library"]')) {
    const libraryLink = document.createElement('a');
    libraryLink.href = '#student-library';
    libraryLink.textContent = 'مكتبة الطالب';
    const parentsLink = nav.querySelector('a[href="#parents"]');
    nav.insertBefore(libraryLink, parentsLink || null);
  }

  const parentsSection = document.querySelector('#parents');
  if (parentsSection && !document.querySelector('#student-library')) {
    const section = document.createElement('section');
    section.className = 'school-library';
    section.id = 'student-library';
    section.setAttribute('aria-labelledby', 'library-title');
    section.innerHTML = `
      <div class="container">
        <div class="library-shell">
          <div class="library-head">
            <div>
              <p class="eyebrow">المكتبة الرسمية · وزارة التربية</p>
              <h2 id="library-title">مكتبة الطالب للمرحلة المتوسطة</h2>
            </div>
            <p>هذا القسم لا ينشئ روابط كتب أو مواد من عندنا. الوصول يكون إلى مكتبة الطالب الرسمية لوزارة التربية، ثم يختار الطالب الفلاتر الرسمية من داخل المكتبة.</p>
          </div>

          <div class="grade-grid" aria-label="طريقة الوصول إلى كتب المرحلة المتوسطة">
            <div class="grade-card"><strong>1</strong><span>نوع التعليم: التعليم العام</span></div>
            <div class="grade-card"><strong>2</strong><span>المرحلة التعليمية: المتوسطة</span></div>
            <div class="grade-card"><strong>3</strong><span>اختر الصف الدراسي</span></div>
            <div class="grade-card"><strong>4</strong><span>اختر المادة والفصل الدراسي</span></div>
          </div>

          <div class="subject-row" aria-label="محتوى المكتبة الرسمية">
            <span class="subject-chip">الكتب الدراسية</span>
            <span class="subject-chip">الاختبارات والمراجعات</span>
            <span class="subject-chip">الفيديوهات التعليمية</span>
          </div>

          <div class="moe-frame-wrap">
            <div class="moe-frame-toolbar">
              <span>مكتبة الطالب الرسمية — وزارة التربية بدولة الكويت</span>
              <a href="https://elibrary.moe.edu.kw/StudentsLibrary" target="_blank" rel="noopener noreferrer">فتح المكتبة الرسمية</a>
            </div>
            <iframe class="moe-frame" src="https://elibrary.moe.edu.kw/StudentsLibrary" title="مكتبة الطالب الإلكترونية الرسمية - وزارة التربية بدولة الكويت" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>
          </div>
          <p class="frame-note">إذا لم تسمح بوابة الوزارة بعرض الصفحة داخل الموقع في متصفحك، استخدم زر «فتح المكتبة الرسمية». لا نعتمد روابط داخلية ثابتة للكتب لأن الوزارة قد تغيّر مسارات الملفات.</p>

          <div class="instagram-wall" aria-labelledby="media-title">
            <h3 id="media-title">من حساب المدرسة</h3>
            <div class="instagram-grid">
              <iframe class="instagram-embed" src="https://www.instagram.com/reel/C7OdkRvMWDS/embed" title="منشور بأخلاقنا نرتقي من حساب مدرسة السقاف" loading="lazy" allowtransparency="true"></iframe>
              <iframe class="instagram-embed" src="https://www.instagram.com/reel/Cynjf2ZsQ_n/embed" title="منشور تعليمي من حساب مدرسة السقاف" loading="lazy" allowtransparency="true"></iframe>
              <iframe class="instagram-embed" src="https://www.instagram.com/reel/DOwQ6pCjDFC/embed" title="تغطية مرتبطة بمدرسة السقاف" loading="lazy" allowtransparency="true"></iframe>
            </div>
            <a class="media-fallback" href="https://www.instagram.com/alsaqaf_school/" target="_blank" rel="noopener noreferrer">مشاهدة جميع منشورات المدرسة على Instagram</a>
          </div>
        </div>
      </div>`;
    parentsSection.parentNode.insertBefore(section, parentsSection);
  }

  const menu = document.querySelector('.menu-button');
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
      if (narrow.matches && anchor.getAttribute('href')?.startsWith('#')) {
        const targetSection = document.querySelector(anchor.getAttribute('href'));
        if (targetSection) {
          targetSection.setAttribute('tabindex', '-1');
          targetSection.focus({ preventScroll: true });
          targetSection.addEventListener('blur', () => targetSection.removeAttribute('tabindex'), { once: true });
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
