(() => {
  const scriptUrl = document.currentScript.src;
  const assetsUrl = new URL("./", scriptUrl);
  const bidiControls = /[\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;

  function stripBidiControls(value) {
    return String(value).replace(bidiControls, "");
  }

  function installSafeNumberFormatting() {
    const prototype = Intl.NumberFormat && Intl.NumberFormat.prototype;
    if (!prototype || prototype.__tamweenatBidiSafe) return;

    const formatDescriptor = Object.getOwnPropertyDescriptor(prototype, "format");
    if (formatDescriptor && typeof formatDescriptor.get === "function") {
      Object.defineProperty(prototype, "format", {
        configurable: formatDescriptor.configurable,
        enumerable: formatDescriptor.enumerable,
        get() {
          const nativeFormat = formatDescriptor.get.call(this);
          return (...args) => stripBidiControls(nativeFormat(...args));
        }
      });
    }

    const nativeFormatToParts = prototype.formatToParts;
    if (typeof nativeFormatToParts === "function") {
      Object.defineProperty(prototype, "formatToParts", {
        configurable: true,
        writable: true,
        value(...args) {
          return nativeFormatToParts.call(this, ...args).map((part) => ({
            ...part,
            value: stripBidiControls(part.value)
          }));
        }
      });
    }

    Object.defineProperty(prototype, "__tamweenatBidiSafe", {
      configurable: false,
      enumerable: false,
      value: true
    });
  }

  installSafeNumberFormatting();

  async function unpack(name) {
    if (!("DecompressionStream" in window)) {
      throw new Error("This browser needs DecompressionStream support");
    }
    const response = await fetch(new URL(name, assetsUrl));
    if (!response.ok || !response.body) throw new Error("Unable to load " + name);
    const stream = response.body.pipeThrough(new DecompressionStream("gzip"));
    return new Response(stream).text();
  }

  async function readOptionalStyle(name) {
    try {
      const response = await fetch(new URL(name, assetsUrl));
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
    .then(async ([css, js, readabilityCss]) => {
      const style = document.createElement("style");
      style.textContent = css;
      document.head.append(style);

      if (readabilityCss) {
        const readabilityStyle = document.createElement("style");
        readabilityStyle.id = "tamweenat-readability";
        readabilityStyle.textContent = readabilityCss;
        document.head.append(readabilityStyle);
      }

      const moduleUrl = URL.createObjectURL(new Blob([js], { type: "text/javascript" }));
      try {
        await import(moduleUrl);
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
