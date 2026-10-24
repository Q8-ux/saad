import test from "node:test";
import assert from "node:assert/strict";
import {
  norm,
  parseMoney,
  money,
  commissionFils,
  parseIntent,
  searchProperties,
  matchProperties,
  extractListing,
  duplicateKey,
} from "../public/core.mjs";
import { seedProperties } from "../server/seed.mjs";
import {
  passwordHash,
  passwordValid,
  seal,
  unseal,
  isRaster,
} from "../server/security.mjs";
test("Arabic and Persian numbers and hamza normalize together", () => {
  assert.equal(norm("إِيجار ٥٠٠٫٥۰"), norm("ايجار 500.50"));
});
test("KWD money uses exact fils and rejects extra precision and negatives", () => {
  assert.equal(parseMoney("١٬٢٣٤٫٥٦٧"), 1234567);
  assert.equal(parseMoney("0"), 0);
  assert.equal(parseMoney(""), null);
  assert.throws(() => parseMoney("1.0001"));
  assert.throws(() => parseMoney("-1"));
  assert.equal(money(1250), "1.25 د.ك");
});
test("commission rounds one time at fils and uses explicit final price", () => {
  assert.equal(commissionFils(250000000, "percent", "2.5"), 6250000);
  assert.equal(commissionFils(1010, "percent", "2.5"), 25);
  assert.equal(commissionFils(250000000, "fixed", "500.125"), 500125);
  assert.throws(() => commissionFils(1000, "percent", "11"));
});
test("natural Arabic search parses area type rooms and Arabic budget", () => {
  const p = parseIntent("شقة بالجابرية ثلاث غرف بحدود ٥٠٠");
  assert.equal(p.filters.area, "الجابرية");
  assert.equal(p.filters.type, "شقة");
  assert.equal(p.filters.maxPrice, 500);
  assert.equal(p.filters.bedrooms, 3);
  assert.equal(
    searchProperties(seedProperties, { q: "شقة بالجابرية ثلاث غرف بحدود ٥٠٠" })
      .properties[0].id,
    "initial-08",
  );
});
test("advanced filters combine, Arabic numeric filters work and missing prices are excluded", () => {
  const r = searchProperties(seedProperties, {
    category: "للإيجار",
    type: "شقة",
    governorate: "حولي",
    maxPrice: "٤٥٠",
    bedrooms: 3,
  });
  assert.deepEqual(
    r.properties.map((p) => p.id),
    ["initial-08"],
  );
  assert.equal(
    searchProperties(seedProperties, { maxPrice: "غير صحيح" }).properties
      .length,
    0,
  );
  assert.ok(
    searchProperties(seedProperties, { maxPrice: 600 }).properties.every(
      (p) => p.priceFils !== null,
    ),
  );
});
test("type selector actually filters and filters never mutate original order", () => {
  const before = seedProperties.map((p) => p.id);
  const result = searchProperties(seedProperties, {
    type: "أرض",
    sort: "price-asc",
  });
  assert.ok(result.properties.every((x) => x.type === "أرض"));
  assert.deepEqual(
    seedProperties.map((x) => x.id),
    before,
  );
});
test("unknown amounts sort last in both price directions", () => {
  for (const sort of ["price-asc", "price-desc"]) {
    const p = searchProperties(seedProperties, { sort }).properties;
    assert.equal(p.at(-1).priceFils, null);
  }
});
test("CRM matcher rejects price-unknown and above-budget properties", () => {
  const r = matchProperties(seedProperties, {
    type: "شقة",
    category: "للإيجار",
    area: "الجابرية",
    maxPriceFils: 450000,
    bedrooms: 3,
  });
  assert.equal(r.length, 1);
  assert.equal(r[0].id, "initial-08");
  assert.ok(r[0].reasons.includes("ضمن الميزانية"));
  assert.equal(
    matchProperties(seedProperties, { type: "بيت", maxPriceFils: 500000 })
      .length,
    0,
  );
});
test("text extraction separates region from physical area and preserves missing values", () => {
  const x = extractListing(
    "شقة للإيجار بالجابرية\nالإيجار: 450\nالمساحة: 120 متر\n3 غرف",
  );
  assert.equal(x.fields.location, "الجابرية");
  assert.equal(x.fields.area, 120);
  assert.equal(x.fields.price, 450);
  assert.equal(x.fields.bedrooms, 3);
  const y = extractListing("بيت للبدل في المطلاع");
  assert.equal(y.fields.location, "المطلاع");
  assert.equal(y.fields.area, undefined);
  assert.equal(y.fields.price, undefined);
});
test("matching duplicate fingerprints fold Arabic spelling", () => {
  assert.equal(
    duplicateKey({
      title: "شَقّة",
      location: "الجابرية",
      type: "شقة",
      category: "للإيجار",
    }),
    duplicateKey({
      title: "شقه",
      location: "الجابريه",
      type: "شقة",
      category: "للإيجار",
    }),
  );
});
test("seed exchange and per-unit rental preserve meaning and have no fabricated area", () => {
  assert.equal(
    seedProperties.find((p) => p.id === "initial-01").priceBasis,
    "exchange_difference",
  );
  assert.equal(
    seedProperties.find((p) => p.id === "initial-07").priceBasis,
    "unit_monthly",
  );
  assert.equal(seedProperties.find((p) => p.id === "initial-09").area, null);
  assert.ok(seedProperties.every((p) => p.status === "reference"));
});
test("password salt is unique, password verifies and wrong password fails", async () => {
  const a = await passwordHash("Test-password-001"),
    b = await passwordHash("Test-password-001");
  assert.notEqual(a, b);
  assert.equal(await passwordValid("Test-password-001", a), true);
  assert.equal(await passwordValid("wrong", a), false);
});
test("secret vault rejects a wrong key and altered ciphertext", () => {
  const raw = seal({ key: "synthetic-key" }, "test-vault");
  assert.deepEqual(unseal(raw, "test-vault"), { key: "synthetic-key" });
  assert.throws(() => unseal(raw, "wrong"));
  assert.throws(() => unseal(raw.slice(0, -4) + "AAAA", "test-vault"));
});
test("image signature blocks markup disguised as a raster image", () => {
  assert.equal(
    isRaster(Buffer.from('<svg onload="bad">'), "image/jpeg"),
    false,
  );
  assert.equal(isRaster(Buffer.from([255, 216, 255, 224]), "image/jpeg"), true);
});
