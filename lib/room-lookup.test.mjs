import assert from "node:assert/strict";
import test from "node:test";

import {
  isValidRoomId,
  parseRoomId,
  resolveRoomAccessFailureStage,
  resolveRoomLookupOutcome,
} from "./room-lookup.mjs";

test("accepts only six-character alphanumeric room ids", () => {
  assert.equal(isValidRoomId("abc123"), true);
  assert.equal(isValidRoomId("QUI74E"), true);
  assert.equal(isValidRoomId("randomid123"), false);
  assert.equal(isValidRoomId("abc"), false);
  assert.equal(isValidRoomId(""), false);
  assert.equal(isValidRoomId(null), false);
});

test("parses bare ids and shared room links with trailing slashes, query, or fragment", () => {
  for (const [value, expected] of [
    ["abc123", "abc123"],
    ["  abc123  ", "abc123"],
    ["https://inkog.chat/room/abc123", "abc123"],
    ["https://inkog.chat/room/abc123/?source=invite#join", "abc123"],
    ["/room/QUI74E/?source=invite", "QUI74E"],
  ]) {
    assert.equal(parseRoomId(value), expected);
  }
});

test("rejects unrelated URLs and malformed room paths", () => {
  for (const value of [
    "https://inkog.chat/other/abc123",
    "https://inkog.chat/room/abc123xyz",
    "https://inkog.chat/room/abc123/more",
    "not a room link",
    "",
    null,
  ]) {
    assert.equal(parseRoomId(value), null);
  }
});

test("treats missing rooms as expired instead of a generic error", () => {
  assert.deepEqual(
    resolveRoomLookupOutcome({ ok: false, status: 404 }),
    { stage: "expired" },
  );
});

test("treats gone rooms (410) as expired", () => {
  assert.deepEqual(
    resolveRoomLookupOutcome({ ok: false, status: 410 }),
    { stage: "expired" },
  );
});

test("keeps other lookup failures as errors", () => {
  assert.deepEqual(
    resolveRoomLookupOutcome({ ok: false, status: 500 }),
    { stage: "error", message: "We couldn't load this room. Try opening it again." },
  );
});

test("treats zero or negative TTL as expired", () => {
  assert.deepEqual(
    resolveRoomLookupOutcome({ ok: true, status: 200, secondsLeft: 0 }),
    { stage: "expired" },
  );
  assert.deepEqual(
    resolveRoomLookupOutcome({ ok: true, status: 200, secondsLeft: -1 }),
    { stage: "expired" },
  );
});

test("continues boot when the room is still live", () => {
  assert.deepEqual(
    resolveRoomLookupOutcome({ ok: true, status: 200, secondsLeft: 120 }),
    { stage: "ready" },
  );
});

test("maps join/access 404 and 410 to expired", () => {
  assert.equal(resolveRoomAccessFailureStage(404), "expired");
  assert.equal(resolveRoomAccessFailureStage(410), "expired");
  assert.equal(resolveRoomAccessFailureStage(403), "error");
  assert.equal(resolveRoomAccessFailureStage(undefined), "error");
});

test("room page boots through the shared lookup helpers", async () => {
  const { readFile } = await import("node:fs/promises");
  const page = await readFile(new URL("../app/room/[id]/page.tsx", import.meta.url), "utf8");
  assert.match(page, /isValidRoomId\(roomId\)/);
  assert.match(page, /resolveRoomLookupOutcome\(/);
  assert.match(page, /resolveRoomAccessFailureStage\(/);
  assert.doesNotMatch(page, /setErrorMsg\("Room not found\."\)/);
  assert.match(page, /roomData\.hasPassword && !storedToken[\s\S]*router\.replace\(`\/\?join=\$\{encodeURIComponent\(roomId\)\}`\)/);
  assert.match(page, /clearStoredToken\(roomId\)[\s\S]*router\.replace\(`\/\?join=\$\{encodeURIComponent\(roomId\)\}`\)/);
});

test("homepage shared-link join uses inline password entry and stores the returned token", async () => {
  const { readFile } = await import("node:fs/promises");
  const home = await readFile(new URL("../components/direction-two-shell.tsx", import.meta.url), "utf8");

  assert.match(home, /get\("join"\)[\s\S]*setFlow\(\{ type: "join", step: "room" \}\)[\s\S]*openRoom\(id, `\/join \/ \$\{id\}`\)/);
  assert.match(home, /if \(roomData\.hasPassword && !getStoredToken\(id\)\)/);
  assert.match(home, /step: "password"/);
  assert.match(home, /password required to join/);
  assert.match(home, /rooms\/\$\{joinFlow\.roomId\}\/join[\s\S]*JSON\.stringify\(\{ password \}\)[\s\S]*setStoredToken\(joinFlow\.roomId, joinData\.anonToken\)/);
  assert.match(home, /flow\.step === "password"\) \{\s*void submitJoinPassword\(flow, rawAnswer\)/);
});
