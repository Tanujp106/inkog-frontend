# Room Theme Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the room page inherit the same theme-driven background language as the homepage so blue, green, purple, and orange users keep their chosen color identity inside chat.

**Architecture:** Add a small room background helper that describes the theme-reactive surface using existing CSS variables instead of hardcoded colors. Then apply that helper in the room page and replace the remaining green-only poll fill with a variable-driven tint.

**Tech Stack:** Next.js App Router, React inline styles, CSS variables from `app/globals.css`, Node `node:test`

---

### Task 1: Add a theme-aware room background helper

**Files:**
- Create: `lib/room-background.mjs`
- Create: `lib/room-background.test.mjs`

- [ ] Write a failing test proving the room background uses `var(--color-signal)` and avoids hardcoded green values.
- [ ] Run: `node --test lib/room-background.test.mjs`
- [ ] Implement the helper with background image and blend metadata.
- [ ] Run: `node --test lib/room-background.test.mjs`

### Task 2: Apply the helper to the room page

**Files:**
- Modify: `app/room/[id]/page.tsx`

- [ ] Import the room background helper and apply it to the room shell so the page surface follows the current global theme.
- [ ] Replace the selected poll fill hardcode with a theme-aware accent mix.

### Task 3: Verify

**Files:**
- Verify: `lib/room-background.test.mjs`
- Verify: `app/room/[id]/page.tsx`

- [ ] Run: `node --test lib/room-background.test.mjs`
- [ ] Run: `npm run build`
- [ ] Review the room-page diff to confirm the background is variable-driven and no green-only poll tint remains.
