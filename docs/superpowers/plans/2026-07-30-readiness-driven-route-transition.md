# Readiness-Driven Route Transition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the landing page visibly active while a room is created or joined, then animate its static content out only after the destination room is ready and reveal the room UI in a deliberate sequence.

**Architecture:** Extend the existing route-handoff state machine so navigation mounts the room underneath a retained landing layer. The landing layer remains live during initialization, then the room readiness signal starts one coordinated transition: landing USP rows, body copy, and title leave in order while the room header, transcript, and composer enter in order.

**Tech Stack:** Next.js App Router, React 19, TypeScript, CSS animations, Node test runner.

## Global Constraints

- Preserve the existing 1200px shared content rail and composer design.
- Show `creating private room...` or `joining room...` in the landing terminal output area while the real request is pending.
- Do not start the landing exit before the room reports joined and realtime-ready.
- Exit order is USP rows, body copy, then INKOG title.
- Room entrance order is navbar, transcript content, then composer.
- Reduced-motion mode removes transforms, shimmer, and stagger delays.
- Do not add a new animation dependency.

---

### Task 1: Define the readiness-driven transition contract

**Files:**
- Modify: `lib/route-handoff.mjs`
- Test: `lib/route-handoff.test.mjs`

**Interfaces:**
- Produces: `getLandingHandoffStyle(options)`, `getRoomHandoffStyle(options)`, `getRouteStatusPresentation(action)`, and the `idle -> pending -> transitioning -> idle` reducer contract.

- [ ] **Step 1: Write failing reducer and presentation tests**

Add literal assertions proving that `begin` keeps the landing visible in `pending`, `ready` starts `transitioning`, the status copy matches create/join, landing parts have bottom-to-top delays, and room parts have header-to-composer delays.

- [ ] **Step 2: Run the focused test and confirm it fails for the missing contract**

Run: `node --test lib/route-handoff.test.mjs`

Expected: FAIL because the new helpers and phases do not exist.

- [ ] **Step 3: Implement the minimal pure transition helpers**

Define the phase reducer, status presentation, durations, and element styles without touching React components.

- [ ] **Step 4: Run the focused test and confirm it passes**

Run: `node --test lib/route-handoff.test.mjs`

Expected: PASS.

### Task 2: Retain the landing route until room readiness

**Files:**
- Modify: `components/route-handoff-provider.tsx`
- Modify: `components/direction-two-shell.tsx`
- Modify: `app/room/[id]/page.tsx`
- Test: `lib/route-handoff.test.mjs`

**Interfaces:**
- Consumes: transition reducer and style helpers from Task 1.
- Produces: a provider that keeps the previous landing children mounted above the destination room until `markRoomReady(roomId)` starts and completes the handoff.

- [ ] **Step 1: Change `beginRoomHandoff` to enter pending immediately**

The landing remains interactive only as a visual loading surface; the route navigation occurs immediately after `beginRoomHandoff`.

- [ ] **Step 2: Render retained and destination route layers**

Keep the landing layer above the mounted room while pending. Mark the destination layer hidden and inert until transitioning begins, then remove the retained layer after the longest animation completes.

- [ ] **Step 3: Apply named landing and room element styles**

Tag the title, body, USP rows, landing terminal/composer, room header, transcript, and room composer with the corresponding helper styles.

- [ ] **Step 4: Run focused route tests**

Run: `node --test lib/route-handoff.test.mjs lib/room-composer-ui.test.mjs`

Expected: PASS.

### Task 3: Add real create/join status feedback

**Files:**
- Modify: `components/direction-two-shell.tsx`
- Modify: `app/globals.css`
- Test: `lib/route-handoff.test.mjs`

**Interfaces:**
- Consumes: `getRouteStatusPresentation(action)`.
- Produces: an accessible animated status line in the landing terminal output area.

- [ ] **Step 1: Set create/join status before network work**

Use create status during the POST request. For joins, preflight the room endpoint before navigation so missing or expired rooms fail on the landing surface.

- [ ] **Step 2: Render and animate the status line**

Render one `role="status"` line below existing terminal output and above the composer. Use a subtle accent shimmer and disable it for reduced motion.

- [ ] **Step 3: Preserve failure recovery**

Clear the status and keep the landing page active when create or join fails.

- [ ] **Step 4: Run focused tests**

Run: `node --test lib/route-handoff.test.mjs lib/direction-two-shell.test.mjs`

Expected: PASS.

### Task 4: Verify the complete handoff

**Files:**
- Verify only.

- [ ] **Step 1: Run the focused UI test group**

Run: `node --test lib/route-handoff.test.mjs lib/direction-two-shell.test.mjs lib/direction-two-terminal-layout.test.mjs lib/room-composer-ui.test.mjs lib/room-background.test.mjs`

- [ ] **Step 2: Check formatting and production compilation**

Run: `git diff --check`

Run: `npm run build`

- [ ] **Step 3: Verify in the browser on the already-running frontend port**

Confirm the landing status remains animated during a delayed create/join, the landing does not leave early, the exit order is USP/body/title, and the room enters header/transcript/composer.

