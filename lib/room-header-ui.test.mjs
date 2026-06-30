import assert from "node:assert/strict";
import test from "node:test";

import {
  formatRoomCountdown,
  getRoomRoster,
} from "./room-header-ui.mjs";

test("formats the room countdown as mm:ss", () => {
  assert.equal(formatRoomCountdown(0), "00:00");
  assert.equal(formatRoomCountdown(9), "00:09");
  assert.equal(formatRoomCountdown(74), "01:14");
  assert.equal(formatRoomCountdown(3434), "57:14");
  assert.equal(formatRoomCountdown(3661), "61:01");
});

test("builds avatar roster items with initials and overflow", () => {
  assert.deepEqual(
    getRoomRoster(["Happy Potato", "Eager Nacho", "goa", "A", "Blue Mango"]),
    {
      overflow: 1,
      visible: [
        { alias: "Happy Potato", initials: "HP" },
        { alias: "Eager Nacho", initials: "EN" },
        { alias: "goa", initials: "GO" },
        { alias: "A", initials: "A" },
      ],
    },
  );
});
