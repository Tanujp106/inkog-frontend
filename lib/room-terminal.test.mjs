import assert from "node:assert/strict";
import test from "node:test";

import { parseRoomCommand } from "./room-terminal.mjs";

test("parses plain chat as a message command", () => {
  assert.deepEqual(parseRoomCommand("hello from the room"), {
    type: "message",
    text: "hello from the room",
  });
});

test("opens the guided room poll flow from a bare poll command", () => {
  assert.deepEqual(parseRoomCommand("/poll"), {
    type: "poll",
    argument: "",
  });
  assert.deepEqual(parseRoomCommand("poll"), {
    type: "poll",
    argument: "",
  });
});

test("parses an inline poll command with question and options", () => {
  assert.deepEqual(parseRoomCommand("/poll Where should we go? | Goa | Bali | Sri Lanka"), {
    type: "poll-inline",
    question: "Where should we go?",
    options: ["Goa", "Bali", "Sri Lanka"],
  });
  assert.deepEqual(parseRoomCommand("poll Where should we go? | Goa | Bali | Sri Lanka"), {
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
  assert.deepEqual(parseRoomCommand("/exit"), { type: "exit" });
  assert.deepEqual(parseRoomCommand("/close"), { type: "close" });
  assert.deepEqual(parseRoomCommand("/help"), { type: "help" });
  assert.deepEqual(parseRoomCommand("/commands"), { type: "commands" });
  assert.deepEqual(parseRoomCommand("/command"), { type: "commands" });
});

test("parses the style command with and without an argument", () => {
  assert.deepEqual(parseRoomCommand("/style"), { type: "style", argument: "" });
  assert.deepEqual(parseRoomCommand("/style 2"), { type: "style", argument: "2" });
  assert.deepEqual(parseRoomCommand("/style blue"), { type: "style", argument: "blue" });
  assert.deepEqual(parseRoomCommand("style"), { type: "style", argument: "" });
  assert.deepEqual(parseRoomCommand("style purple"), { type: "style", argument: "purple" });
});

test("parses bare utility commands so command mode can stay inside the composer", () => {
  assert.deepEqual(parseRoomCommand("help"), { type: "help" });
  assert.deepEqual(parseRoomCommand("commands"), { type: "commands" });
  assert.deepEqual(parseRoomCommand("command"), { type: "commands" });
  assert.deepEqual(parseRoomCommand("leave"), { type: "leave" });
  assert.deepEqual(parseRoomCommand("exit"), { type: "exit" });
});

test("parses help questions as project help requests", () => {
  assert.deepEqual(parseRoomCommand("/help who made inkog?"), {
    type: "help-question",
    question: "who made inkog?",
  });
  assert.deepEqual(parseRoomCommand("help why does inkog look like a terminal?"), {
    type: "help-question",
    question: "why does inkog look like a terminal?",
  });
});
