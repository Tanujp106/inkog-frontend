import assert from "node:assert/strict";
import test from "node:test";

import {
  advanceLandingCreateSession,
  getLandingInlineTemplate,
  getLandingSlashCommandSuggestions,
  parseLandingCommand,
  redactLandingTranscriptValue,
} from "./landing-terminal.mjs";

test("parses direct join and help commands", () => {
  assert.deepEqual(parseLandingCommand("/join abc123"), { type: "join", target: "abc123" });
  assert.deepEqual(parseLandingCommand("/help who made inkog?"), { type: "help", question: "who made inkog?" });
  assert.deepEqual(parseLandingCommand("/help / who made inkog?"), { type: "help", question: "who made inkog?" });
});

test("parses bare commands and exposes their inline templates", () => {
  assert.deepEqual(parseLandingCommand("/join"), { type: "join", target: "" });
  assert.deepEqual(getLandingInlineTemplate({ type: "join" }), {
    prefix: "/join / ",
    placeholder: "<enter room ID or link>",
    inputType: "text",
  });
  assert.deepEqual(getLandingInlineTemplate({ type: "help" }), {
    prefix: "/help / ",
    placeholder: "<ask question>",
    inputType: "text",
  });
});

test("walks a create session through topic, defaults, and password", () => {
  const topic = advanceLandingCreateSession({ type: "create", step: "topic", draft: {} }, "Should we go to Goa?");
  assert.deepEqual(topic, {
    kind: "next",
    submitted: "Should we go to Goa?",
    session: { type: "create", step: "expiry", draft: { topic: "Should we go to Goa?" } },
  });

  const expiry = advanceLandingCreateSession(topic.session, "");
  assert.deepEqual(expiry.session, {
    type: "create",
    step: "roomLimit",
    draft: { topic: "Should we go to Goa?", expiry: 60 },
  });

  const roomLimit = advanceLandingCreateSession(expiry.session, "");
  assert.deepEqual(roomLimit.session, {
    type: "create",
    step: "password",
    draft: { topic: "Should we go to Goa?", expiry: 60, roomLimit: 10 },
  });

  assert.deepEqual(advanceLandingCreateSession(roomLimit.session, "secret"), {
    kind: "create",
    submitted: "secret",
    draft: { topic: "Should we go to Goa?", expiry: 60, roomLimit: 10, password: "secret" },
  });
});

test("keeps a create session on invalid values", () => {
  const expirySession = { type: "create", step: "expiry", draft: { topic: "Topic" } };
  assert.deepEqual(advanceLandingCreateSession(expirySession, "14"), {
    kind: "error",
    submitted: "14",
    message: "expiry must be at least 15 minutes",
  });

  const roomLimitSession = { type: "create", step: "roomLimit", draft: { topic: "Topic", expiry: 60 } };
  assert.deepEqual(advanceLandingCreateSession(roomLimitSession, "ten"), {
    kind: "error",
    submitted: "ten",
    message: "room limit must be a whole number from 1 to 30",
  });
  assert.deepEqual(advanceLandingCreateSession(roomLimitSession, "31"), {
    kind: "error",
    submitted: "31",
    message: "room limit must be a whole number from 1 to 30",
  });
});

test("redacts create passwords and recognizes cancellation", () => {
  assert.equal(redactLandingTranscriptValue({ type: "create", step: "password" }, "secret"), "••••••");
  assert.equal(redactLandingTranscriptValue({ type: "create", step: "password" }, ""), "<no password>");
  assert.deepEqual(parseLandingCommand("/cancel"), { type: "cancel" });
});

test("offers and filters landing slash command suggestions", () => {
  assert.deepEqual(getLandingSlashCommandSuggestions("/"), [
    { command: "/create", label: "create a room" },
    { command: "/join", label: "join with a room ID or link" },
    { command: "/help", label: "ask inkog" },
    { command: "/cancel", label: "cancel the active command" },
  ]);
  assert.deepEqual(getLandingSlashCommandSuggestions("/jo"), [
    { command: "/join", label: "join with a room ID or link" },
  ]);
  assert.deepEqual(getLandingSlashCommandSuggestions("/help what is inkog?"), []);
  assert.deepEqual(getLandingSlashCommandSuggestions("hello"), []);
});
