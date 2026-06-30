import assert from "node:assert/strict";
import test from "node:test";

import {
  commands,
  completeDirectionTwoCommand,
  getDirectionTwoCreateHint,
  parseDirectionTwoCreateCommand,
  resolveDirectionTwoThemeChoice,
} from "./direction-two-shell.mjs";

test("direction two exposes the supported top-level commands", () => {
  assert.deepEqual(commands, ["create", "join", "help", "clear", "style", "sound"]);
});

test("autocompletes the style command from a partial input", () => {
  assert.equal(completeDirectionTwoCommand("st"), "style");
  assert.equal(completeDirectionTwoCommand("/st"), "/style");
});

test("suggests the next inline create field while typing", () => {
  assert.equal(getDirectionTwoCreateHint("create"), "write the title of the room");
  assert.equal(getDirectionTwoCreateHint("create Goa December"), "add minutes");
  assert.equal(getDirectionTwoCreateHint("create Goa December 60"), "add members");
  assert.equal(getDirectionTwoCreateHint("create Goa December 60 8"), "add password or no");
  assert.equal(getDirectionTwoCreateHint("join abc123"), null);
});

test("parses a complete inline create command with a multi-word title", () => {
  assert.deepEqual(parseDirectionTwoCreateCommand("create Goa December 60 8 no"), {
    status: "ready",
    draft: {
      topic: "Goa December",
      expiry: 60,
      roomLimit: 8,
      password: "",
    },
  });
});

test("parses quoted inline create fields", () => {
  assert.deepEqual(parseDirectionTwoCreateCommand('create "Dinner vote" 45 4 "green room"'), {
    status: "ready",
    draft: {
      topic: "Dinner vote",
      expiry: 45,
      roomLimit: 4,
      password: "green room",
    },
  });
});

test("returns the next create step when the inline command is partial", () => {
  assert.deepEqual(parseDirectionTwoCreateCommand("create Goa December 60"), {
    status: "partial",
    nextStep: "limit",
    draft: {
      topic: "Goa December",
      expiry: 60,
      roomLimit: 10,
      password: "",
    },
  });

  assert.deepEqual(parseDirectionTwoCreateCommand("create Goa December 60 8"), {
    status: "partial",
    nextStep: "password-choice",
    draft: {
      topic: "Goa December",
      expiry: 60,
      roomLimit: 8,
      password: "",
    },
  });
});

test("rejects invalid inline create timing and member limits", () => {
  assert.deepEqual(parseDirectionTwoCreateCommand("create Goa 10 8 no"), {
    status: "invalid",
    message: "expiry must be 15 minutes or more",
  });

  assert.deepEqual(parseDirectionTwoCreateCommand("create Goa 60 40 no"), {
    status: "invalid",
    message: "member limit must be a whole number from 1 to 30",
  });
});

test("resolves direct numbered theme choices", () => {
  assert.deepEqual(resolveDirectionTwoThemeChoice("1"), {
    id: "orange",
    label: "orange",
    selection: "1",
  });
  assert.deepEqual(resolveDirectionTwoThemeChoice("4"), {
    id: "purple",
    label: "purple",
    selection: "4",
  });
});

test("resolves surprise me with injected randomness", () => {
  assert.deepEqual(resolveDirectionTwoThemeChoice("5", () => 0.74), {
    id: "green",
    label: "green",
    selection: "3",
  });
});

test("rejects unsupported theme choices", () => {
  assert.equal(resolveDirectionTwoThemeChoice("0"), null);
  assert.equal(resolveDirectionTwoThemeChoice("orange"), null);
});
