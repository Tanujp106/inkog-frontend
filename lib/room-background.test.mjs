import assert from "node:assert/strict";
import test from "node:test";

import { roomAmbientShaderOpacity, roomThemeBackground } from "./room-background.mjs";

test("keeps the room background tied to the active theme signal color", () => {
  assert.equal(roomThemeBackground.background.includes("gradient"), true);
  assert.equal(roomThemeBackground.background.includes("var(--color-signal-dim)"), true);
  assert.equal(roomThemeBackground.background.includes("var(--color-signal-glow)"), true);
  assert.equal(roomThemeBackground.background.includes("rgba(200, 255, 87"), false);
  assert.equal(roomThemeBackground.background.includes("#c8ff57"), false);
});

test("keeps the room background anchored to the shared shell surface", () => {
  assert.equal(roomThemeBackground.baseColor, "var(--bg)");
  assert.equal(roomThemeBackground.blendMode, "screen");
});

test("keeps the room background subdued behind transcript text", () => {
  assert.equal(roomThemeBackground.background.includes("5.6%"), false);
  assert.equal(roomThemeBackground.background.includes("3%"), false);
  assert.equal(roomThemeBackground.background.includes("color-mix(in srgb, var(--color-signal-glow) 62%"), false);
  assert.ok(roomAmbientShaderOpacity < 0.3);
});
