import assert from "node:assert/strict";
import test from "node:test";

import {
  getRoomStylePrompt,
  resolveRoomStyleSelection,
} from "./room-style-command.mjs";

test("describes the room style prompt choices", () => {
  assert.equal(getRoomStylePrompt(), "style: 1 orange, 2 blue, 3 green, 4 purple, 5 surprise");
});

test("resolves numbered room style choices", () => {
  assert.deepEqual(resolveRoomStyleSelection("4"), {
    ok: true,
    theme: {
      id: "purple",
      label: "purple",
      selection: "4",
    },
    transcriptMessage: "app color changed to purple",
  });
});

test("resolves written number room style choices", () => {
  assert.equal(resolveRoomStyleSelection("four").theme?.id, "purple");
  assert.equal(resolveRoomStyleSelection("two").theme?.id, "blue");
});

test("resolves surprise room style choices", () => {
  assert.equal(resolveRoomStyleSelection("surprise", () => 0.5).theme?.id, "green");
});

test("keeps invalid room style choices local to the command flow", () => {
  assert.deepEqual(resolveRoomStyleSelection("9"), {
    ok: false,
    message: "choose 1, 2, 3, 4, 5, or a theme name",
  });
});
