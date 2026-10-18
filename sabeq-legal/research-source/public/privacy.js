"use strict";
// The policy does not send analytics or load third-party resources.
const status = document.getElementById("analytics-status");
function showPreference() {
  if (!status) return;
  const restricted = navigator.doNotTrack === "1" || navigator.globalPrivacyControl;
  try {
    status.textContent = restricted ? status.dataset.restricted : localStorage.getItem("sabeq-analytics-opt-out") === "1" ? status.dataset.disabled : status.dataset.enabled;
  } catch { status.textContent = status.dataset.unavailable; }
}
document.querySelectorAll("[data-analytics-choice]").forEach(button => {
  button.addEventListener("click", () => {
    try {
      const disable = button.dataset.analyticsChoice === "disable";
      localStorage.setItem("sabeq-analytics-opt-out", disable ? "1" : "0");
      if (disable) {
        localStorage.removeItem("sabeq-analytics-visitor");
        sessionStorage.removeItem("sabeq-analytics-session");
      }
      showPreference();
    } catch { if (status) status.textContent = status.dataset.unavailable; }
  });
});
showPreference();
