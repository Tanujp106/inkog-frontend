import assert from "node:assert/strict";
import test from "node:test";

import { classifyRoomMessage } from "./room-chat-ui.mjs";

test("classifies my message as an inline command-style line", () => {
  assert.deepEqual(
    classifyRoomMessage(
      { alias: "tanuj", content: "hello", createdAt: "2026-06-28T00:00:00.000Z" },
      "tanuj",
    ),
    {
      align: "left",
      kind: "outgoing",
      prefix: "$",
      tone: "muted",
    },
  );
});

test("classifies someone else's message as an inline peer line", () => {
  assert.deepEqual(
    classifyRoomMessage(
      { alias: "friend", content: "hey", createdAt: "2026-06-28T00:00:00.000Z" },
      "tanuj",
    ),
    {
      align: "left",
      kind: "incoming",
      tone: "accent",
      prefix: "friend:",
    },
  );
});
