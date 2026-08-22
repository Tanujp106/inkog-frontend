import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  formatRoomCountdown,
  getRoomTtlMeter,
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

test("builds ttl meter state from remaining and total seconds", () => {
  assert.deepEqual(
    getRoomTtlMeter({ secondsLeft: 75, totalSeconds: 300 }),
    {
      label: "ttl",
      time: "01:15",
      percent: 25,
      warning: true,
      marker: "!",
    },
  );
});

test("keeps ttl meter full when total seconds are missing", () => {
  assert.deepEqual(
    getRoomTtlMeter({ secondsLeft: 120, totalSeconds: 0 }),
    {
      label: "ttl",
      time: "02:00",
      percent: 100,
      warning: true,
      marker: "!",
    },
  );
});

test("adds a top-bar share button with a one-second copied state", async () => {
  const source = await readFile(new URL("../app/room/[id]/page.tsx", import.meta.url), "utf8");

  assert.match(source, /const \[shareCopied, setShareCopied\] = useState\(false\);/);
  assert.match(source, /shareCopied \? "copied!" : "share"/);
  assert.match(source, /shareCopiedTimeoutRef\.current = setTimeout\(\(\) => \{[\s\S]*setShareCopied\(false\);[\s\S]*\}, 1000\);/);
  assert.match(source, /const copyShareLinkFromButton = async \(\) =>/);
  assert.match(source, /onClick=\{\(\) => void copyShareLinkFromButton\(\)\}/);
  assert.match(source, /if \(command === "\/share"\) \{\s*void copyShareLink\(\);/);
});
