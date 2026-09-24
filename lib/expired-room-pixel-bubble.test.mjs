import assert from "node:assert/strict";
import test from "node:test";

import {
  buildExpiredRoomPixelCells,
  expiredRoomPixelBubbleMotion,
  expiredRoomPixelBubblePattern,
  getExpiredRoomPixelPhase,
} from "./expired-room-pixel-bubble.mjs";

test("builds a deterministic reference-style pixel speech bubble", () => {
  const cells = buildExpiredRoomPixelCells();

  assert.equal(expiredRoomPixelBubblePattern.length, 13);
  assert.ok(expiredRoomPixelBubblePattern.every(row => row.length === 16));
  assert.equal(cells.length, 83);
  assert.equal(new Set(cells.map(cell => cell.id)).size, cells.length);
  assert.ok(cells.some(cell => cell.role === "tail"));
  assert.ok(cells.every(cell => ["shell", "tail"].includes(cell.role)));
  assert.ok(cells.filter(cell => cell.role === "tail").every(cell => cell.row >= 10));
  assert.equal(expiredRoomPixelBubblePattern[0], "0111111111111110");
  assert.equal(expiredRoomPixelBubblePattern[8], "1100000000000011");
  assert.equal(expiredRoomPixelBubblePattern[9], "0110001111111110");
  assert.equal(expiredRoomPixelBubblePattern[10], "0010011111111100");
  assert.equal(expiredRoomPixelBubblePattern[11], "0010100000000000");
  assert.equal(expiredRoomPixelBubblePattern[12], "0011000000000000");
  assert.ok(cells.every(cell => Number.isFinite(cell.dropX) && Number.isFinite(cell.dropY)));
  assert.deepEqual(buildExpiredRoomPixelCells(), cells);
});

test("holds, fractures, drops, and settles without an interaction phase", () => {
  const { holdMs, fractureMs, fallMs, settleMs } = expiredRoomPixelBubbleMotion;

  assert.equal(getExpiredRoomPixelPhase(0), "present");
  assert.equal(getExpiredRoomPixelPhase(holdMs - 1), "present");
  assert.equal(getExpiredRoomPixelPhase(holdMs), "fracturing");
  assert.equal(getExpiredRoomPixelPhase(holdMs + fractureMs), "falling");
  assert.equal(getExpiredRoomPixelPhase(holdMs + fractureMs + fallMs), "settling");
  assert.equal(
    getExpiredRoomPixelPhase(holdMs + fractureMs + fallMs + settleMs),
    "interactive",
  );
  assert.equal(getExpiredRoomPixelPhase(0, true), "interactive");
});
