(function () {
  const AVATAR_SRC = "/saad/sabeq-legal/images/sabeq-assistant-avatar.jpg";
  const GREETING = "السلام عليكم، أنا سابق مساعدك القانوني، اشرح لي قضيتك بتأني ومن غير تكرار.";

  function avatarImage(className) {
    const img = document.createElement("img");
    img.src = AVATAR_SRC;
    img.alt = "سابق المساعد الذكي";
    img.className = className;
    img.loading = "eager";
    img.decoding = "async";
    return img;
  }

  function replaceFloatingIcon() {
    const button = document.querySelector(".floating button");
    if (!button || button.dataset.sabeqAssistantAvatar === "true") return;

    button.dataset.sabeqAssistantAvatar = "true";
    button.classList.add("sabeq-assistant-avatar-button");
    button.textContent = "";
    button.appendChild(avatarImage("sabeq-assistant-avatar-img"));
    button.setAttribute("aria-label", "المساعد القانوني");
    button.title = GREETING;
  }

  function replaceModalIcon(modal) {
    const icon = modal.querySelector(".modal-icon");
    if (!icon || icon.dataset.sabeqAssistantAvatar === "true") return;

    icon.dataset.sabeqAssistantAvatar = "true";
    icon.classList.add("sabeq-assistant-modal-avatar");
    icon.textContent = "";
    icon.appendChild(avatarImage("sabeq-assistant-modal-avatar-img"));
  }

  function applyGreeting(modal) {
    const heading = modal.querySelector("h2");
    const intro = heading ? heading.nextElementSibling : null;
    if (intro && intro.tagName === "P") {
      intro.hidden = true;
      intro.style.display = "none";
      intro.classList.add("sabeq-assistant-greeting");
    }

    if (!modal.querySelector(".sabeq-assistant-opening")) {
      const opening = document.createElement("div");
      opening.className = "sabeq-assistant-opening";
      opening.setAttribute("role", "note");
      opening.appendChild(avatarImage("sabeq-assistant-opening-avatar"));
      const text = document.createElement("span");
      text.textContent = GREETING;
      opening.appendChild(text);
      const progress = modal.querySelector(".intake-progress");
      (progress || intro || heading || modal).insertAdjacentElement("afterend", opening);
    }
  }

  function applyAssistantAvatar() {
    replaceFloatingIcon();
    document.querySelectorAll(".legal-intake").forEach((modal) => {
      replaceModalIcon(modal);
      applyGreeting(modal);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyAssistantAvatar);
  } else {
    applyAssistantAvatar();
  }

  new MutationObserver(applyAssistantAvatar).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
})();
