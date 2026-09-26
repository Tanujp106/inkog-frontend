import assert from "node:assert/strict";
import test from "node:test";

import {
  buildRoomGateTranscriptLines,
  buildRoomPeerColorMap,
  classifyRoomMessage,
  ROOM_PEER_COLOR_THEMES,
  resolveRoomStageAfterAuthenticatedJoin,
} from "./room-chat-ui.mjs";

function colorContrast(color, background) {
  const [, hueText, saturationText, lightnessText] = color.match(/^hsl\(([\d.]+) ([\d.]+)% ([\d.]+)%\)$/) ?? [];
  assert.ok(hueText, `Expected an HSL peer color, received ${color}`);

  const hue = Number(hueText);
  const saturation = Number(saturationText) / 100;
  const lightness = Number(lightnessText) / 100;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const segment = hue / 60;
  const x = chroma * (1 - Math.abs((segment % 2) - 1));
  const channels = hue < 60 ? [chroma, x, 0]
    : hue < 120 ? [x, chroma, 0]
      : hue < 180 ? [0, chroma, x]
        : hue < 240 ? [0, x, chroma]
          : hue < 300 ? [x, 0, chroma]
            : [chroma, 0, x];
  const foregroundRgb = channels.map(channel => Math.round((channel + lightness - chroma / 2) * 255));
  const backgroundRgb = background.match(/[\da-f]{2}/gi).map(channel => parseInt(channel, 16));
  const luminance = rgb => rgb
    .map(channel => channel / 255)
    .map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
  const foregroundLuminance = luminance(foregroundRgb);
  const backgroundLuminance = luminance(backgroundRgb);

  return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05)
    / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
}

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

test("uses distinct vivid theme-aware peer colors for blue rooms", () => {
  const colors = buildRoomPeerColorMap(["tanuj", "friend", "teammate"], "tanuj", "blue");
  const greenColors = buildRoomPeerColorMap(["tanuj", "friend", "teammate"], "tanuj", "green");

  assert.ok(Object.values(colors).every(color => color.startsWith("hsl(")));
  assert.notDeepEqual(colors, greenColors);
});

test("keeps username colors above WCAG AA contrast across themes and 40 peers", () => {
  const aliases = Array.from({ length: 40 }, (_, index) => `peer-${index + 1}`);

  for (const themeId of Object.keys(ROOM_PEER_COLOR_THEMES)) {
    const colors = buildRoomPeerColorMap(aliases, "viewer", themeId);

    assert.equal(Object.keys(colors).length, aliases.length);
    for (const [alias, color] of Object.entries(colors)) {
      assert.ok(colorContrast(color, "#16161a") >= 4.5, `${themeId} ${alias} has insufficient contrast: ${color}`);
    }
  }
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

test("keeps the room composer unavailable until realtime join succeeds", async () => {
  const roomChatUi = await import("./room-chat-ui.mjs");

  assert.equal(typeof roomChatUi.isRoomComposerInteractive, "function");
  assert.equal(roomChatUi.isRoomComposerInteractive("loading", false), false);
  assert.equal(roomChatUi.isRoomComposerInteractive("joined", false), false);
  assert.equal(roomChatUi.isRoomComposerInteractive("joined", true), true);
  assert.equal(roomChatUi.isRoomComposerInteractive("password", false), true);
});

test("does not export a fullscreen loading transcript for the room shell", async () => {
  const roomChatUi = await import("./room-chat-ui.mjs");

  assert.equal("buildRoomLoadingTranscriptLines" in roomChatUi, false);
});
