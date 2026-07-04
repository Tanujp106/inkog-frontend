import assert from "node:assert/strict";
import test from "node:test";

import {
  buildRoomOgDescription,
  buildRoomOgImagePath,
  buildRoomOgTitle,
  formatRoomOgPasswordLabel,
  normalizeRoomOgTopic,
} from "./room-og.mjs";

test("normalizes room topics for metadata and image text", () => {
  assert.equal(normalizeRoomOgTopic("  Dinner vote  "), "Dinner vote");
  assert.equal(normalizeRoomOgTopic(""), "Private room");
  assert.equal(normalizeRoomOgTopic("   "), "Private room");
  assert.equal(
    normalizeRoomOgTopic("a".repeat(96)),
    `${"a".repeat(69)}...`,
  );
});

test("formats room password state for the dynamic OG frame", () => {
  assert.equal(formatRoomOgPasswordLabel(true), "password protected");
  assert.equal(formatRoomOgPasswordLabel(false), "no password");
});

test("builds room-specific metadata copy", () => {
  assert.equal(buildRoomOgTitle("Dinner vote"), "Dinner vote - Inkog room");
  assert.equal(
    buildRoomOgDescription({ hasPassword: true, secondsLeft: 3600 }),
    "Join this password protected honest chat before it disappears.",
  );
  assert.equal(
    buildRoomOgDescription({ hasPassword: false, secondsLeft: -1 }),
    "This Inkog room has expired.",
  );
});

test("builds the route-local dynamic OG image path", () => {
  assert.equal(buildRoomOgImagePath("abc123"), "/room/abc123/og-image.gif");
  assert.equal(buildRoomOgImagePath("room with spaces"), "/room/room%20with%20spaces/og-image.gif");
});
