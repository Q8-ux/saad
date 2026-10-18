"use strict";
// The policy does not send analytics or load third-party resources.
const status = document.getElementById("analytics-status");
let unavailable = false;
function showPreference() {
  if (!status) return;
  try {
    const restricted = navigator.doNotTrack === "1" || navigator.globalPrivacyControl || navigator.webdriver || localStorage.getItem("sabeq-analytics-internal") === "1";
    const choice = localStorage.getItem("sabeq-analytics-consent");
    status.textContent = unavailable ? status.dataset.unavailable : restricted ? status.dataset.restricted : localStorage.getItem("sabeq-analytics-opt-out") === "1" || choice === "denied" ? status.dataset.disabled : choice === "granted" ? status.dataset.enabled : status.dataset.unset;
  } catch { status.textContent = status.dataset.unavailable; }
}
document.querySelectorAll("[data-analytics-choice]").forEach(button => {
  button.addEventListener("click", () => {
    try {
      const disable = button.dataset.analyticsChoice === "disable";
      localStorage.setItem("sabeq-analytics-opt-out", disable ? "1" : "0");
      localStorage.setItem("sabeq-analytics-consent", disable ? "denied" : "granted");
      unavailable = false;
      if (disable) {
        localStorage.removeItem("sabeq-analytics-visitor");
        try { sessionStorage.removeItem("sabeq-analytics-session"); } catch {}
      }
      showPreference();
    } catch { unavailable = true; if (status) status.textContent = status.dataset.unavailable; }
  });
});
window.addEventListener("storage", showPreference);
showPreference();
