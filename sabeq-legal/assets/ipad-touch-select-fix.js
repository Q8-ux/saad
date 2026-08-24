(() => {
  const installTouchSelectFix = () => {
    document.querySelectorAll(".custom-select").forEach((select) => {
      if (select.dataset.ipadTouchFixed === "true") return;
      const trigger = select.querySelector(".custom-select-trigger");
      if (!trigger) return;
      select.dataset.ipadTouchFixed = "true";

      const activate = (event) => {
        if (event.type === "touchend") event.preventDefault();
        trigger.click();
      };

      trigger.addEventListener("touchend", activate, { passive: false });
      trigger.addEventListener("pointerup", (event) => {
        if (event.pointerType === "touch") {
          event.preventDefault();
          trigger.click();
        }
      });

      const observer = new MutationObserver(() => {
        select.querySelectorAll(".custom-select-menu button").forEach((option) => {
          if (option.dataset.ipadTouchFixed === "true") return;
          option.dataset.ipadTouchFixed = "true";
          option.addEventListener("touchend", (event) => {
            event.preventDefault();
            option.click();
          }, { passive: false });
        });
      });
      observer.observe(select, { childList: true, subtree: true });
    });
  };

  new MutationObserver(installTouchSelectFix).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener("DOMContentLoaded", installTouchSelectFix, { once: true });
  installTouchSelectFix();
})();
