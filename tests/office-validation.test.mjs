import assert from "node:assert/strict";
import test from "node:test";

import {
  amountFils,
  dateValue,
  didWrite,
  validEmail,
} from "../lib/office-validation.ts";
import {
  assertTrustedMutation,
  privateJson,
  RequestValidationError,
} from "../lib/request-security.ts";

test("validates real calendar dates rather than only the date shape", () => {
  assert.equal(dateValue("2028-02-29", "التاريخ", { required: true }), "2028-02-29");
  assert.throws(
    () => dateValue("2027-02-29", "التاريخ", { required: true }),
    RequestValidationError,
  );
  assert.throws(
    () => dateValue("2028-02-29-manipulated", "التاريخ", { required: true }),
    RequestValidationError,
  );
});

test("rejects malformed email and unsafe invoice values", () => {
  assert.throws(() => validEmail("not-an-email"), RequestValidationError);
  assert.throws(() => amountFils("NaN"), RequestValidationError);
  assert.equal(amountFils("1250.4"), 1250);
});

test("treats D1 writes without changed rows as missing records", () => {
  assert.equal(didWrite({ meta: { changes: 1 } }), true);
  assert.equal(didWrite({ meta: { changes: 0 } }), false);
});

test("rejects cross-origin mutations and prevents private API caching", () => {
  assert.throws(
    () => assertTrustedMutation(new Request("https://legal-office.example/api/office", {
      method: "POST",
      headers: { origin: "https://untrusted.example" },
    })),
    RequestValidationError,
  );
  const response = privateJson({ ok: true });
  assert.match(response.headers.get("cache-control") ?? "", /no-store/i);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
});
