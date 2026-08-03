import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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

test("keeps one persistent ambient background above both routes", () => {
  const provider = readFileSync(
    new URL("../components/route-handoff-provider.tsx", import.meta.url),
    "utf8",
  );
  const ambient = readFileSync(
    new URL("../components/direction-two-ambient-background.tsx", import.meta.url),
    "utf8",
  );

  assert.equal(
    (provider.match(/<DirectionTwoAmbientBackground \/>/g) ?? []).length,
    1,
    "the persistent route provider should own exactly one ambient background",
  );
  assert.match(ambient, /createDirectionTwoAmbientPixels/);
  assert.match(ambient, /directionTwoAmbientAtmosphere/);
  assert.match(ambient, /<AmbientShaderBackground/);
  assert.match(ambient, /isMobileViewport \? 0\.34 : 0\.43/);
});

test("does not remount ambient visuals inside either route", () => {
  const landing = readFileSync(
    new URL("../components/direction-two-shell.tsx", import.meta.url),
    "utf8",
  );
  const room = readFileSync(new URL("../app/room/[id]/page.tsx", import.meta.url), "utf8");

  for (const route of [landing, room]) {
    assert.doesNotMatch(route, /AmbientShaderBackground/);
    assert.doesNotMatch(route, /createDirectionTwoAmbientPixels/);
    assert.doesNotMatch(route, /direction-two-ambient-glow/);
  }
});
