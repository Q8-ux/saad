(() => {
  "use strict";

  const appOrigin = "https://abyat-alshier.centrino.chatgpt.site";
  const frame = document.querySelector(".site-frame");
  const loader = document.querySelector(".loading-shell");
  const retryButton = document.querySelector(".retry");
  const route = document.body.dataset.appPath || "/";

  if (!(frame instanceof HTMLIFrameElement)) return;

  const loadApp = () => {
    const target = new URL(route, appOrigin);
    target.search = window.location.search;
    target.hash = window.location.hash;
    frame.src = target.toString();
  };

  frame.addEventListener("load", () => {
    if (loader instanceof HTMLElement) loader.hidden = true;
  });

  retryButton?.addEventListener("click", () => {
    if (loader instanceof HTMLElement) {
      loader.hidden = false;
      loader.classList.remove("is-slow");
    }
    frame.src = "about:blank";
    window.setTimeout(loadApp, 60);
  });

  window.setTimeout(() => loader?.classList.add("is-slow"), 7000);
  loadApp();
})();
