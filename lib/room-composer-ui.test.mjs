import assert from "node:assert/strict";
import test from "node:test";

import { getRoomComposerChrome } from "./room-composer-ui.mjs";

test("expands the room composer while the style command is active", () => {
  assert.deepEqual(
    getRoomComposerChrome({
      composerStatus: { tone: "muted", message: "style: 1 orange, 2 blue, 3 green, 4 purple, 5 surprise" },
      pendingCommand: { type: "style" },
    }),
    {
      expanded: true,
      statusMode: "inline",
    },
  );
});

test("collapses the room composer immediately after style selection even if a status message exists", () => {
  assert.deepEqual(
    getRoomComposerChrome({
      composerStatus: { tone: "accent", message: "style set: purple" },
      pendingCommand: null,
    }),
    {
      expanded: false,
      statusMode: "overlay",
    },
  );
});

test("keeps the room composer collapsed during normal chat", () => {
  assert.deepEqual(
    getRoomComposerChrome({
      composerStatus: null,
      pendingCommand: null,
    }),
    {
      expanded: false,
      statusMode: "hidden",
    },
  );
});
