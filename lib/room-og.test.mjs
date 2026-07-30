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

test("builds static room share metadata without room data", () => {
  assert.equal(buildRoomOgTitle(), "Inkog room invite");
  assert.equal(buildRoomOgDescription(), "Join an anonymous, time-bound chat room on Inkog.");
  assert.equal(buildRoomOgImagePath(), "/og-image.png");
});
