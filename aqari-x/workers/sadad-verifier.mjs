// Disabled-by-default SADAD Kuwait verification adapter. No invoice-creation or charge endpoint.
import { parseMoney } from "../public/core.mjs";
export function verifySadadInvoice(envelope, expected) {
  if (envelope?.isValid !== true || envelope.errorKey || !envelope.response)
    throw new Error("Unverified SADAD response");
  const i = envelope.response;
  if (
    String(i.id) !== String(expected.id) ||
    String(i.key) !== String(expected.key) ||
    i.ref_Number !== expected.reference ||
    i.currency_Code !== "KWD" ||
    parseMoney(String(i.amount)) !== expected.amountFils
  )
    throw new Error("Invoice does not match authoritative local order");
  if (
    i.status !== "Paid" ||
    !i.transactionID ||
    Number(i.refunded_Amount || 0) !== 0
  )
    throw new Error("Payment not confirmed or refunded");
  return {
    verified: true,
    invoiceId: String(i.id),
    transactionId: String(i.transactionID),
  };
}
export class SadadVerifier {
  constructor({ clientKey, clientSecret, sandbox = true, transport = fetch }) {
    if (!clientKey || !clientSecret)
      throw new Error("Server-side merchant credentials required");
    this.key = clientKey;
    this.secret = clientSecret;
    this.base = sandbox
      ? "https://apisandbox.sadadpay.net"
      : "https://api.sadadpay.net";
    this.transport = transport;
  }
  async request(path, authorization, method = "POST") {
    const r = await this.transport(this.base + path, {
      method,
      headers: { authorization },
      redirect: "error",
      signal: AbortSignal.timeout(12000),
    });
    if (!r.ok) throw new Error("SADAD request failed");
    const out = await r.json();
    if (out.isValid !== true || out.errorKey)
      throw new Error("SADAD did not verify response");
    return out;
  }
  async authenticate() {
    const refresh = await this.request(
      "/api/User/GenerateRefreshToken",
      "Basic " + Buffer.from(this.key + ":" + this.secret).toString("base64"),
    );
    const access = await this.request(
      "/api/User/GenerateAccessToken",
      "Bearer " + refresh.response.refreshToken,
    );
    if (!access.response?.accessToken) throw new Error("Missing access token");
    return access.response.accessToken;
  }
  async verify(expected) {
    const token = await this.authenticate();
    const invoice = await this.request(
      "/api/Invoice/getbyid?id=" + encodeURIComponent(expected.id),
      "Bearer " + token,
      "GET",
    );
    return verifySadadInvoice(invoice, expected);
  }
}
