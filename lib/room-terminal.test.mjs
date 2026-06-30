import assert from "node:assert/strict";
import test from "node:test";

import { parseRoomCommand } from "./room-terminal.mjs";

test("parses plain chat as a message command", () => {
  assert.deepEqual(parseRoomCommand("hello from the room"), {
    type: "message",
    text: "hello from the room",
  });
});

test("rejects a bare poll command and points to inline syntax", () => {
  assert.deepEqual(parseRoomCommand("/poll"), {
    type: "invalid",
    message: "usage: /poll question | option a | option b",
  });
});

test("parses an inline poll command with question and options", () => {
  assert.deepEqual(parseRoomCommand("/poll Where should we go? | Goa | Bali | Sri Lanka"), {
    type: "poll-inline",
    question: "Where should we go?",
    options: ["Goa", "Bali", "Sri Lanka"],
  });
});

test("rejects inline polls with fewer than two options", () => {
  assert.deepEqual(parseRoomCommand("/poll Where should we go? | Goa"), {
    type: "invalid",
    message: "poll needs a question and at least 2 options",
  });
});

test("parses room utility commands", () => {
  assert.deepEqual(parseRoomCommand("/share"), { type: "share" });
  assert.deepEqual(parseRoomCommand("/leave"), { type: "leave" });
  assert.deepEqual(parseRoomCommand("/close"), { type: "close" });
  assert.deepEqual(parseRoomCommand("/help"), { type: "help" });
});
