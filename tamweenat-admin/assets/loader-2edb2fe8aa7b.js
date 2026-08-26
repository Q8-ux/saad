(() => {
  const scriptUrl = document.currentScript.src;
  const assetsUrl = new URL("./", scriptUrl);

  async function unpack(name) {
    if (!("DecompressionStream" in window)) {
      throw new Error("This browser needs DecompressionStream support");
    }
    const assetUrl = new URL(name, assetsUrl);
    assetUrl.searchParams.set("v", "2edb2fe8aa7b");
    const response = await fetch(assetUrl, { cache: "no-store" });
    if (!response.ok || !response.body) throw new Error("Unable to load " + name);
    const stream = response.body.pipeThrough(new DecompressionStream("gzip"));
    return new Response(stream).text();
  }

  Promise.all([unpack("app-047c67ce2dbd.css.gz"), unpack("app-f9172c0b0e0b.js.gz")])
    .then(async ([css, js]) => {
      const style = document.createElement("style");
      style.textContent = css;
      document.head.append(style);
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
