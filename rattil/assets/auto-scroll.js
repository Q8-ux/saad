(() => {
  const STORAGE_KEY = "rattil_auto_scroll_speed_v1";
  const DEFAULT_SPEED = 22;
  const MIN_SPEED = 5;
  const MAX_SPEED = 90;

  let running = false;
  let raf = null;
  let lastTs = 0;
  let accumulator = 0;
  let speed = Number(localStorage.getItem(STORAGE_KEY)) || DEFAULT_SPEED;

  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  const hasReadingSurface = () =>
    Boolean(document.querySelector(".ayah-list, .quran-text, .session-verse, .hero-verse"));

  const root = document.createElement("aside");
  root.className = "rattil-auto-scroll";
  root.setAttribute("aria-label", "التمرير التلقائي للقراءة");
  root.innerHTML = `
    <button type="button" class="rattil-auto-scroll-toggle" aria-pressed="false">
      <span class="rattil-auto-scroll-icon" aria-hidden="true">▶</span>
      <span class="rattil-auto-scroll-label">تشغيل التمرير</span>
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

  const setRunning = (next) => {
    running = Boolean(next);
    toggle.setAttribute("aria-pressed", running ? "true" : "false");
    label.textContent = running ? "إيقاف التمرير" : "تشغيل التمرير";
    icon.textContent = running ? "Ⅱ" : "▶";
    root.classList.toggle("is-running", running);
    lastTs = 0;
    accumulator = 0;
    if (running) {
      raf = requestAnimationFrame(tick);
    } else if (raf) {
      cancelAnimationFrame(raf);
      raf = null;
    }
  };

  const tick = (ts) => {
    if (!running) return;
    if (!lastTs) lastTs = ts;
    const delta = Math.min(64, ts - lastTs);
    lastTs = ts;

    const pxPerSecond = speed;
    accumulator += (pxPerSecond * delta) / 1000;
    const whole = Math.floor(accumulator);
    if (whole > 0) {
      window.scrollBy(0, whole);
      accumulator -= whole;
    }

    const reachedBottom =
      Math.ceil(window.scrollY + window.innerHeight) >=
      document.documentElement.scrollHeight - 2;

    if (reachedBottom) {
      setRunning(false);
      return;
    }

    raf = requestAnimationFrame(tick);
  };

  toggle.addEventListener("click", () => setRunning(!running));

  slider.addEventListener("input", () => {
    speed = clamp(Number(slider.value) || DEFAULT_SPEED, MIN_SPEED, MAX_SPEED);
    output.value = String(speed);
    output.textContent = String(speed);
    localStorage.setItem(STORAGE_KEY, String(speed));
  });

  const stopOnManualInteraction = (event) => {
    if (!running) return;
    if (event && root.contains(event.target)) return;
    setRunning(false);
  };

  document.addEventListener("touchstart", stopOnManualInteraction, { passive: true });
  document.addEventListener("pointerdown", stopOnManualInteraction, { passive: true });
  document.addEventListener("wheel", stopOnManualInteraction, { passive: true });
  document.addEventListener("keydown", (event) => {
    if (!running) return;
    if (["ArrowUp","ArrowDown","PageUp","PageDown","Home","End"," "].includes(event.key)) {
      setRunning(false);
    }
  });

  const updateVisibility = () => {
    root.hidden = !hasReadingSurface();
  };

  const observer = new MutationObserver(updateVisibility);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  document.body.appendChild(root);
  updateVisibility();
})();