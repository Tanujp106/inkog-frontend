import assert from "node:assert/strict";
import test from "node:test";

import { getRoomNameTrivia } from "./room-name-trivia.mjs";

test("returns known trivia for room alias names", () => {
  assert.match(getRoomNameTrivia("Dennis Ritchie"), /C and helped build Unix/);
});

test("normalizes duplicate alias suffixes before looking up trivia", () => {
  assert.match(getRoomNameTrivia("Dennis Ritchie 2"), /C and helped build Unix/);
});

test("returns safe fallback trivia for unknown aliases", () => {
  assert.match(getRoomNameTrivia("Mystery Guest"), /computing-history alias set/);
});
