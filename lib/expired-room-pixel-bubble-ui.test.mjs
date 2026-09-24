import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const component = readFileSync(
  new URL("../components/expired-room-pixel-bubble.tsx", import.meta.url),
  "utf8",
);
const page = readFileSync(
  new URL("../app/room/[id]/page.tsx", import.meta.url),
  "utf8",
);
const css = readFileSync(
  new URL("../app/globals.css", import.meta.url),
  "utf8",
);
const physics = readFileSync(
  new URL("./expired-room-pixel-physics.mjs", import.meta.url),
  "utf8",
);

test("mounts the expired room pixel bubble above the terminal state copy", () => {
  assert.match(page, /import \{ ExpiredRoomPixelBubble \} from "@\/components\/expired-room-pixel-bubble"/);
  assert.match(page, /copy="messages are no longer available\."[\s\S]*showPixelBubble/);
  assert.match(page, /title="Room Expired!"/);
});

test("centers the expired state copy and back action", () => {
  assert.match(page, /statePanel: \{[\s\S]*textAlign: "center"/);
});

test("keeps the settled pixels decorative and interaction-free", () => {
  assert.doesNotMatch(component, /applyExpiredRoomPixelHoverForce/);
  assert.doesNotMatch(component, /getExpiredRoomPixelHoverForce/);
  assert.match(component, /window\.requestAnimationFrame\(/);
  assert.doesNotMatch(component, /onPointerMove/);
  assert.doesNotMatch(component, /onPointerLeave/);
  assert.match(component, /data-expired-pixel-phase=\{phase\}/);
  assert.match(css, /\.expired-room-pixel-canvas[\s\S]*pointer-events: none/);
});

test("respects reduced motion and keeps pixel motion compositor-friendly", () => {
  assert.match(component, /prefers-reduced-motion/);
  assert.match(component, /getExpiredRoomPixelSettledCells/);
  assert.match(component, /data-expired-pixel-phase=\{phase\}/);
  assert.match(component, /const pixelSize = 8/);
  assert.match(component, /const pixelGap = 2/);
  assert.match(css, /expired-room-pixel-bubble/);
});

test("uses a real physics world and a single canvas render loop", () => {
  assert.match(component, /createExpiredRoomPixelWorld/);
  assert.match(component, /releaseExpiredRoomPixelBodies/);
  assert.match(component, /destroyExpiredRoomPixelWorld/);
  assert.match(component, /<canvas/);
  assert.match(component, /new ResizeObserver/);
  assert.match(component, /window\.requestAnimationFrame/);
  assert.match(physics, /Engine\.update/);
  assert.match(physics, /stepExpiredRoomPixelWorld/);
});

test("uses the larger chat-bubble stage without changing the terminal copy", () => {
  assert.match(component, /const pixelSize = 8/);
  assert.match(component, /const pixelGap = 2/);
  assert.match(css, /\.expired-room-pixel-bubble\s*\{[\s\S]*height: 168px;[\s\S]*max-width: 300px;/);
  assert.match(css, /\.expired-room-pixel-canvas\s*\{[\s\S]*pointer-events: none;/);
  assert.match(page, /copy="messages are no longer available\."/);
});

test("removes the old per-pixel CSS animation path", () => {
  assert.doesNotMatch(css, /@keyframes expired-room-pixel-fracture/);
  assert.doesNotMatch(css, /@keyframes expired-room-pixel-drop/);
  assert.doesNotMatch(css, /@keyframes expired-room-pixel-impact/);
});
