(() => {
  "use strict";

  if (window.__tamweenatSupportRuntimeLoaded) return;
  window.__tamweenatSupportRuntimeLoaded = true;

  const API_BASE = String(
    window.TAMWEENAT_API_BASE ||
    document.querySelector('meta[name="tamweenat-api"]')?.content ||
    "https://tamweenat-api.onrender.com",
  ).replace(/\/+$/, "");
  const FAILURE_LIMIT = 3;
  const CIRCUIT_PAUSE_MS = 45_000;
  const telemetry = [];
  const circuit = { failures: 0, openUntil: 0 };
  let healthCache = null;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function requestId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `tw-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function record(type, detail = {}) {
    telemetry.unshift({ type, at: new Date().toISOString(), ...detail });
    if (telemetry.length > 40) telemetry.length = 40;
    window.dispatchEvent(new CustomEvent("tamweenat-support-event", { detail: { type, ...detail } }));
  }

  function supportError(code, status = 0, retryable = false) {
    const error = new Error(code);
    error.code = code;
    error.status = status;
    error.retryable = retryable;
    return error;
  }

  function parseRetryAfter(response) {
    const raw = response.headers.get("retry-after");
    const seconds = Number(raw);
    return Number.isFinite(seconds) ? Math.min(4_000, Math.max(250, seconds * 1_000)) : 600;
  }

  async function request(path, options = {}) {
    const now = Date.now();
    if (circuit.openUntil > now) throw supportError("service_temporarily_unavailable", 0, true);

    const method = options.method || "GET";
    const retries = Math.max(0, Math.min(2, Number(options.retries ?? 1)));
    const timeout = Math.max(2_000, Math.min(35_000, Number(options.timeout ?? 18_000)));
    let lastError;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort("timeout"), timeout);
      const id = requestId();
      const started = performance.now();
      try {
        const response = await fetch(`${API_BASE}${path}`, {
          method,
          mode: "cors",
          credentials: "omit",
          cache: "no-store",
          referrerPolicy: "strict-origin-when-cross-origin",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-Request-ID": id,
            "X-Tamweenat-Client": "web-v2",
            ...(options.headers || {}),
          },
          body: options.body === undefined ? undefined : JSON.stringify(options.body),
          signal: options.signal || controller.signal,
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          const retryable = response.status === 408 || response.status === 425 || response.status === 429 || response.status >= 500;
          throw supportError(String(payload.error || `http_${response.status}`), response.status, retryable);
        }
        circuit.failures = 0;
        circuit.openUntil = 0;
        record("request_ok", { path, id, elapsedMs: Math.round(performance.now() - started) });
        return payload;
      } catch (error) {
        lastError = error?.name === "AbortError" || controller.signal.aborted
          ? supportError("request_timeout", 0, true)
          : error?.code
            ? error
            : supportError("network_unavailable", 0, true);
        record("request_failed", { path, id, code: lastError.code, attempt });
        if (!lastError.retryable || attempt >= retries || lastError.code === "ai_not_configured") break;
        await sleep(lastError.status === 429 ? 850 : 350 * (attempt + 1));
      } finally {
        clearTimeout(timer);
      }
    }

    circuit.failures += 1;
    if (circuit.failures >= FAILURE_LIMIT) circuit.openUntil = Date.now() + CIRCUIT_PAUSE_MS;
    throw lastError || supportError("request_failed");
  }

  async function health(force = false) {
    if (!force && healthCache && Date.now() - healthCache.checkedAt < 60_000) return healthCache.value;
    const value = await request("/health", { timeout: 12_000, retries: 0 });
    healthCache = { checkedAt: Date.now(), value };
    return value;
  }

  async function analyzeOrder(message, context = {}) {
    const text = String(message || "").trim().slice(0, 600);
    if (!text) throw supportError("empty_message", 400, false);
    const cart = Array.isArray(context.cart)
      ? context.cart.slice(0, 50).map((item) => ({
        sku: String(item?.sku || "").toUpperCase().slice(0, 24),
        quantity: Math.max(0, Math.min(20, Number(item?.quantity || 0))),
      })).filter((item) => item.sku && item.quantity > 0)
      : [];
    return request("/api/ai/catalog-assistant", {
      method: "POST",
      timeout: 28_000,
      retries: 0,
      body: {
        message: text,
        language: ["ar", "en", "ur"].includes(context.language) ? context.language : "ar",
        cart,
      },
    });
  }

  window.TamweenatSupport = Object.freeze({
    apiBase: API_BASE,
    request,
    health,
    analyzeOrder,
    diagnostics: () => ({
      version: "2.0.0",
      circuitOpen: circuit.openUntil > Date.now(),
      recentEvents: telemetry.slice(0, 12),
    }),
  });

  window.dispatchEvent(new CustomEvent("tamweenat-support-ready"));
})();
