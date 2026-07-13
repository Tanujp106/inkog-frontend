import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { getRoomComposerChrome, getRoomSlashCommandSuggestions } from "./room-composer-ui.mjs";

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

test("expands the room composer while the poll command is active", () => {
  assert.deepEqual(
    getRoomComposerChrome({
      composerStatus: { tone: "muted", message: "poll question:" },
      pendingCommand: { type: "poll", step: "question", draft: { question: "", options: [] } },
    }),
    {
      expanded: true,
      statusMode: "hidden",
    },
  );
});

test("keeps command confirmations inside the composer after style selection", () => {
  assert.deepEqual(
    getRoomComposerChrome({
      composerStatus: { tone: "accent", message: "style set: purple" },
      pendingCommand: null,
    }),
    {
      expanded: true,
      statusMode: "inline",
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

test("gives the room composer a sharp, theme-aware terminal frame", async () => {
  const source = await readFile(new URL("../app/room/[id]/page.tsx", import.meta.url), "utf8");

  assert.match(source, /border: "1px solid color-mix\(in srgb, var\(--border-light\) 72%, var\(--accent\) 28%\)"/);
  assert.match(source, /padding: "0 clamp\(16px, 3vw, 32px\) 16px"/);
});

test("shows slash command suggestions when the input starts with slash", () => {
  assert.deepEqual(
    getRoomSlashCommandSuggestions({ isCreator: false, query: "/" }).map(item => item.command),
    ["/help", "/leave", "/poll", "/share", "/sound", "/style"],
  );
});

test("filters slash command suggestions as the user types", () => {
  assert.deepEqual(
    getRoomSlashCommandSuggestions({ isCreator: true, query: "/s" }).map(item => item.command),
    ["/share", "/sound", "/style"],
  );
});

test("shows creator-only slash commands only to the creator", () => {
  assert.deepEqual(
    getRoomSlashCommandSuggestions({ isCreator: true, query: "/c" }).map(item => item.command),
    ["/close"],
  );
  assert.deepEqual(
    getRoomSlashCommandSuggestions({ isCreator: false, query: "/c" }).map(item => item.command),
    [],
  );
});

test("shows the password command only to the creator", () => {
  assert.deepEqual(
    getRoomSlashCommandSuggestions({ isCreator: true, query: "/p" }).map(item => item.command),
    ["/password", "/poll"],
  );
  assert.deepEqual(
    getRoomSlashCommandSuggestions({ isCreator: false, query: "/p" }).map(item => item.command),
    ["/poll"],
  );
});

test("does not show slash suggestions for normal chat", () => {
  assert.deepEqual(
    getRoomSlashCommandSuggestions({ isCreator: true, query: "hello" }),
    [],
  );
});
