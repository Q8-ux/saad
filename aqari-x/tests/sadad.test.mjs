import test from "node:test";
import assert from "node:assert/strict";
import {
  verifySadadInvoice,
  SadadVerifier,
} from "../workers/sadad-verifier.mjs";
const expected = {
  id: "synthetic-1",
  key: "synthetic-key",
  reference: "order-1",
  amountFils: 10050,
};
const fixture = () => ({
  isValid: true,
  errorKey: null,
  response: {
    id: "synthetic-1",
    key: "synthetic-key",
    ref_Number: "order-1",
    currency_Code: "KWD",
    amount: 10.05,
    status: "Paid",
    transactionID: "synthetic-tx",
    refunded_Amount: 0,
  },
});
test("SADAD verifier rejects mismatched currency, value, reference, invoice, transaction and refunds", () => {
  assert.equal(verifySadadInvoice(fixture(), expected).verified, true);
  for (const [key, value] of Object.entries({
    currency_Code: "USD",
    amount: 1,
    ref_Number: "other",
    id: "other",
    key: "other",
    transactionID: null,
    refunded_Amount: 1,
    status: "Unpaid",
  })) {
    const f = fixture();
    f.response[key] = value;
    assert.throws(() => verifySadadInvoice(f, expected));
  }
});
test("SADAD transport authenticates server-side then reads invoice; no charge is made", async () => {
  const calls = [];
  const transport = async (url, options) => {
    calls.push({ url, options });
    const body = url.endsWith("GenerateRefreshToken")
      ? { isValid: true, response: { refreshToken: "synthetic-refresh" } }
      : url.endsWith("GenerateAccessToken")
        ? { isValid: true, response: { accessToken: "synthetic-access" } }
        : fixture();
    return Response.json(body);
  };
  const client = new SadadVerifier({
    clientKey: "synthetic-key",
    clientSecret: "synthetic-secret",
    sandbox: true,
    transport,
  });
  assert.equal((await client.verify(expected)).verified, true);
  assert.equal(calls.length, 3);
  assert.equal(calls[2].options.method, "GET");
  assert.ok(
    calls.every((x) => x.url.startsWith("https://apisandbox.sadadpay.net/")),
  );
});
