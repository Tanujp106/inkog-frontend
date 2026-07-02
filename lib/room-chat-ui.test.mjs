import assert from "node:assert/strict";
import test from "node:test";

import { buildRoomPeerColorMap, classifyRoomMessage } from "./room-chat-ui.mjs";

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

test("builds distinct peer colors for the current viewer", () => {
  const colors = buildRoomPeerColorMap(["tanuj", "friend", "teammate", "system", "friend"], "tanuj");

  assert.equal(colors.tanuj, undefined);
  assert.equal(colors.system, undefined);
  assert.ok(colors.friend);
  assert.ok(colors.teammate);
  assert.notEqual(colors.friend, colors.teammate);
});

test("uses the viewer alias when assigning peer colors", () => {
  const tanujColors = buildRoomPeerColorMap(["alice", "bella"], "tanuj");
  const friendColors = buildRoomPeerColorMap(["alice", "bella"], "friend");

  assert.notDeepEqual(tanujColors, friendColors);
});
