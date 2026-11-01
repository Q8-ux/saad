(() => {
  const STORAGE_KEY = "rattil_auto_scroll_speed_v2";
  const DEFAULT_SPEED = 22;
  const MIN_SPEED = 5;
  const MAX_SPEED = 90;

  let running = false;
  let raf = null;
  let lastTs = 0;
  let accumulator = 0;
  let speed = Number(localStorage.getItem(STORAGE_KEY)) || DEFAULT_SPEED;

  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  const root = document.createElement("section");
  root.className = "rattil-auto-scroll";
  root.setAttribute("aria-label", "تشغيل السورة كاملة مع التمرير التلقائي");
  root.innerHTML = `
    <button type="button" class="rattil-auto-scroll-toggle" aria-pressed="false">
      <span class="rattil-auto-scroll-icon" aria-hidden="true">▶</span>
      <span class="rattil-auto-scroll-label">تشغيل السورة + التمرير</span>
    </button>
    <label class="rattil-auto-scroll-speed-wrap">
      <span>سرعة التمرير</span>
      <input class="rattil-auto-scroll-speed" type="range" min="${MIN_SPEED}" max="${MAX_SPEED}" step="1" value="${clamp(speed, MIN_SPEED, MAX_SPEED)}" aria-label="سرعة التمرير التلقائي">
      <output class="rattil-auto-scroll-value">${clamp(speed, MIN_SPEED, MAX_SPEED)}</output>
    </label>
  `;

  const toggle = root.querySelector(".rattil-auto-scroll-toggle");
  const label = root.querySelector(".rattil-auto-scroll-label");
  const icon = root.querySelector(".rattil-auto-scroll-icon");
  const slider = root.querySelector(".rattil-auto-scroll-speed");
  const output = root.querySelector(".rattil-auto-scroll-value");

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
      return fullButton.closest(".control-panel, .reading-tools, .app-title-row, section, main, div") || fullButton.parentElement;
    }
    return document.querySelector(".control-panel, .surah-summary, .ayah-list");
  };

  const isAudioPlaying = () => {
    const audio = document.querySelector("audio");
    return Boolean(audio && !audio.paused && !audio.ended && audio.currentTime >= 0);
  };

  const startFullSurahAudio = () => {
    if (isAudioPlaying()) return true;
    const fullButton = findFullSurahButton();
    if (!fullButton) return false;
    fullButton.click();
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
        label.textContent = running ? "إيقاف السورة والتمرير" : "تشغيل السورة + التمرير";
      }, 1800);
      return;
    }

    running = shouldRun;
    toggle.setAttribute("aria-pressed", running ? "true" : "false");
    label.textContent = running ? "إيقاف السورة والتمرير" : "تشغيل السورة + التمرير";
    icon.textContent = running ? "Ⅱ" : "▶";
    root.classList.toggle("is-running", running);
    lastTs = 0;
    accumulator = 0;

    if (running) {
      raf = requestAnimationFrame(tick);
    } else {
      if (raf) cancelAnimationFrame(raf);
      raf = null;
      if (syncAudio) pauseAudio();
    }
  };

  const tick = (ts) => {
    if (!running) return;
    if (!lastTs) lastTs = ts;
    const delta = Math.min(64, ts - lastTs);
    lastTs = ts;

    accumulator += (speed * delta) / 1000;
    const whole = Math.floor(accumulator);
    if (whole > 0) {
      window.scrollBy(0, whole);
      accumulator -= whole;
    }

    const reachedBottom =
      Math.ceil(window.scrollY + window.innerHeight) >=
      document.documentElement.scrollHeight - 2;

    if (reachedBottom) {
      setRunning(false, { syncAudio: true });
      return;
    }

    raf = requestAnimationFrame(tick);
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

  const stopOnManualScroll = (event) => {
    if (!running || root.contains(event.target)) return;
    if (event.type === "wheel" || event.type === "touchstart") {
      setRunning(false, { syncAudio: false });
    }
  };

  document.addEventListener("touchstart", stopOnManualScroll, { passive: true });
  document.addEventListener("wheel", stopOnManualScroll, { passive: true });
  document.addEventListener("keydown", (event) => {
    if (!running) return;
    if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) {
      setRunning(false, { syncAudio: false });
    }
  });

  document.addEventListener("play", (event) => {
    if (event.target instanceof HTMLAudioElement && running) {
      root.classList.add("audio-active");
    }
  }, true);

  document.addEventListener("pause", (event) => {
    if (event.target instanceof HTMLAudioElement) {
      root.classList.remove("audio-active");
    }
  }, true);

  const observer = new MutationObserver(placeControls);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  placeControls();
})();