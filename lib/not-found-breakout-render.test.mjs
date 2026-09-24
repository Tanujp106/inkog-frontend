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

test("derives restrained color stages from game energy", async () => {
  const breakout = await import("./not-found-breakout.mjs");
  const calm = breakout.createInitialBreakoutState();
  const activeBall = { ...calm.ball, isActive: true };
  const multiBall = {
    ...calm,
    balls: [
      activeBall,
      { ...calm.ball, id: "ball-1", isActive: true },
    ],
    ball: activeBall,
  };
  const highEnergy = { ...multiBall, combo: 8 };

  assert.equal(typeof renderHelpers.getBreakoutColorStage, "function");
  assert.equal(renderHelpers.getBreakoutColorStage(0, "#2f7d50").name, "signal");
  assert.equal(renderHelpers.getBreakoutColorStage(1, "#2f7d50").name, "cyan");
  assert.equal(renderHelpers.getBreakoutColorStage(2, "#2f7d50").name, "amber");
  assert.equal(renderHelpers.getBreakoutColorStage(3, "#2f7d50").name, "magenta");
  assert.equal(breakout.getBreakoutEnergyLevel(calm), 0);
  assert.equal(breakout.getBreakoutEnergyLevel(multiBall), 1);
  assert.equal(breakout.getBreakoutEnergyLevel(highEnergy), 3);
});
