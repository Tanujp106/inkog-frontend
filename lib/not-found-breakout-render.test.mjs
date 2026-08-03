import assert from "node:assert/strict";
import test from "node:test";

const renderHelpers = await import("./not-found-breakout-render.mjs").catch(() => ({}));

test("creates an eight-pixel 1200ms idle and waiting bounce", () => {
  assert.equal(typeof renderHelpers.getBreakoutIdleBallOffset, "function");
  assert.equal(renderHelpers.getBreakoutIdleBallOffset(0, "idle", false), 0);
  assert.ok(Math.abs(renderHelpers.getBreakoutIdleBallOffset(300, "idle", false) + 4) < 1e-9);
  assert.equal(renderHelpers.getBreakoutIdleBallOffset(600, "waiting", false), -8);
  assert.equal(renderHelpers.getBreakoutIdleBallOffset(1200, "waiting", false), 0);
});

test("keeps gameplay, cleared, and reduced-motion balls stationary", () => {
  assert.equal(typeof renderHelpers.getBreakoutIdleBallOffset, "function");
  assert.equal(renderHelpers.getBreakoutIdleBallOffset(600, "running", false), 0);
  assert.equal(renderHelpers.getBreakoutIdleBallOffset(600, "cleared", false), 0);
  assert.equal(renderHelpers.getBreakoutIdleBallOffset(600, "idle", true), 0);
});
