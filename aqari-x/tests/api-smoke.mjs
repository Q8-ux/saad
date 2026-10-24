import { createInterface } from "node:readline";
import { randomBytes } from "node:crypto";
import { writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const rl = createInterface({
  input: process.stdin,
  output: undefined,
  terminal: false,
});
console.log("Ready for isolated QA configuration on stdin");
const cfg = JSON.parse(await new Promise((r) => rl.once("line", r)));
rl.close();
const suffix = randomBytes(5).toString("hex"),
  password = "Qa-" + randomBytes(18).toString("hex");
let count = 0;
const reports = [];
async function check(name, fn) {
  try {
    await fn();
    count++;
    reports.push({ name, passed: true });
    console.log("PASS " + name);
  } catch (e) {
    reports.push({ name, passed: false, error: e.message });
    console.error("FAIL " + name + ": " + e.message);
    await writeFile(
      "tests/api-results.json",
      JSON.stringify({ scope: "isolated QA branch", tests: reports }, null, 2),
    );
    throw e;
  }
}
async function call(path, method = "GET", data, token) {
  const r = await fetch(cfg.base + path, {
    method,
    headers: {
      ...(data ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: "Bearer " + token } : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
    signal: AbortSignal.timeout(45000),
  });
  const out = await r.json().catch(() => ({}));
  return { ...out, status: r.status, bodyStatus: out.status };
}
let admin, owner, other, buyer, propertyId, appointmentId, commissionId;
await check("durable API health and nine supplied listings", async () => {
  assert.equal((await call("/health")).ok, true);
  const r = await call("/properties");
  assert.equal(r.status, 200);
  assert.equal(r.properties.length, 9);
  assert.ok(r.properties.every((p) => p.status === "reference"));
  assert.ok(
    r.properties.every((p) => !("contact" in p) && !("brokerEmail" in p)),
  );
});
await check(
  "unauthenticated and invented sessions cannot access administration",
  async () => {
    assert.equal((await call("/admin/overview")).status, 401);
    assert.equal(
      (await call("/admin/overview", "GET", undefined, "a".repeat(64))).status,
      401,
    );
  },
);
await check(
  "one-time admin setup verifies a secret and cannot run twice",
  async () => {
    const b = {
      name: "مدير فحص معزول",
      email: `qa-admin-${suffix}@example.invalid`,
      phone: "96550000001",
      password,
    };
    assert.equal(
      (await call("/auth/setup", "POST", { ...b, setupToken: "wrong" })).status,
      403,
    );
    if (cfg.adminToken) {
      admin = cfg.adminToken;
      assert.equal(
        (await call("/auth/me", "GET", undefined, admin)).user.role,
        "admin",
      );
    } else {
      const r = await call("/auth/setup", "POST", {
        ...b,
        setupToken: cfg.setupToken,
      });
      assert.equal(r.status, 201);
      admin = r.token;
    }
    assert.equal(
      (await call("/auth/setup", "POST", { ...b, setupToken: cfg.setupToken }))
        .status,
      409,
    );
  },
);
await check("new accounts cannot self-grant the admin role", async () => {
  const r = await call("/auth/register", "POST", {
    name: "حساب صلاحيات فحص",
    email: `qa-buyer-${suffix}@example.invalid`,
    phone: "96550000002",
    password,
    role: "admin",
  });
  assert.equal(r.status, 201);
  assert.equal(r.user.role, "buyer");
  buyer = r.token;
  assert.equal(
    (await call("/admin/overview", "GET", undefined, buyer)).status,
    403,
  );
});
await check(
  "owner accounts require a real password and isolated server session",
  async () => {
    for (const [n, phone] of [
      ["owner", "96550000003"],
      ["other", "96550000004"],
    ]) {
      const r = await call("/auth/register", "POST", {
        name: "حساب فحص " + n,
        email: `qa-${n}-${suffix}@example.invalid`,
        phone,
        password,
        role: "owner",
      });
      assert.equal(r.status, 201);
      if (n === "owner") owner = r.token;
      else other = r.token;
    }
    assert.equal(
      (
        await call("/auth/login", "POST", {
          email: `qa-owner-${suffix}@example.invalid`,
          password: "wrong",
        })
      ).status,
      401,
    );
    assert.equal(
      (await call("/auth/me", "GET", undefined, owner)).user.role,
      "owner",
    );
  },
);
const listing = {
  title: `عقار اختبار آلي معزول ${suffix}`,
  category: "للبيع",
  type: "بيت",
  location: "الجابرية",
  governorate: "حولي",
  price: "250000.125",
  priceBasis: "total",
  bedrooms: 3,
  bathrooms: 2,
  area: 120,
  description: "بيانات اصطناعية للفحص في بيئة معزولة فقط",
  features: ["زاوية"],
  status: "active",
  commissionPaid: true,
};
await check(
  "submission is pending even if browser requests publication",
  async () => {
    const r = await call("/properties", "POST", listing, owner);
    assert.equal(r.status, 201);
    propertyId = r.id;
    assert.equal(r.status, 201);
    assert.equal(
      (await call("/properties/" + propertyId, "GET", undefined, owner))
        .property.status,
      "pending",
    );
    assert.equal(
      (await call("/properties")).properties.some((p) => p.id === propertyId),
      false,
    );
  },
);
await check(
  "pending property is not public and another owner cannot modify it",
  async () => {
    assert.equal((await call("/properties/" + propertyId)).status, 401);
    assert.equal(
      (await call("/properties/" + propertyId, "PATCH", listing, other)).status,
      403,
    );
    assert.equal(
      (await call("/properties/" + propertyId, "DELETE", undefined, other))
        .status,
      403,
    );
  },
);
await check(
  "extra KWD decimal precision and duplicate submissions fail",
  async () => {
    assert.equal(
      (
        await call(
          "/properties",
          "POST",
          { ...listing, title: "bad precision", price: "1.0001" },
          owner,
        )
      ).status,
      400,
    );
    assert.equal(
      (await call("/properties", "POST", listing, owner)).status,
      409,
    );
  },
);
let imageId;
await check(
  "fake image bytes are rejected; private images require permission",
  async () => {
    assert.equal(
      (
        await call(
          "/files",
          "POST",
          {
            propertyId,
            name: "test.jpg",
            mime: "image/jpeg",
            content: Buffer.from("<svg onload=alert(1)>").toString("base64"),
          },
          owner,
        )
      ).status,
      400,
    );
    const r = await call(
      "/files",
      "POST",
      {
        propertyId,
        name: "qa.png",
        mime: "image/png",
        content:
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j7XkAAAAASUVORK5CYII=",
      },
      owner,
    );
    assert.equal(r.status, 201);
    imageId = r.id;
    const im = await fetch(cfg.base + "/images/" + imageId);
    assert.equal(im.status, 401);
  },
);
await check(
  "only admin can approve a property and approved image becomes public",
  async () => {
    assert.equal(
      (
        await call(
          "/admin/properties/" + propertyId + "/status",
          "POST",
          { status: "active" },
          owner,
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await call(
          "/admin/properties/" + propertyId + "/status",
          "POST",
          { status: "active" },
          admin,
        )
      ).status,
      200,
    );
    assert.equal(
      (await call("/properties/" + propertyId)).property.status,
      "active",
    );
    const im = await fetch(cfg.base + "/images/" + imageId);
    assert.equal(im.status, 200);
    assert.equal(im.headers.get("content-type"), "image/png");
  },
);
await check(
  "requests persist centrally and match only known prices within budget",
  async () => {
    const r = await call(
      "/requests",
      "POST",
      {
        category: "للإيجار",
        type: "شقة",
        area: "الجابرية",
        maxPrice: "450",
        bedrooms: 3,
        consent: true,
      },
      buyer,
    );
    assert.equal(r.status, 201);
    assert.equal(r.matches.length, 1);
    assert.equal(r.matches[0].id, "initial-08");
    assert.equal(
      (await call("/requests", "GET", undefined, buyer)).requests.length,
      1,
    );
    assert.equal(
      (await call("/admin/requests", "GET", undefined, buyer)).status,
      403,
    );
  },
);
await check(
  "booking is blocked until office enables a real schedule",
  async () => {
    assert.equal((await call("/slots")).slots.length, 0);
    assert.equal(
      (
        await call(
          "/appointments",
          "POST",
          { slot: new Date(Date.now() + 86400000).toISOString() },
          buyer,
        )
      ).status,
      409,
    );
    const r = await call(
      "/admin/settings",
      "PUT",
      {
        scheduleEnabled: true,
        scheduleDays: [0, 1, 2, 3, 4, 5, 6],
        scheduleStart: "00:00",
        scheduleEnd: "23:30",
        slotMinutes: 30,
      },
      admin,
    );
    assert.equal(r.status, 200);
  },
);
let bookedSlot;
await check(
  "simultaneous booking admits exactly one request per slot",
  async () => {
    bookedSlot = (await call("/slots")).slots[0];
    assert.ok(bookedSlot);
    const r = await Promise.all([
      call("/appointments", "POST", { slot: bookedSlot, propertyId }, buyer),
      call("/appointments", "POST", { slot: bookedSlot, propertyId }, other),
    ]);
    assert.deepEqual(r.map((x) => x.status).sort(), [201, 409]);
    appointmentId = r.find((x) => x.status === 201).id;
  },
);
await check(
  "cancellation releases a slot and non-admin cannot change bookings",
  async () => {
    assert.equal(
      (
        await call(
          "/admin/appointments/" + appointmentId,
          "PATCH",
          { status: "cancelled" },
          owner,
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await call(
          "/admin/appointments/" + appointmentId,
          "PATCH",
          { status: "cancelled" },
          admin,
        )
      ).status,
      200,
    );
    assert.ok((await call("/slots")).slots.includes(bookedSlot));
  },
);
await check(
  "commission uses final agreed KWD value and only admin closes a deal",
  async () => {
    const b = {
      propertyId,
      finalPrice: "240000.125",
      mode: "percent",
      value: "2.5",
      agreementRef: "QA-AGREEMENT-" + suffix,
    };
    assert.equal((await call("/admin/close", "POST", b, owner)).status, 403);
    const r = await call("/admin/close", "POST", b, admin);
    assert.equal(r.status, 201);
    assert.equal(r.amountFils, 6000003);
    commissionId = r.id;
    assert.equal((await call("/admin/close", "POST", b, admin)).status, 409);
  },
);
await check(
  "completed deals cannot be edited or deleted by their owner",
  async () => {
    assert.equal(
      (await call("/properties/" + propertyId, "PATCH", listing, owner)).status,
      409,
    );
    assert.equal(
      (await call("/properties/" + propertyId, "DELETE", undefined, owner))
        .status,
      409,
    );
  },
);
await check("collection requires receipt and is idempotent", async () => {
  assert.equal(
    (
      await call(
        "/admin/commissions/" + commissionId + "/settle",
        "POST",
        { receiptRef: "" },
        admin,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await call(
        "/admin/commissions/" + commissionId + "/settle",
        "POST",
        { receiptRef: "QA-RECEIPT-" + suffix },
        admin,
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await call(
        "/admin/commissions/" + commissionId + "/settle",
        "POST",
        { receiptRef: "again" },
        admin,
      )
    ).status,
    409,
  );
});
await check(
  "internal documents cannot be read without admin permission",
  async () => {
    const f = await call(
      "/files",
      "POST",
      {
        name: "qa-private.txt",
        mime: "text/plain",
        content: Buffer.from("QA synthetic private document").toString(
          "base64",
        ),
      },
      admin,
    );
    assert.equal(f.status, 201);
    assert.equal((await fetch(cfg.base + "/files/" + f.id)).status, 401);
    assert.equal(
      (
        await fetch(cfg.base + "/files/" + f.id, {
          headers: { authorization: "Bearer " + buyer },
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await fetch(cfg.base + "/files/" + f.id, {
          headers: { authorization: "Bearer " + admin },
        })
      ).status,
      200,
    );
  },
);
await check(
  "provider secrets are encrypted and never returned to the browser",
  async () => {
    const secret = "synthetic-" + randomBytes(12).toString("hex");
    assert.equal(
      (
        await call(
          "/admin/integrations/ai",
          "PUT",
          { key: secret, model: "synthetic-test-model", enabled: true },
          admin,
        )
      ).status,
      200,
    );
    const r = await call("/admin/integrations", "GET", undefined, admin);
    assert.ok(!JSON.stringify(r).includes(secret));
    assert.equal(r.integrations[0].configured, true);
    assert.equal(
      (await call("/admin/integrations", "GET", undefined, buyer)).status,
      403,
    );
  },
);
await check(
  "zero AI budget rejects work before any upstream model call",
  async () => {
    assert.equal(
      (await call("/admin/settings", "PUT", { aiDailyLimit: 0 }, admin)).status,
      200,
    );
    assert.equal(
      (await call("/admin/ai/draft", "POST", { text: "synthetic" }, admin))
        .status,
      429,
    );
  },
);
await check(
  "export excludes passwords, sessions and provider secrets",
  async () => {
    const r = await call("/admin/export", "GET", undefined, admin);
    assert.equal(r.status, 200);
    assert.ok(!("users" in r));
    assert.ok(!JSON.stringify(r).includes("password_hash"));
    assert.ok(!("integrations" in r));
  },
);
await check("session revocation is enforced on the server", async () => {
  assert.equal((await call("/auth/logout", "POST", {}, owner)).status, 200);
  assert.equal((await call("/auth/me", "GET", undefined, owner)).status, 401);
});
await writeFile(
  "tests/api-results.json",
  JSON.stringify(
    {
      scope: "isolated QA branch only; production initial data unchanged",
      checkedAt: new Date().toISOString(),
      passed: count,
      failed: 0,
      tests: reports,
    },
    null,
    2,
  ),
);
console.log(`Completed ${count} isolated API checks`);
