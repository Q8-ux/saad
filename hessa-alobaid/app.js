const menuButton = document.querySelector('.menu-btn');
const desktopNav = document.querySelector('.main-nav');

function setupMobileMenu() {
  if (!menuButton || !desktopNav) return;

  const style = document.createElement('style');
  style.textContent = `
    .mobile-nav-overlay {
      position: fixed;
      inset: 0;
      z-index: 900;
      background: rgba(4, 20, 18, .58);
      opacity: 0;
      visibility: hidden;
      transition: opacity .25s ease, visibility .25s ease;
    }
    .mobile-nav-overlay.is-open {
      opacity: 1;
      visibility: visible;
    }
    .mobile-drawer {
      position: fixed;
      top: 0;
      right: 0;
      z-index: 1000;
      width: min(86vw, 370px);
      height: 100dvh;
      padding: 22px 20px 30px;
      background: #f7f4ed;
      color: #112d2a;
      box-shadow: -24px 0 60px rgba(0, 0, 0, .22);
      transform: translateX(110%);
      transition: transform .28s ease;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      overscroll-behavior: contain;
    }
    .mobile-drawer.is-open {
      transform: translateX(0);
    }
    .mobile-drawer-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      padding-bottom: 18px;
      border-bottom: 1px solid rgba(17, 45, 42, .12);
    }
    .mobile-drawer-title strong,
    .mobile-drawer-title small {
      display: block;
    }
    .mobile-drawer-title small {
      margin-top: 2px;
      color: #6c7774;
      font-size: 12px;
    }
    .mobile-drawer-close {
      width: 42px;
      height: 42px;
      flex: 0 0 42px;
      border: 1px solid rgba(17, 45, 42, .15);
      border-radius: 13px;
      background: #fff;
      color: #112d2a;
      font: inherit;
      font-size: 23px;
      cursor: pointer;
    }
    .mobile-drawer-links {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 20px 0;
    }
    .mobile-drawer-links a {
      display: flex;
      align-items: center;
      min-height: 52px;
      padding: 12px 14px;
      border-radius: 13px;
      color: #112d2a;
      text-decoration: none;
      font-weight: 700;
      border: 1px solid transparent;
    }
    .mobile-drawer-links a:hover,
    .mobile-drawer-links a:focus-visible {
      background: #fff;
      border-color: #ddd7cb;
      outline: none;
    }
    .mobile-drawer-cta {
      margin-top: auto;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 52px;
      padding: 12px 16px;
      border-radius: 14px;
      background: #112d2a;
      color: #fff;
      text-decoration: none;
      font-weight: 800;
    }
    body.mobile-menu-open {
      overflow: hidden;
      touch-action: none;
    }
    @media (min-width: 901px) {
      .mobile-nav-overlay,
      .mobile-drawer {
        display: none !important;
      }
    }
    @media (max-width: 900px) {
      .menu-btn {
        position: relative;
        z-index: 1100;
        width: 44px;
        height: 44px;
        display: grid !important;
        place-items: center;
        padding: 0;
        border: 1px solid rgba(17, 45, 42, .14);
        border-radius: 13px;
        background: #fff;
        color: #112d2a;
        cursor: pointer;
      }
    }
  `;
  document.head.appendChild(style);

  const overlay = document.createElement('div');
  overlay.className = 'mobile-nav-overlay';
  overlay.setAttribute('aria-hidden', 'true');

  const drawer = document.createElement('aside');
  drawer.className = 'mobile-drawer';
  drawer.id = 'mobile-navigation';
  drawer.setAttribute('aria-hidden', 'true');
  drawer.innerHTML = `
    <div class="mobile-drawer-head">
      <div class="mobile-drawer-title">
        <strong>المحامية حصة العبيد</strong>
        <small>القائمة الرئيسية</small>
      </div>
      <button class="mobile-drawer-close" type="button" aria-label="إغلاق القائمة">×</button>
    </div>
    <nav class="mobile-drawer-links" aria-label="التنقل عبر الموقع">
      ${desktopNav.innerHTML}
    </nav>
    <a class="mobile-drawer-cta" href="#consultation">طلب استشارة</a>
  `;

  document.body.append(overlay, drawer);

  const closeButton = drawer.querySelector('.mobile-drawer-close');
  const drawerLinks = drawer.querySelectorAll('a');
  let lastFocusedElement = null;

  menuButton.setAttribute('aria-controls', drawer.id);
  menuButton.setAttribute('aria-expanded', 'false');

  const openMenu = () => {
    if (window.innerWidth > 900) return;
    lastFocusedElement = document.activeElement;
    drawer.classList.add('is-open');
    overlay.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    overlay.setAttribute('aria-hidden', 'false');
    menuButton.setAttribute('aria-expanded', 'true');
    menuButton.setAttribute('aria-label', 'إغلاق القائمة');
    menuButton.textContent = '×';
    document.body.classList.add('mobile-menu-open');
    window.setTimeout(() => closeButton?.focus(), 100);
  };

  const closeMenu = () => {
    drawer.classList.remove('is-open');
    overlay.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    overlay.setAttribute('aria-hidden', 'true');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'فتح القائمة');
    menuButton.textContent = '☰';
    document.body.classList.remove('mobile-menu-open');
    lastFocusedElement?.focus?.();
  };

  menuButton.addEventListener('click', () => {
    drawer.classList.contains('is-open') ? closeMenu() : openMenu();
  });
  closeButton?.addEventListener('click', closeMenu);
  overlay.addEventListener('click', closeMenu);
  drawerLinks.forEach((link) => link.addEventListener('click', closeMenu));

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && drawer.classList.contains('is-open')) closeMenu();
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) closeMenu();
  });
}

setupMobileMenu();

const memoForm = document.getElementById('memoForm');
const memoResult = document.getElementById('memoResult');
const memoText = document.getElementById('memoText');

memoForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const memoType = document.getElementById('memoType').value;
  const caseType = document.getElementById('caseType').value;
  const court = document.getElementById('court').value || 'الجهة المختصة';
  const role = document.getElementById('role').value || 'مقدم المذكرة';
  const parties = document.getElementById('parties').value || 'الأطراف وفق بيانات القضية';
  const facts = document.getElementById('facts').value.trim();
  const claims = document.getElementById('claims').value.trim();
  const defenses = document.getElementById('defenses').value.trim() || 'تُستكمل الدفوع والأسانيد القانونية بعد المراجعة المهنية.';
  const draft = `بسم الله الرحمن الرحيم\n\nأمام ${court}\n\n${memoType}\nفي القضية: ${caseType}\n\nمقدمة من: ${role}\nضد: ${parties}\n\nأولاً: الوقائع\n${facts}\n\nثانياً: الدفوع والأسانيد\n${defenses}\n\nثالثاً: الطلبات\n${claims}\n\nولذلك\nيلتمس مقدم هذه المذكرة من الجهة الموقرة النظر في الطلبات الواردة أعلاه، مع حفظ سائر الحقوق الأخرى.\n\nوتفضلوا بقبول فائق الاحترام.\n\nتنبيه: هذه مسودة أولية تم إنشاؤها من البيانات المدخلة، ولا تُعد مذكرة قانونية نهائية قبل مراجعتها واعتمادها من محامٍ مختص.`;
  memoText.textContent = draft;
  memoResult.classList.remove('hidden');
  memoResult.scrollIntoView({ behavior: 'smooth', block: 'start' });
  localStorage.setItem('hessaMemoDraft', draft);
});

document.getElementById('copyMemo')?.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(memoText.textContent || '');
    alert('تم نسخ المسودة');
  } catch {
    alert('تعذر النسخ تلقائيًا');
  }
});

document.getElementById('printMemo')?.addEventListener('click', () => {
  const content = memoText.textContent || '';
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`<html dir="rtl"><head><title>المسودة القانونية</title><style>body{font-family:Arial;padding:40px;line-height:2;white-space:pre-wrap}</style></head><body>${content.replaceAll('\n', '<br>')}</body></html>`);
  win.document.close();
  win.print();
});

document.getElementById('consultationForm')?.addEventListener('submit', (event) => {
  event.preventDefault();
  alert('تم استلام طلبك في النسخة التجريبية. يلزم ربط النموذج بقاعدة بيانات أو بريد إلكتروني قبل النشر الرسمي.');
  event.currentTarget.reset();
});

const saved = localStorage.getItem('hessaMemoDraft');
if (saved && memoText && memoResult) {
  memoText.textContent = saved;
}
