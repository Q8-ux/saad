(() => {
  "use strict";

  const gameOrigin = "https://ai-chess-kuwait.onrender.com";
  const frame = document.querySelector(".game-frame");
  const loader = document.querySelector(".loading-shell");
  const retry = document.querySelector(".retry");

  if (!(frame instanceof HTMLIFrameElement)) return;

  const loadGame = () => {
    const target = new URL("/", gameOrigin);
    target.search = window.location.search;
    frame.src = target.toString();
  };

  frame.addEventListener("load", () => {
    if (loader instanceof HTMLElement) loader.hidden = true;
  });

  retry?.addEventListener("click", () => {
    if (loader instanceof HTMLElement) {
      loader.hidden = false;
      loader.classList.remove("is-slow");
    }
    frame.src = "about:blank";
    window.setTimeout(loadGame, 80);
    window.setTimeout(() => loader?.classList.add("is-slow"), 12_000);
  });

  window.setTimeout(() => loader?.classList.add("is-slow"), 12_000);
  loadGame();
})();
