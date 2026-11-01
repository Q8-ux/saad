(() => {
  const STORAGE_KEY = "rattil_ayah_sync_speed_v1";
  const DEFAULT_SPEED = 55;
  const MIN_SPEED = 10;
  const MAX_SPEED = 100;

  let running = false;
  let speed = Number(localStorage.getItem(STORAGE_KEY)) || DEFAULT_SPEED;
  let currentIndex = 0;
  let lastAudioSrc = "";
  let activeCard = null;

  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  const root = document.createElement("section");
  root.className = "rattil-auto-scroll";
  root.setAttribute("aria-label", "مزامنة تشغيل السورة مع الآيات");
  root.innerHTML = `
    <button type="button" class="rattil-auto-scroll-toggle" aria-pressed="false">
      <span class="rattil-auto-scroll-icon" aria-hidden="true">▶</span>
      <span class="rattil-auto-scroll-label">تشغيل السورة + مزامنة الآيات</span>
    </button>
    <label class="rattil-auto-scroll-speed-wrap">
      <span>سرعة الانتقال بين الآيات</span>
      <input class="rattil-auto-scroll-speed" type="range" min="${MIN_SPEED}" max="${MAX_SPEED}" step="1" value="${clamp(speed, MIN_SPEED, MAX_SPEED)}" aria-label="سرعة الانتقال بين الآيات">
      <output class="rattil-auto-scroll-value">${clamp(speed, MIN_SPEED, MAX_SPEED)}</output>
    </label>
  `;

  const toggle = root.querySelector(".rattil-auto-scroll-toggle");
  const label = root.querySelector(".rattil-auto-scroll-label");
  const icon = root.querySelector(".rattil-auto-scroll-icon");
  const slider = root.querySelector(".rattil-auto-scroll-speed");
  const output = root.querySelector(".rattil-auto-scroll-value");

  const getAyahCards = () => [...document.querySelectorAll(".ayah-list .ayah-card")];

  const findFullSurahButton = () => {
    const buttons = [...document.querySelectorAll("button")];
    return buttons.find((button) => {
      const text = (button.textContent || "").replace(/\s+/g, " ").trim();
      return text.includes("تشغيل السورة كاملة") || text.includes("Full Surah");
    }) || null;
  };

  const findMushafAnchor = () => {
    const fullButton = findFullSurahButton();
    if (fullButton) {
      return fullButton.closest(".reading-tools, .control-panel, .app-title-row") || fullButton.parentElement;
    }
    return document.querySelector(".control-panel, .surah-summary, .ayah-list");
  };

  const isFullSurahPlayback = () => {
    const subtitle = document.querySelector(".track-info > div span");
    const text = (subtitle?.textContent || "").replace(/\s+/g, " ").trim();
    return text.includes("تشغيل السورة كاملة") || text.includes("Full Surah");
  };

  const transitionBehavior = () => {
    // Higher slider value = quicker transition; lower = gentler.
    return speed >= 70 ? "auto" : "smooth";
  };

  const clearActiveCard = () => {
    if (activeCard) activeCard.classList.remove("rattil-synced-ayah");
    activeCard = null;
  };

  const syncToIndex = (index) => {
    const cards = getAyahCards();
    if (!cards.length) return;
    const safeIndex = Math.max(0, Math.min(index, cards.length - 1));
    clearActiveCard();
    activeCard = cards[safeIndex];
    activeCard.classList.add("rattil-synced-ayah");

    const rect = activeCard.getBoundingClientRect();
    const targetTop = Math.max(0, window.scrollY + rect.top - Math.round(window.innerHeight * 0.24));

    window.scrollTo({
      top: targetTop,
      behavior: transitionBehavior()
    });
  };

  const startFullSurahAudio = () => {
    const fullButton = findFullSurahButton();
    if (!fullButton) return false;

    const audio = document.querySelector("audio");
    if (audio && !audio.paused && isFullSurahPlayback()) return true;

    currentIndex = 0;
    lastAudioSrc = "";
    fullButton.click();
    setTimeout(() => syncToIndex(0), 120);
    return true;
  };

  const pauseAudio = () => {
    const audio = document.querySelector("audio");
    if (audio && !audio.paused) audio.pause();
  };

  const setRunning = (next, { syncAudio = true } = {}) => {
    const shouldRun = Boolean(next);

    if (shouldRun && syncAudio && !startFullSurahAudio()) {
      root.classList.add("is-unavailable");
      label.textContent = "افتح سورة كاملة أولاً";
      setTimeout(() => {
        root.classList.remove("is-unavailable");
        label.textContent = running
          ? "إيقاف السورة والمزامنة"
          : "تشغيل السورة + مزامنة الآيات";
      }, 1800);
      return;
    }

    running = shouldRun;
    toggle.setAttribute("aria-pressed", running ? "true" : "false");
    label.textContent = running
      ? "إيقاف السورة والمزامنة"
      : "تشغيل السورة + مزامنة الآيات";
    icon.textContent = running ? "Ⅱ" : "▶";
    root.classList.toggle("is-running", running);

    if (!running) {
      clearActiveCard();
      lastAudioSrc = "";
      currentIndex = 0;
      if (syncAudio) pauseAudio();
    }
  };

  const handleAudioProgression = () => {
    if (!running) return;

    const audio = document.querySelector("audio");
    if (!audio || !isFullSurahPlayback()) return;

    const src = audio.currentSrc || audio.src || "";
    if (!src || src === lastAudioSrc) return;

    if (!lastAudioSrc) {
      currentIndex = 0;
    } else {
      currentIndex += 1;
    }

    lastAudioSrc = src;
    syncToIndex(currentIndex);
  };

  const placeControls = () => {
    const anchor = findMushafAnchor();
    if (!anchor) {
      if (root.isConnected) root.remove();
      return;
    }

    if (root.parentElement !== anchor.parentElement || root.previousElementSibling !== anchor) {
      anchor.insertAdjacentElement("afterend", root);
    }
  };

  toggle.addEventListener("click", () => setRunning(!running));

  slider.addEventListener("input", () => {
    speed = clamp(Number(slider.value) || DEFAULT_SPEED, MIN_SPEED, MAX_SPEED);
    output.value = String(speed);
    output.textContent = String(speed);
    localStorage.setItem(STORAGE_KEY, String(speed));
  });

  document.addEventListener("play", (event) => {
    if (!(event.target instanceof HTMLAudioElement)) return;
    if (running) {
      root.classList.add("audio-active");
      setTimeout(handleAudioProgression, 60);
    }
  }, true);

  document.addEventListener("loadedmetadata", (event) => {
    if (event.target instanceof HTMLAudioElement) {
      handleAudioProgression();
    }
  }, true);

  document.addEventListener("ended", (event) => {
    if (!(event.target instanceof HTMLAudioElement) || !running) return;
    setTimeout(handleAudioProgression, 80);
  }, true);

  document.addEventListener("pause", (event) => {
    if (event.target instanceof HTMLAudioElement) {
      root.classList.remove("audio-active");
    }
  }, true);

  document.addEventListener("keydown", (event) => {
    if (!running) return;
    if (event.key === "Escape") setRunning(false, { syncAudio: false });
  });

  const observer = new MutationObserver(() => {
    placeControls();
    if (running) handleAudioProgression();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  placeControls();
})();