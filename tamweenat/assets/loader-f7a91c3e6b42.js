(() => {
  const scriptUrl = document.currentScript.src;
  const assetsUrl = new URL("./", scriptUrl);

  // Intl currency output contains invisible RTL marks and a non-breaking
  // space. AL Mohanad can render that space as a visible À glyph.
  const bidiControls = /[\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;
  const specialSpaces = /[\u00A0\u2007\u202F]/g;
  const visibleArtifacts = /[ÀÂ]/g;
  const anyArtifact = /[\u00A0\u2007\u202F\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069\uFEFFÀÂ]/;

  function cleanFormattedText(value) {
    return String(value)
      .replace(bidiControls, "")
      .replace(specialSpaces, " ")
      .replace(visibleArtifacts, " ");
  }

  window.__tamweenatCleanMoney = cleanFormattedText;

  function installSafeNumberFormatting() {
    const prototype = Intl.NumberFormat && Intl.NumberFormat.prototype;
    if (!prototype || prototype.__tamweenatCurrencySafe) return;

    const formatDescriptor = Object.getOwnPropertyDescriptor(prototype, "format");
    if (formatDescriptor && typeof formatDescriptor.get === "function") {
      try {
        Object.defineProperty(prototype, "format", {
          configurable: formatDescriptor.configurable,
          enumerable: formatDescriptor.enumerable,
          get() {
            const nativeFormat = formatDescriptor.get.call(this);
            return (...args) => cleanFormattedText(nativeFormat(...args));
          }
        });
      } catch {
        // The bundle gets a direct formatter patch below as a fallback.
      }
    }

    for (const methodName of ["formatRange"]) {
      const nativeMethod = prototype[methodName];
      if (typeof nativeMethod !== "function") continue;
      try {
        Object.defineProperty(prototype, methodName, {
          configurable: true,
          writable: true,
          value(...args) {
            return cleanFormattedText(nativeMethod.call(this, ...args));
          }
        });
      } catch {
        // Older Android WebViews may expose non-configurable Intl methods.
      }
    }

    for (const methodName of ["formatToParts", "formatRangeToParts"]) {
      const nativeMethod = prototype[methodName];
      if (typeof nativeMethod !== "function") continue;
      try {
        Object.defineProperty(prototype, methodName, {
          configurable: true,
          writable: true,
          value(...args) {
            return nativeMethod.call(this, ...args).map((part) => ({
              ...part,
              value: cleanFormattedText(part.value)
            }));
          }
        });
      } catch {
        // Direct formatter and DOM cleanup remain active.
      }
    }

    try {
      Object.defineProperty(prototype, "__tamweenatCurrencySafe", {
        configurable: false,
        enumerable: false,
        value: true
      });
    } catch {
      // Marker is optional.
    }

    const nativeNumberToLocaleString = Number.prototype.toLocaleString;
    if (!Number.prototype.__tamweenatLocaleSafe) {
      try {
        Object.defineProperty(Number.prototype, "toLocaleString", {
          configurable: true,
          writable: true,
          value(...args) {
            return cleanFormattedText(nativeNumberToLocaleString.call(this, ...args));
          }
        });
        Object.defineProperty(Number.prototype, "__tamweenatLocaleSafe", {
          configurable: false,
          enumerable: false,
          value: true
        });
      } catch {
        // Direct formatter and DOM cleanup remain active.
      }
    }
  }

  function patchCurrencyFormatter(source) {
    const original = "function T_(e,t='ar-KW'){return new Intl.NumberFormat(t,{style:'currency',currency:'KWD',minimumFractionDigits:3}).format(e/1e3)}";
    const replacement = "function T_(e,t='ar-KW'){return window.__tamweenatCleanMoney(new Intl.NumberFormat(t,{style:'currency',currency:'KWD',minimumFractionDigits:3}).format(e/1e3))}";
    return source.includes(original) ? source.replace(original, replacement) : source;
  }

  function cleanTextNode(node) {
    const current = node.nodeValue || "";
    if (!anyArtifact.test(current)) return;
    const cleaned = cleanFormattedText(current);
    if (cleaned !== current) node.nodeValue = cleaned;
  }

  function cleanSubtree(node) {
    if (!node) return;
    if (node.nodeType === Node.TEXT_NODE) {
      cleanTextNode(node);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    let textNode;
    while ((textNode = walker.nextNode())) cleanTextNode(textNode);
  }

  function startVisibleTextCleanup() {
    const root = document.getElementById("root");
    if (!root) return;
    cleanSubtree(root);
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === "characterData") cleanTextNode(record.target);
        for (const node of record.addedNodes) cleanSubtree(node);
      }
    });
    observer.observe(root, {
      subtree: true,
      childList: true,
      characterData: true
    });
  }

  installSafeNumberFormatting();
  startVisibleTextCleanup();

  async function unpack(name) {
    if (!("DecompressionStream" in window)) {
      throw new Error("This browser needs DecompressionStream support");
    }
    const response = await fetch(new URL(name, assetsUrl), { cache: "no-store" });
    if (!response.ok || !response.body) throw new Error("Unable to load " + name);
    const stream = response.body.pipeThrough(new DecompressionStream("gzip"));
    return new Response(stream).text();
  }

  async function readOptionalStyle(name) {
    try {
      const response = await fetch(new URL(name, assetsUrl), { cache: "no-store" });
      return response.ok ? response.text() : "";
    } catch {
      return "";
    }
  }

  Promise.all([
    unpack("app-7ba441233415.css.gz"),
    unpack("app-648ce9970598.js.gz"),
    readOptionalStyle("readability-ae31f6c20418.css")
  ])
    .then(async ([css, source, readabilityCss]) => {
      const style = document.createElement("style");
      style.textContent = css;
      document.head.append(style);

      if (readabilityCss) {
        const readabilityStyle = document.createElement("style");
        readabilityStyle.id = "tamweenat-readability";
        readabilityStyle.textContent = readabilityCss;
        document.head.append(readabilityStyle);
      }

      const js = patchCurrencyFormatter(source);
      const moduleUrl = URL.createObjectURL(new Blob([js], { type: "text/javascript" }));
      try {
        await import(moduleUrl);
        cleanSubtree(document.getElementById("root"));
      } finally {
        URL.revokeObjectURL(moduleUrl);
      }
    })
    .catch((error) => {
      const root = document.getElementById("root");
      if (root) {
        root.innerHTML = '<main dir="rtl" style="font-family:Tahoma,Arial;padding:32px"><h1>تعذر تشغيل النظام</h1><p>يرجى فتح الرابط في إصدار حديث من Chrome أو Edge أو Safari.</p></main>';
      }
      console.error(error);
    });
})();
