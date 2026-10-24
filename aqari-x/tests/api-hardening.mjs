import { createInterface } from "node:readline";
import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const rl = createInterface({ input: process.stdin, terminal: false });
console.log("Ready for isolated hardening QA on stdin");
const cfg = JSON.parse(await new Promise((r) => rl.once("line", r)));
rl.close();
const suffix = randomBytes(6).toString("hex");
async function call(path, method = "GET", data, token) {
  const r = await fetch(cfg.base + path, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: "Bearer " + token } : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
    signal: AbortSignal.timeout(45000),
  });
  return { ...(await r.json()), http: r.status };
}
const reg = await call("/auth/register", "POST", {
  name: "فحص مراجعة الصور",
  email: `qa-hardening-${suffix}@example.invalid`,
  phone: "96550000006",
  password: randomBytes(20).toString("hex"),
  role: "owner",
});
assert.equal(reg.http, 201);
const owner = reg.token;
const listing = {
  title: "فحص منع التكرار المتزامن " + suffix,
  category: "للبيع",
  type: "بيت",
  location: "الجابرية",
  governorate: "حولي",
  price: "250000",
  priceBasis: "total",
};
const pair = await Promise.all([
  call("/properties", "POST", listing, owner),
  call("/properties", "POST", listing, owner),
]);
assert.deepEqual(pair.map((x) => x.http).sort(), [201, 409]);
const id = pair.find((x) => x.http === 201).id;
console.log("PASS concurrent duplicate submissions admit only one listing");
assert.equal(
  (
    await call(
      "/admin/properties/" + id + "/status",
      "POST",
      { status: "active" },
      cfg.adminToken,
    )
  ).http,
  200,
);
const image = await call(
  "/files",
  "POST",
  {
    propertyId: id,
    name: "qa-photo.png",
    mime: "image/png",
    content:
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j7XkAAAAASUVORK5CYII=",
  },
  owner,
);
assert.equal(image.http, 201);
assert.equal((await call("/properties/" + id)).http, 401);
assert.equal(
  (await call("/properties/" + id, "GET", undefined, owner)).property.status,
  "pending",
);
console.log(
  "PASS changing a published listing image returns it to office review",
);
assert.equal(
  (
    await call(
      "/properties",
      "POST",
      { ...listing, title: "precision " + suffix, price: "1.0001" },
      owner,
    )
  ).http,
  400,
);
console.log(
  "PASS input validation returns a client error instead of a server fault",
);
await call("/properties/" + id, "DELETE", undefined, owner);
const report = JSON.parse(await readFile("tests/api-results.json", "utf8"));
report.hardeningCheckedAt = new Date().toISOString();
for (const name of [
  "concurrent duplicate submissions admit only one listing",
  "changing a published listing image returns it to office review",
  "input validation returns a client error instead of a server fault",
])
  report.tests.push({ name, passed: true });
report.passed += 3;
await writeFile("tests/api-results.json", JSON.stringify(report, null, 2));
console.log("Completed 3 additional hardening checks");
