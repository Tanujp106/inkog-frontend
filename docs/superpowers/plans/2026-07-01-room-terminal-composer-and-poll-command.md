# Room Terminal Composer And Poll Command Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the room composer feel like the terminal transcript, replace the header share label with an icon action, and remove the guided poll transcript flow in favor of a single inline `/poll question | option | option` command.

**Architecture:** Keep the transcript itself unchanged except for no longer echoing poll-creation steps. Simplify the room command parser and page composer state so poll creation stays entirely inside the input row, then restyle the composer/header to match the existing terminal design tokens.

**Tech Stack:** Next.js App Router, React, inline CSS objects, Node `node:test` helper tests, `.mjs` helpers with sibling `.d.ts` files

---

### Task 1: Lock Poll Creation To Inline Commands

**Files:**
- Modify: `lib/room-terminal.test.mjs`
- Modify: `lib/room-terminal.mjs`
- Modify: `lib/room-terminal-types.ts`

- [ ] Update the parser tests to reject bare `/poll` and keep inline `/poll question | option | option` as the only valid poll command.
- [ ] Run: `node --test lib/room-terminal.test.mjs`
- [ ] Simplify the parser and command type union to remove guided poll support.
- [ ] Run: `node --test lib/room-terminal.test.mjs`

### Task 2: Remove Guided Poll Helpers

**Files:**
- Modify: `lib/room-chat-ui.test.mjs`
- Modify: `lib/room-chat-ui.mjs`
- Modify: `lib/room-chat-ui.mjs.d.ts`
- Delete: `lib/room-poll-flow.test.mjs`
- Delete: `lib/room-poll-flow.mjs`
- Delete: `lib/room-poll-flow.mjs.d.ts`

- [ ] Trim helper tests so they only cover transcript message presentation.
- [ ] Run: `node --test lib/room-chat-ui.test.mjs`
- [ ] Remove now-unused poll draft / poll flow helpers and sync declaration files.
- [ ] Run: `node --test lib/room-chat-ui.test.mjs`

### Task 3: Rework The Room Composer Surface

**Files:**
- Modify: `app/room/[id]/page.tsx`

- [ ] Remove poll flow state and transcript echoing for poll authoring.
- [ ] Replace the share text button with an icon-only action and update the composer to a top-border-only terminal row with no send button.
- [ ] Change the prompt/placeholder treatment so the input reads like a terminal caret rather than `message as ... or /poll`.
- [ ] Keep malformed poll feedback as terse error output only after submit.

### Task 4: Verify The Room Surface

**Files:**
- Verify: `app/room/[id]/page.tsx`
- Verify: `lib/room-terminal.test.mjs`
- Verify: `lib/room-chat-ui.test.mjs`

- [ ] Run: `node --test lib/room-terminal.test.mjs lib/room-chat-ui.test.mjs`
- [ ] Run: `npm run build`
- [ ] Review the room-page diff for the three requested outcomes: icon-only share, composer integrated into the terminal shell, and poll creation no longer appearing inside the transcript.
