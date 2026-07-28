import assert from "node:assert/strict";
import test from "node:test";

import { roomAmbientShaderOpacity, roomThemeBackground } from "./room-background.mjs";

test("keeps the room surface free of a room-only background overlay", () => {
  assert.deepEqual(roomThemeBackground, {
    baseColor: "var(--bg)",
    background: "none",
    blendMode: "normal",
  });
});

test("matches the desktop landing ambient shader strength", () => {
  assert.equal(roomAmbientShaderOpacity, 0.43);
});
