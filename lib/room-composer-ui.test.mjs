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

test("passes expanded room content above the shared composer input row", async () => {
  const roomPage = await readFile(new URL("../app/room/[id]/page.tsx", import.meta.url), "utf8");
  const sharedComposer = await readFile(new URL("../components/terminal-composer.tsx", import.meta.url), "utf8");

  assert.match(roomPage, /<TerminalComposer\b/);
  assert.match(roomPage, /expanded=\{composerExpanded\}/);
  assert.match(roomPage, /topContent=\{/);
  assert.match(roomPage, /inputPrefix=\{/);
  assert.ok(sharedComposer.indexOf("{topContent}") < sharedComposer.indexOf("data-terminal-composer-input-row"));
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
