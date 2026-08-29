import assert from "node:assert/strict";
import test from "node:test";

import { toD1LikePattern } from "../lib/d1-like.ts";

test("accepts a LIKE pattern within D1's UTF-8 byte limit", () => {
  const pattern = toD1LikePattern("أصل العقد");
  assert.equal(pattern, "%أصل العقد%");
  assert.ok(Buffer.byteLength(pattern, "utf8") <= 50);
});

test("rejects a long Arabic phrase before D1 executes it", () => {
  assert.equal(toD1LikePattern("إلزام الخصم بتقديم أصل العقد"), null);
});

test("escapes LIKE wildcard characters", () => {
  assert.equal(toD1LikePattern("100%_صحيح"), "%100\\%\\_صحيح%");
});

