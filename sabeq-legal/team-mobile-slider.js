(() => {
  'use strict';

  const MOBILE_QUERY = '(max-width: 720px)';
  const AUTO_DELAY = 4200;
  const USER_PAUSE = 7000;
  let cleanupCurrent = null;

  function getLanguage() {
    const value = document.body?.dataset?.language || document.documentElement.lang || 'ar';
    return value.startsWith('en') ? 'en' : value.startsWith('ur') ? 'ur' : 'ar';
  }

  function labels() {
    const language = getLanguage();
    if (language === 'en') return { region: 'Our legal team', slide: 'Go to lawyer' };
    if (language === 'ur') return { region: 'ہماری قانونی ٹیم', slide: 'وکیل پر جائیں' };
    return { region: 'فريقنا القانوني', slide: 'الانتقال إلى المحامي' };
  }

  function initialise() {
    const grid = document.querySelector('.team-grid');
    if (!grid || grid.dataset.mobileSliderReady === 'true') return false;

    const cards = Array.from(grid.querySelectorAll('.team-card'));
    if (cards.length < 2) return false;

    grid.dataset.mobileSliderReady = 'true';
    grid.classList.add('team-mobile-carousel');
    grid.setAttribute('role', 'region');
    grid.setAttribute('aria-label', labels().region);
    grid.tabIndex = 0;

    const dots = document.createElement('div');
    dots.className = 'team-slider-dots';
    dots.setAttribute('aria-label', labels().region);
    grid.insertAdjacentElement('afterend', dots);

    let activeIndex = 0;
    let timer = null;
    let resumeTimer = null;
    let inView = false;
    let isUserInteracting = false;

    const dotButtons = cards.map((card, index) => {
      card.dataset.teamSlide = String(index);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'team-slider-dot';
      button.setAttribute('aria-label', `${labels().slide} ${index + 1}`);
      button.addEventListener('click', () => {
        goTo(index, true);
        pauseAfterInteraction();
      });
      dots.appendChild(button);
      return button;
    });

    function updateDots() {
      dotButtons.forEach((button, index) => {
        const active = index === activeIndex;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-current', active ? 'true' : 'false');
      });
    }

    function goTo(index, smooth) {
      activeIndex = (index + cards.length) % cards.length;
      cards[activeIndex].scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
        block: 'nearest',
        inline: 'center'
      });
      updateDots();
    }

    function stopTimer() {
      if (timer) clearInterval(timer);
      timer = null;
    }

    function startTimer() {
      stopTimer();
      if (!window.matchMedia(MOBILE_QUERY).matches || !inView || isUserInteracting) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      timer = setInterval(() => goTo(activeIndex + 1, true), AUTO_DELAY);
    }

    function pauseAfterInteraction() {
      isUserInteracting = true;
      stopTimer();
      if (resumeTimer) clearTimeout(resumeTimer);
      resumeTimer = setTimeout(() => {
        isUserInteracting = false;
        startTimer();
      }, USER_PAUSE);
    }

    function syncToNearestCard() {
      const gridRect = grid.getBoundingClientRect();
      const centre = gridRect.left + gridRect.width / 2;
      let nearestIndex = 0;
      let nearestDistance = Infinity;
      cards.forEach((card, index) => {
        const rect = card.getBoundingClientRect();
        const distance = Math.abs(rect.left + rect.width / 2 - centre);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = index;
        }
      });
      activeIndex = nearestIndex;
      updateDots();
    }

    let scrollDebounce;
    grid.addEventListener('scroll', () => {
      clearTimeout(scrollDebounce);
      scrollDebounce = setTimeout(syncToNearestCard, 100);
    }, { passive: true });
    grid.addEventListener('pointerdown', pauseAfterInteraction, { passive: true });
    grid.addEventListener('touchstart', pauseAfterInteraction, { passive: true });
    grid.addEventListener('wheel', pauseAfterInteraction, { passive: true });
    grid.addEventListener('keydown', event => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      const isRtl = getComputedStyle(grid).direction === 'rtl';
      const direction = event.key === 'ArrowLeft'
        ? (isRtl ? 1 : -1)
        : (isRtl ? -1 : 1);
      goTo(activeIndex + direction, true);
      pauseAfterInteraction();
    });

    const visibilityObserver = new IntersectionObserver(entries => {
      inView = entries[0]?.isIntersecting || false;
      startTimer();
    }, { threshold: 0.45 });
    visibilityObserver.observe(grid);

    const media = window.matchMedia(MOBILE_QUERY);
    const handleMediaChange = () => {
      if (!media.matches) {
        stopTimer();
        grid.scrollTo({ left: 0, behavior: 'auto' });
      } else {
        updateDots();
        startTimer();
      }
    };
    media.addEventListener?.('change', handleMediaChange);

    updateDots();
    handleMediaChange();

    cleanupCurrent = () => {
      stopTimer();
      if (resumeTimer) clearTimeout(resumeTimer);
      visibilityObserver.disconnect();
      media.removeEventListener?.('change', handleMediaChange);
      dots.remove();
      delete grid.dataset.mobileSliderReady;
      grid.classList.remove('team-mobile-carousel');
    };
    return true;
  }

  function start() {
    if (initialise()) return;
    const observer = new MutationObserver(() => {
      if (initialise()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 15000);
  }

  window.addEventListener('beforeunload', () => cleanupCurrent?.(), { once: true });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
