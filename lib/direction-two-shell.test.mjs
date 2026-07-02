import assert from "node:assert/strict";
import test from "node:test";

import {
  commands,
  completeDirectionTwoCommand,
  completeDirectionTwoCreateField,
  directionTwoCommandReferenceLines,
  getDirectionTwoCreateGhostText,
  getDirectionTwoCreateHint,
  getDirectionTwoCreateAnswerError,
  getDirectionTwoInlineFeedbackMessage,
  getDirectionTwoInlineGhostText,
  getDirectionTwoInlineHint,
  getDirectionTwoCreateEditingStep,
  getDirectionTwoCreatePromptPresentation,
  getDirectionTwoCreateTimeArrowValue,
  getDirectionTwoCreateVisualSegments,
  getDirectionTwoInlinePromptPresentation,
  getDirectionTwoStyleGhostChoices,
  getDirectionTwoCreateInlineInputError,
  isDirectionTwoCreateTimeInputValid,
  parseDirectionTwoInlineCommand,
  parseDirectionTwoCreateCommand,
  resolveDirectionTwoEnterAction,
  resolveDirectionTwoThemeChoice,
} from "./direction-two-shell.mjs";

test("direction two exposes the supported top-level commands", () => {
  assert.deepEqual(commands, ["create", "join", "help", "command", "commands", "clear", "style", "sound"]);
});

test("autocompletes the style command from a partial input", () => {
  assert.equal(completeDirectionTwoCommand("st"), "style");
  assert.equal(completeDirectionTwoCommand("/st"), "/style");
  assert.equal(completeDirectionTwoCommand("comm"), "command");
  assert.equal(completeDirectionTwoCommand("command"), null);
  assert.equal(completeDirectionTwoCommand("commands"), null);
});

test("provides a list-only command and shortcut reference", () => {
  assert.deepEqual(directionTwoCommandReferenceLines, [
    "commands",
    "create / room name / minutes / participants / y/n",
    "join <room code>",
    "style <1-4>",
    "sound on|off|toggle",
    "clear",
    "shortcuts",
    "tab autocomplete",
    "enter submit",
    "arrow up/down history",
    "escape cancel",
  ]);
});

test("suggests the next inline create field while typing", () => {
  assert.equal(getDirectionTwoCreateHint("create"), "what should we call the room?");
  assert.equal(getDirectionTwoCreateHint("create Goa December"), "what should be the total time?");
  assert.equal(getDirectionTwoCreateHint("create Goa December 60"), "maximum participants?");
  assert.equal(getDirectionTwoCreateHint("create Goa December 60 8"), "add password?(y/n)");
  assert.equal(getDirectionTwoCreateHint("create Goa December 60 8 y"), "write password");
  assert.equal(getDirectionTwoCreateHint("create Goa December 60 8 n"), "tap enter to create");
  assert.equal(getDirectionTwoCreateHint("join abc123"), null);
});

test("returns inline create answer errors without formatting transcript output", () => {
  assert.equal(getDirectionTwoCreateAnswerError("topic", ""), "Topic cannot be empty.");
  assert.equal(getDirectionTwoCreateAnswerError("expiry", "1"), "Expiry must be 15 minutes or more.");
  assert.equal(getDirectionTwoCreateAnswerError("limit", "555"), "Member limit must be from 1 to 30.");
  assert.equal(getDirectionTwoCreateAnswerError("password-choice", "maybe"), "Answer y or n.");
  assert.equal(getDirectionTwoCreateAnswerError("password", ""), "Password cannot be empty.");
  assert.equal(getDirectionTwoCreateAnswerError("expiry", "34"), null);
  assert.equal(getDirectionTwoCreateAnswerError("limit", "5"), null);
});

test("shortens validation messages for inline feedback", () => {
  assert.equal(getDirectionTwoInlineFeedbackMessage("Expiry must be 15 minutes or more."), "use 15 minutes or more");
  assert.equal(getDirectionTwoInlineFeedbackMessage("Member limit must be from 1 to 30."), "use 1 to 30");
  assert.equal(getDirectionTwoInlineFeedbackMessage("Total time only accepts numbers."), "numbers only");
  assert.equal(getDirectionTwoInlineFeedbackMessage("Answer y or n."), "answer y or n");
  assert.equal(getDirectionTwoInlineFeedbackMessage("Command not found: nope."), "Command not found: nope");
});

test("builds ghost text for the next inline create field", () => {
  assert.equal(getDirectionTwoCreateGhostText("create"), " / what should we call the room?");
  assert.equal(getDirectionTwoCreateGhostText("create "), "/ what should we call the room?");
  assert.equal(getDirectionTwoCreateGhostText("create Goa December"), " / what should be the total time?");
  assert.equal(getDirectionTwoCreateGhostText("create Goa December 60"), " / maximum participants?");
  assert.equal(getDirectionTwoCreateGhostText("create Goa December 60 8"), " / add password?(y/n)");
  assert.equal(getDirectionTwoCreateGhostText("create Goa December 60 8 y"), " / write password");
  assert.equal(getDirectionTwoCreateGhostText("create Goa December 60 8 n"), " / tap enter to create");
});

test("builds inline hints for command prefixes without leaving the prompt line", () => {
  assert.equal(getDirectionTwoInlineHint("create"), null);
  assert.equal(getDirectionTwoInlineHint("help"), null);
  assert.equal(getDirectionTwoInlineHint("join"), null);
  assert.equal(getDirectionTwoInlineHint("style"), null);
  assert.equal(getDirectionTwoInlineHint("sound"), null);
  assert.equal(getDirectionTwoInlineHint("command"), null);
  assert.equal(getDirectionTwoInlineHint("commands"), null);
  assert.equal(getDirectionTwoInlineHint("clear"), null);
  assert.equal(getDirectionTwoInlineGhostText("help"), null);
  assert.equal(getDirectionTwoInlineGhostText("help / "), "what do you need?");
  assert.equal(getDirectionTwoInlineGhostText("help / create rooms"), null);
  assert.equal(getDirectionTwoInlineGhostText("join / "), "room id or link");
  assert.equal(getDirectionTwoInlineGhostText("style / "), "choose 1-5");
  assert.equal(getDirectionTwoInlineGhostText("sound / "), "on/off/status");
  assert.equal(getDirectionTwoInlineGhostText("command / "), "tap enter to list commands");
  assert.equal(getDirectionTwoInlineGhostText("commands / "), "tap enter to list commands");
  assert.equal(getDirectionTwoInlineGhostText("clear / "), null);
});

test("continues incomplete command prefixes inline on enter", () => {
  assert.deepEqual(resolveDirectionTwoEnterAction("create"), {
    type: "continue-inline",
    value: "create / ",
    hint: "what should we call the room?",
  });
  assert.deepEqual(resolveDirectionTwoEnterAction("create / "), {
    type: "hold-inline",
    hint: "what should we call the room?",
  });
  assert.deepEqual(resolveDirectionTwoEnterAction("create Goa December"), {
    type: "continue-inline",
    value: "create / Goa December / ",
    hint: "what should be the total time?",
  });
  assert.deepEqual(resolveDirectionTwoEnterAction("create / Goa December"), {
    type: "continue-inline",
    value: "create / Goa December / ",
    hint: "what should be the total time?",
  });
  assert.deepEqual(resolveDirectionTwoEnterAction("help"), {
    type: "continue-inline",
    value: "help / ",
    hint: "what do you need?",
  });
  assert.deepEqual(resolveDirectionTwoEnterAction("join"), {
    type: "continue-inline",
    value: "join / ",
    hint: "room id or link",
  });
  assert.deepEqual(resolveDirectionTwoEnterAction("style"), {
    type: "continue-inline",
    value: "style / ",
    hint: "choose 1-5",
  });
  assert.deepEqual(resolveDirectionTwoEnterAction("sound"), {
    type: "continue-inline",
    value: "sound / ",
    hint: "on/off/status",
  });
  assert.deepEqual(resolveDirectionTwoEnterAction("command"), {
    type: "continue-inline",
    value: "command / ",
    hint: "tap enter to list commands",
  });
  assert.deepEqual(resolveDirectionTwoEnterAction("commands"), {
    type: "continue-inline",
    value: "commands / ",
    hint: "tap enter to list commands",
  });
  assert.equal(resolveDirectionTwoEnterAction("create Goa December 60 8 n"), null);
  assert.equal(resolveDirectionTwoEnterAction("help create rooms"), null);
  assert.equal(resolveDirectionTwoEnterAction("style 2"), null);
  assert.equal(resolveDirectionTwoEnterAction("clear"), null);
  assert.equal(resolveDirectionTwoEnterAction("clear / "), null);
  assert.equal(resolveDirectionTwoEnterAction("help / "), null);
});

test("parses slash-delimited arguments for non-create commands", () => {
  assert.deepEqual(parseDirectionTwoInlineCommand("join / abc123"), {
    command: "join",
    argument: "abc123",
    usesSlash: true,
  });
  assert.deepEqual(parseDirectionTwoInlineCommand("style / 2"), {
    command: "style",
    argument: "2",
    usesSlash: true,
  });
  assert.deepEqual(parseDirectionTwoInlineCommand("sound / off"), {
    command: "sound",
    argument: "off",
    usesSlash: true,
  });
  assert.deepEqual(parseDirectionTwoInlineCommand("help / create rooms"), {
    command: "help",
    argument: "create rooms",
    usesSlash: true,
  });
  assert.deepEqual(parseDirectionTwoInlineCommand("commands / "), {
    command: "commands",
    argument: "",
    usesSlash: true,
  });
  assert.deepEqual(parseDirectionTwoInlineCommand("clear / now"), {
    command: "clear",
    argument: "now",
    usesSlash: true,
  });
  assert.equal(parseDirectionTwoInlineCommand("unknown / abc"), null);
});

test("continues slash-delimited create answers between questions", () => {
  assert.equal(getDirectionTwoInlineGhostText("create"), null);
  assert.equal(getDirectionTwoInlineGhostText("create / "), "what should we call the room?");
  assert.equal(getDirectionTwoInlineGhostText("create / h"), null);
  assert.equal(getDirectionTwoInlineGhostText("create / hi sdff room"), null);
  assert.equal(getDirectionTwoInlineGhostText("create / hi sdff room / "), "what should be the total time?");
  assert.deepEqual(resolveDirectionTwoEnterAction("create / hi sdff room"), {
    type: "continue-inline",
    value: "create / hi sdff room / ",
    hint: "what should be the total time?",
  });
  assert.deepEqual(resolveDirectionTwoEnterAction("create / hi sdff room / 60"), {
    type: "continue-inline",
    value: "create / hi sdff room / 60 / ",
    hint: "maximum participants?",
  });
  assert.deepEqual(resolveDirectionTwoEnterAction("create / hi sdff room / 60 / 5"), {
    type: "continue-inline",
    value: "create / hi sdff room / 60 / 5 / ",
    hint: "add password?(y/n)",
  });
});

test("identifies the active slash-delimited create field", () => {
  assert.equal(getDirectionTwoCreateEditingStep("create"), null);
  assert.equal(getDirectionTwoCreateEditingStep("create / "), "topic");
  assert.equal(getDirectionTwoCreateEditingStep("create / hi sdff room"), "topic");
  assert.equal(getDirectionTwoCreateEditingStep("create / hi sdff room / "), "expiry");
  assert.equal(getDirectionTwoCreateEditingStep("create / hi sdff room / 6"), "expiry");
  assert.equal(getDirectionTwoCreateEditingStep("create / hi sdff room / 60 / "), "limit");
  assert.equal(getDirectionTwoCreateEditingStep("help / hi"), null);
});

test("steps slash-delimited create time with arrow keys", () => {
  assert.equal(getDirectionTwoCreateTimeArrowValue("create / hello / 15", "up"), "create / hello / 20");
  assert.equal(getDirectionTwoCreateTimeArrowValue("create / hello / 20", "down"), "create / hello / 15");
  assert.equal(getDirectionTwoCreateTimeArrowValue("create / hello / 15", "down"), "create / hello / 15");
  assert.equal(getDirectionTwoCreateTimeArrowValue("create / hello / ", "up"), null);
  assert.equal(getDirectionTwoCreateTimeArrowValue("create / hello / 1a", "up"), null);
  assert.equal(getDirectionTwoCreateTimeArrowValue("create / hello", "up"), null);
});

test("validates slash-delimited create time text while editing", () => {
  assert.equal(isDirectionTwoCreateTimeInputValid("create / hello / "), true);
  assert.equal(isDirectionTwoCreateTimeInputValid("create / hello / 15"), true);
  assert.equal(isDirectionTwoCreateTimeInputValid("create / hello / a"), false);
  assert.equal(isDirectionTwoCreateTimeInputValid("create / hello / 1a"), false);
  assert.equal(isDirectionTwoCreateTimeInputValid("create / hello / 15 / "), true);
  assert.equal(isDirectionTwoCreateTimeInputValid("create / hello"), true);
});

test("keeps malformed slash-delimited create fields in their positions", () => {
  assert.deepEqual(parseDirectionTwoCreateCommand("create / helll / abc"), {
    status: "invalid",
    message: "expiry must be 15 minutes or more",
  });
  assert.deepEqual(parseDirectionTwoCreateCommand("create / helll / 14"), {
    status: "invalid",
    message: "expiry must be 15 minutes or more",
  });
  assert.deepEqual(parseDirectionTwoCreateCommand("create / helll / 15.5"), {
    status: "invalid",
    message: "expiry must be 15 minutes or more",
  });
  assert.deepEqual(parseDirectionTwoCreateCommand("create / helll / 60 / abc"), {
    status: "invalid",
    message: "member limit must be a whole number from 1 to 30",
  });
  assert.deepEqual(parseDirectionTwoCreateCommand("create / helll / 60 / 31"), {
    status: "invalid",
    message: "member limit must be a whole number from 1 to 30",
  });
  assert.deepEqual(parseDirectionTwoCreateCommand("create / helll / 60 / 5 / maybe"), {
    status: "invalid",
    message: "answer y or n",
  });
});

test("keeps valid slash-delimited create partials in their positions", () => {
  assert.deepEqual(parseDirectionTwoCreateCommand("create / helll / 60"), {
    status: "partial",
    nextStep: "limit",
    draft: {
      topic: "helll",
      expiry: 60,
      roomLimit: 10,
      password: "",
    },
  });
  assert.deepEqual(parseDirectionTwoCreateCommand("create / helll / 60 / 5"), {
    status: "partial",
    nextStep: "password-choice",
    draft: {
      topic: "helll",
      expiry: 60,
      roomLimit: 5,
      password: "",
    },
  });
  assert.deepEqual(parseDirectionTwoCreateCommand("create / helll / 60 / 5 / y"), {
    status: "partial",
    nextStep: "password",
    draft: {
      topic: "helll",
      expiry: 60,
      roomLimit: 5,
      password: "",
    },
  });
  assert.deepEqual(parseDirectionTwoCreateCommand("create / helll / 60 / 5 / y / secret"), {
    status: "ready",
    draft: {
      topic: "helll",
      expiry: 60,
      roomLimit: 5,
      password: "secret",
    },
  });
});

test("validates slash-delimited create input while editing numeric and choice fields", () => {
  assert.equal(isDirectionTwoCreateTimeInputValid("create / helll / 60 / "), true);
  assert.equal(isDirectionTwoCreateTimeInputValid("create / helll / 60 / 5"), true);
  assert.equal(isDirectionTwoCreateTimeInputValid("create / helll / 60 / n"), false);
  assert.equal(isDirectionTwoCreateTimeInputValid("create / helll / 60 / 5a"), false);
  assert.equal(isDirectionTwoCreateTimeInputValid("create / helll / 60 / 5 / "), true);
  assert.equal(isDirectionTwoCreateTimeInputValid("create / helll / 60 / 5 / n"), true);
  assert.equal(isDirectionTwoCreateTimeInputValid("create / helll / 60 / 5 / maybe"), false);
});

test("returns precise inline errors for malformed slash-delimited create input", () => {
  assert.equal(getDirectionTwoCreateInlineInputError("create / helll / abc"), "Total time only accepts numbers.");
  assert.equal(getDirectionTwoCreateInlineInputError("create / helll / 60 / n"), "Member limit only accepts numbers.");
  assert.equal(getDirectionTwoCreateInlineInputError("create / helll / 60 / 5 / maybe"), "Answer y or n.");
  assert.equal(getDirectionTwoCreateInlineInputError("create / helll / 60 / 5 / n"), null);
  assert.equal(getDirectionTwoCreateInlineInputError("style / maybe"), null);
});

test("marks the room name segment for themed inline create rendering", () => {
  assert.deepEqual(getDirectionTwoCreateVisualSegments("create / hello room / 50"), [
    { text: "create / ", tone: "normal" },
    { text: "hello room", tone: "topic" },
    { text: " / 50", tone: "normal" },
  ]);
  assert.equal(getDirectionTwoCreateVisualSegments("create"), null);
  assert.equal(getDirectionTwoCreateVisualSegments("help / hello"), null);
});

test("describes create prompt icons and accent emphasis", () => {
  assertPromptPresentation(getDirectionTwoCreatePromptPresentation("create"), {
    icon: "room",
    tone: "accent",
  });
  assertPromptPresentation(getDirectionTwoCreatePromptPresentation("create Goa December"), {
    icon: "time",
    tone: "muted",
  });
  assertPromptPresentation(getDirectionTwoCreatePromptPresentation("create Goa December 60"), {
    icon: "people",
    tone: "muted",
  });
  assertPromptPresentation(getDirectionTwoCreatePromptPresentation("create Goa December 60 8"), {
    icon: "lock",
    tone: "muted",
  });
  assertPromptPresentation(getDirectionTwoCreatePromptPresentation("create Goa December 60 8 y"), {
    icon: "key",
    tone: "muted",
  });
  assert.equal(getDirectionTwoCreatePromptPresentation("join abc123"), null);
});

test("describes inline command prompt icons", () => {
  assertPromptPresentation(getDirectionTwoInlinePromptPresentation("join / "), {
    icon: "key",
    tone: "muted",
  });
  assertPromptPresentation(getDirectionTwoInlinePromptPresentation("help / "), {
    icon: "help",
    tone: "muted",
  });
  assertPromptPresentation(getDirectionTwoInlinePromptPresentation("style / "), {
    icon: "style",
    tone: "muted",
  });
  assertPromptPresentation(getDirectionTwoInlinePromptPresentation("sound / "), {
    icon: "sound",
    tone: "muted",
  });
  assertPromptPresentation(getDirectionTwoInlinePromptPresentation("commands / "), {
    icon: "list",
    tone: "muted",
  });
  assert.equal(getDirectionTwoInlinePromptPresentation("clear / "), null);
  assert.equal(getDirectionTwoInlinePromptPresentation("join / abc123"), null);
});

test("returns numbered style ghost choices after the slash", () => {
  assert.deepEqual(getDirectionTwoStyleGhostChoices("style / "), [
    { selection: "1", id: "orange", label: "orange" },
    { selection: "2", id: "blue", label: "blue" },
    { selection: "3", id: "green", label: "green" },
    { selection: "4", id: "purple", label: "purple" },
    { selection: "5", id: "surprise", label: "surprise me" },
  ]);
  assert.equal(getDirectionTwoStyleGhostChoices("style"), null);
  assert.equal(getDirectionTwoStyleGhostChoices("style / 2"), null);
  assert.equal(getDirectionTwoStyleGhostChoices("help / "), null);
});

function assertPromptPresentation(actual, expected) {
  assert.equal(actual?.icon, expected.icon);
  assert.equal(actual?.tone, expected.tone);
  assert.ok(Array.isArray(actual?.pattern));
  assert.ok(actual.pattern.length >= 5);
  assert.ok(actual.pattern.every(row => /^[01]+$/.test(row)));
}

test("tab-completes the next inline create field", () => {
  assert.equal(completeDirectionTwoCreateField("create"), 'create "room name"');
  assert.equal(completeDirectionTwoCreateField("create "), 'create "room name"');
  assert.equal(completeDirectionTwoCreateField("create Goa December"), "create Goa December 60");
  assert.equal(completeDirectionTwoCreateField("create Goa December 60"), "create Goa December 60 10");
  assert.equal(completeDirectionTwoCreateField("create Goa December 60 8"), "create Goa December 60 8 n");
  assert.equal(completeDirectionTwoCreateField("create Goa December 60 8 y"), 'create Goa December 60 8 y "password"');
  assert.equal(completeDirectionTwoCreateField("create Goa December 60 8 n"), null);
  assert.equal(completeDirectionTwoCreateField("join abc123"), null);
});

test("parses a complete inline create command with a multi-word title", () => {
  assert.deepEqual(parseDirectionTwoCreateCommand("create Goa December 60 8 n"), {
    status: "ready",
    draft: {
      topic: "Goa December",
      expiry: 60,
      roomLimit: 8,
      password: "",
    },
  });
});

test("parses a slash-delimited inline create command", () => {
  assert.deepEqual(parseDirectionTwoCreateCommand("create / hi sdff room / 60 / 5 / n"), {
    status: "ready",
    draft: {
      topic: "hi sdff room",
      expiry: 60,
      roomLimit: 5,
      password: "",
    },
  });
});

test("parses quoted inline create fields", () => {
  assert.deepEqual(parseDirectionTwoCreateCommand('create "Dinner vote" 45 4 y "green room"'), {
    status: "ready",
    draft: {
      topic: "Dinner vote",
      expiry: 45,
      roomLimit: 4,
      password: "green room",
    },
  });
});

test("requires a password after answering yes to password protection", () => {
  assert.deepEqual(parseDirectionTwoCreateCommand("create Dinner vote 45 4 y"), {
    status: "partial",
    nextStep: "password",
    draft: {
      topic: "Dinner vote",
      expiry: 45,
      roomLimit: 4,
      password: "",
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
