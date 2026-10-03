import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import * as directionTwo from "./direction-two-shell.mjs";
import { getRoomSlashCommandSuggestions } from "./room-composer-ui.mjs";
import { getSlashCommandTokenDeletionRange } from "./slash-command-token.mjs";

const commandNames = ["create", "join", "help", "clear", "style", "sound"];
const emptyDraft = { topic: "", expiry: 60, roomLimit: 10, password: "" };

test("Backspace removes every top-level slash command as one token", () => {
  for (const name of commandNames) {
    const value = `/${name}`;
    assert.deepEqual(
      getSlashCommandTokenDeletionRange(value, value.length, value.length, "backward"),
      { start: 0, end: value.length },
      value,
    );
  }
});

test("Backspace also removes every in-room slash command as one token", () => {
  const roomCommands = getRoomSlashCommandSuggestions({ isCreator: true, hasPassword: true, query: "/" });
  for (const { command } of roomCommands) {
    assert.deepEqual(
      getSlashCommandTokenDeletionRange(command, command.length, command.length, "backward"),
      { start: 0, end: command.length },
      command,
    );
  }
});

test("Backspace removes a selected command and its empty slash delimiter together", () => {
  for (const name of ["join", "help", "style", "sound"]) {
    const value = `/${name} / `;
    assert.deepEqual(
      getSlashCommandTokenDeletionRange(value, value.length, value.length, "backward"),
      { start: 0, end: value.length },
      value,
    );
  }
});

test("Backspace edits an argument before removing its command token", () => {
  for (const value of ["/join / abc123", "/help / what is inkog", "/style / 2", "/sound / off"]) {
    assert.equal(getSlashCommandTokenDeletionRange(value, value.length, value.length, "backward"), null);
  }
});

test("Delete and selection remove a command and separator without erasing its argument", () => {
  assert.deepEqual(getSlashCommandTokenDeletionRange("/join / abc123", 2, 2, "forward"), { start: 0, end: 8 });
  assert.deepEqual(getSlashCommandTokenDeletionRange("/style / 2", 1, 4, "backward"), { start: 0, end: 9 });
  assert.deepEqual(getSlashCommandTokenDeletionRange("/help question", 2, 2, "forward"), { start: 0, end: 6 });
  assert.equal(getSlashCommandTokenDeletionRange("hello", 5, 5, "backward"), null);
});

test("a lone slash remains removable by ordinary Backspace", () => {
  assert.equal(getSlashCommandTokenDeletionRange("/", 1, 1, "backward"), null);
});

test("Backspace on an empty first create answer removes the visible create token", () => {
  assert.deepEqual(directionTwo.getDirectionTwoGuidedBackspaceAction?.({
    step: "topic",
    inputValue: "",
    editingSegment: null,
    segments: [{ id: "command", value: "/create" }],
    draft: emptyDraft,
  }), { type: "cancel" });
});

test("Backspace on a nonempty answer leaves ordinary character editing to the input", () => {
  assert.equal(directionTwo.getDirectionTwoGuidedBackspaceAction?.({
    step: "topic",
    inputValue: "Room",
    editingSegment: null,
    segments: [{ id: "command", value: "/create" }],
    draft: emptyDraft,
  }), null);
});

test("Backspace on an empty later create answer reopens the previous answer", () => {
  assert.deepEqual(directionTwo.getDirectionTwoGuidedBackspaceAction?.({
    step: "expiry",
    inputValue: "",
    editingSegment: null,
    segments: [{ id: "command", value: "/create" }, { id: "topic", value: "Room" }],
    draft: { ...emptyDraft, topic: "Room" },
  }), {
    type: "previous-step",
    step: "topic",
    segments: [{ id: "command", value: "/create" }],
    draft: emptyDraft,
  });
});

test("Backspace unwinds time, participant, and password-choice answers one step at a time", () => {
  const cases = [
    {
      step: "limit",
      last: { id: "expiry", value: "45" },
      draft: { topic: "Room", expiry: 45, roomLimit: 10, password: "" },
      expectedStep: "expiry",
      expectedDraft: { topic: "Room", expiry: 60, roomLimit: 10, password: "" },
    },
    {
      step: "password-choice",
      last: { id: "limit", value: "4" },
      draft: { topic: "Room", expiry: 45, roomLimit: 4, password: "" },
      expectedStep: "limit",
      expectedDraft: { topic: "Room", expiry: 45, roomLimit: 10, password: "" },
    },
    {
      step: "password",
      last: { id: "password-choice", value: "y" },
      draft: { topic: "Room", expiry: 45, roomLimit: 4, password: "" },
      expectedStep: "password-choice",
      expectedDraft: { topic: "Room", expiry: 45, roomLimit: 4, password: "" },
    },
  ];

  for (const item of cases) {
    const segments = [{ id: "command", value: "/create" }, { id: "topic", value: "Room" }, item.last];
    assert.deepEqual(directionTwo.getDirectionTwoGuidedBackspaceAction?.({
      step: item.step,
      inputValue: "",
      editingSegment: null,
      segments,
      draft: item.draft,
    }), {
      type: "previous-step",
      step: item.expectedStep,
      segments: segments.slice(0, -1),
      draft: item.expectedDraft,
    }, item.step);
  }
});

test("mobile questions follow create, join, style, help, and sound but disappear after Escape or clearing input", () => {
  const question = directionTwo.getDirectionTwoMobileComposerQuestion;
  assert.equal(question?.({ flow: { type: "create", step: "topic" }, inputValue: "" }), "What should be the room name?");
  assert.equal(question?.({ flow: { type: "create", step: "expiry" }, inputValue: "" }), "What should be the time?");
  assert.equal(question?.({ flow: { type: "create", step: "limit" }, inputValue: "" }), "How many people can join?");
  assert.equal(question?.({ flow: { type: "create", step: "password-choice" }, inputValue: "" }), "Add a password? (y/n)");
  assert.equal(question?.({ flow: { type: "create", step: "password" }, inputValue: "" }), "What should be the password?");
  assert.equal(question?.({ flow: { type: "join", step: "room" }, inputValue: "" }), "Enter a room ID or link.");
  assert.equal(question?.({ flow: { type: "join", step: "password" }, inputValue: "" }), "Enter the room password to join.");
  assert.equal(question?.({ flow: { type: "style", step: "choice" }, inputValue: "" }), "Pick a theme from 1 to 5.");
  assert.equal(question?.({ flow: null, inputValue: "/create" }), "What should be the room name?");
  assert.equal(question?.({ flow: null, inputValue: "/create / My Room" }), "What should be the time?");
  assert.equal(question?.({ flow: null, inputValue: "/join / abc123" }), "Enter a room ID or link.");
  assert.equal(question?.({ flow: null, inputValue: "/help / " }), "Ask a question about Inkog.");
  assert.equal(question?.({ flow: null, inputValue: "/sound / " }), "Choose on, off, or status.");
  assert.equal(question?.({ flow: null, inputValue: "" }), null);
  assert.equal(question?.({ flow: null, inputValue: "/clear" }), null);
});

test("mobile composer shows validation and active questions while command results stay in the transcript", () => {
  const message = directionTwo.getDirectionTwoMobileComposerMessage;
  const createFlow = { type: "create", step: "topic" };
  assert.equal(message?.({ flow: createFlow, inputValue: "", feedback: "Try another name." }), "Try another name.");
  assert.equal(message?.({ flow: createFlow, inputValue: "", feedback: null }), "What should be the room name?");
  assert.equal(message?.({ flow: null, inputValue: "", feedback: null }), null);
});

test("clearing the homepage prevents a pending help answer from restoring old transcript lines", async () => {
  const component = await readFile(new URL("../components/direction-two-shell.tsx", import.meta.url), "utf8");

  assert.match(component, /const requestGeneration = helpRequestGenerationRef\.current;[\s\S]*if \(requestGeneration !== helpRequestGenerationRef\.current\) return;/);
  assert.match(component, /const clearTerminal = \(\) => \{[\s\S]*helpRequestGenerationRef\.current \+= 1;[\s\S]*setLines\(initialLines\)/);
});

test("slash command arguments stay with the intended command", () => {
  for (const [value, command, argument] of [
    ["/join / abc123", "join", "abc123"],
    ["/style / 2", "style", "2"],
    ["/help / what is inkog", "help", "what is inkog"],
    ["/sound / off", "sound", "off"],
  ]) {
    assert.deepEqual(directionTwo.parseDirectionTwoInlineCommand(value), { command, argument, usesSlash: true });
  }
});

test("selected slash commands keep their intended inline journeys", () => {
  for (const [command, next] of [
    ["/join", "/join / "],
    ["/help", "/help / "],
    ["/style", "/style / "],
    ["/sound", "/sound / "],
  ]) {
    assert.deepEqual(directionTwo.resolveDirectionTwoEnterAction(command), {
      type: "continue-inline",
      value: next,
      hint: directionTwo.getDirectionTwoInlineHint(next),
    });
  }
  assert.equal(directionTwo.resolveDirectionTwoEnterAction("/clear"), null);
});

test("mobile Escape clears the question and the closed composer hides the outgoing text", async () => {
  const [component, css] = await Promise.all([
    readFile(new URL("../components/direction-two-shell.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(component, /if \(event\.key === "Escape"\) \{\s*event\.preventDefault\(\);\s*event\.stopPropagation\(\);\s*cancelFlow\(\);/);
  assert.match(component, /setGuidedCreateSegments\(null\);[\s\S]*setInputFeedbackMessage\(null\);[\s\S]*setKeyboardStatus\("Prompt cleared\."\)/);
  assert.match(css, /\.direction-two-composer-message-inner \{[\s\S]*?visibility: hidden;/);
  assert.match(css, /\.direction-two-composer-message\[data-visible="true"\] \.direction-two-composer-message-inner \{\s*visibility: visible;/);
});

test("mobile question copy uses the neutral text color with a gap above the input", async () => {
  const [component, css] = await Promise.all([
    readFile(new URL("../components/direction-two-shell.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(component, /className="px-\[4px\] text-\[13px\] leading-\[20px\] text-\[var\(--color-dim\)\]"/);
  assert.match(css, /\.direction-two-composer-message\[data-visible="true"\] \{[\s\S]*?margin-bottom: 10px;/);
});
