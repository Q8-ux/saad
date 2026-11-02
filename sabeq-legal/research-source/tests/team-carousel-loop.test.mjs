import test from "node:test";
import assert from "node:assert/strict";
import { centeredTeamOffset } from "../app/team-carousel-loop.mjs";

test("scrolling through either copy preserves the same fractional visual position", () => {
  for (const [position, expected] of [[0, 100], [95, 195], [100, 100], [150.25, 150.25], [200, 100], [295, 195], [-5, 195], [-205, 195], [1000025, 125]]) {
    assert.equal(centeredTeamOffset(position, 100), expected);
  }
});

test("resize keeps the same card progress across different responsive widths", () => {
  const oldPeriod = 3986.625;
  const newPeriod = 2714.5;
  const progress = (centeredTeamOffset(oldPeriod * 2.35, oldPeriod) - oldPeriod) / oldPeriod;
  const resized = newPeriod * (1 + progress);
  assert.ok(Math.abs(resized - newPeriod * 1.35) < 0.000001);
});

test("missing or invalid layout measurements never introduce a new invalid scroll position", () => {
  assert.equal(centeredTeamOffset(17, 0), 17);
  assert.equal(centeredTeamOffset(17, -1), 17);
  assert.equal(centeredTeamOffset(17, Infinity), 17);
});
