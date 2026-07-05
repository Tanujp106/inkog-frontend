import assert from "node:assert/strict";
import test from "node:test";

import {
  buildRoomGateTranscriptLines,
  buildRoomPeerColorMap,
  classifyRoomMessage,
  resolveRoomStageAfterAuthenticatedJoin,
} from "./room-chat-ui.mjs";

test("classifies my message as an inline command-style line", () => {
  assert.deepEqual(
    classifyRoomMessage(
      { alias: "tanuj", content: "hello", createdAt: "2026-06-28T00:00:00.000Z" },
      "tanuj",
    ),
    {
      align: "left",
      kind: "outgoing",
      prefix: "tanuj (you):",
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

test("uses a calmer theme-aware peer palette for blue rooms", () => {
  const colors = buildRoomPeerColorMap(["tanuj", "friend", "teammate"], "tanuj", "blue");

  assert.deepEqual(Object.values(colors), ["#8ca8c7", "#b59a7a"]);
  assert.equal(Object.values(colors).includes("#5eead4"), false);
});

test("builds password gate transcript copy inside the chat shell", () => {
  assert.deepEqual(buildRoomGateTranscriptLines({ topic: "Dinner vote", state: "locked" }), [
    "system: welcome to Dinner vote",
    "system: write password below to enter chat",
  ]);
});

test("builds unlock transcript copy with a separator before chat", () => {
  assert.deepEqual(buildRoomGateTranscriptLines({ topic: "Dinner vote", state: "unlocked" }), [
    "system: welcome to Dinner vote",
    "system: password accepted",
    "--------",
  ]);
});

test("enters the chat shell after REST join before socket acknowledgement", () => {
  assert.equal(resolveRoomStageAfterAuthenticatedJoin(), "joined");
});

test("does not export a fullscreen loading transcript for the room shell", async () => {
  const roomChatUi = await import("./room-chat-ui.mjs");

  assert.equal("buildRoomLoadingTranscriptLines" in roomChatUi, false);
});
