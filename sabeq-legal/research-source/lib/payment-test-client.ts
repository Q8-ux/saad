const KEY = "sabeq-payment-test-session-v1";
export function acceptPaymentTestSession() {
  if (!window.location.hash.startsWith("#payment-test=")) return;
  const token = new URLSearchParams(window.location.hash.slice(1)).get("payment-test");
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
  try { if (token && /^[A-Za-z0-9_-]{43}$/.test(token)) sessionStorage.setItem(KEY, token); } catch { /* server rejects a missing test session */ }
}
export function paymentTestToken() {
  try { return typeof sessionStorage === "undefined" ? "" : sessionStorage.getItem(KEY) || ""; } catch { return ""; }
}
