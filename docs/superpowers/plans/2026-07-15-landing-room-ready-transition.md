# Landing-to-Room Ready Transition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the landing surface and one ambient shader visibly continuous until a newly created or joined room is fully interactive, then perform a restrained landing-out/room-in handoff without moving the composer anchor.

**Architecture:** A pure handoff reducer owns deterministic pending, ready, blocked, completing, and reduced-motion behavior. A persistent client provider beneath the root providers owns the single shader, freezes the outgoing landing subtree during destination bootstrap, captures one inert visual composer shell, and reveals the room only after a matching readiness signal. Landing code begins the handoff immediately before App Router navigation; the room reports ready only after authenticated join, history hydration, and the interactive stage are complete.

**Tech Stack:** Next.js 15 App Router, React 19 client context, TypeScript, Node `node:test`, existing CSS/Tailwind utilities, existing `AmbientShaderBackground` and shader interpolation.

## Global Constraints

- Preserve current create/join APIs, URL behavior, authentication, socket setup, history hydration, themes, and room failure/password states.
- Use one persistent `AmbientShaderBackground` / `GrainGradient` for landing and room routes; do not add another animation loop, canvas, socket, poller, preload, or router.
- Animate only opacity and transform for 400 ms; reduced motion uses a near-immediate opacity-only handoff.
- Keep the landing visible while API work and room bootstrap are pending.
- Keep outgoing content inert during the visible handoff and transfer focus to the room input only when the handoff completes.
- Preserve all unrelated dirty-worktree changes.

---

### Task 1: Add the deterministic handoff state machine

**Files:**
- Create: `lib/route-transition.mjs`
- Create: `lib/route-transition.mjs.d.ts`
- Create: `lib/route-transition.test.mjs`

**Interfaces:**
- Produces: `createRouteHandoffState(reducedMotion?)`, `reduceRouteHandoff(state, event)`, `routeHandoffDurationMs`, `reducedRouteHandoffDurationMs`, and shared composer geometry tokens.
- State phases: `idle`, `pending`, `ready`, and `completing`; only a matching room ID may advance or clear an active handoff.

- [ ] **Step 1: Write failing reducer tests**

Cover begin/pending, matching readiness, mismatched readiness, matching block/error/password cancellation, mismatched cancellation, completion, replacement by a newer destination, and reduced-motion duration/lift.

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `node --test lib/route-transition.test.mjs`

Expected: failure because `lib/route-transition.mjs` does not exist.

- [ ] **Step 3: Implement the minimal pure reducer and declarations**

Use explicit events:

```js
{ type: "begin", roomId }
{ type: "ready", roomId }
{ type: "blocked", roomId }
{ type: "complete", roomId }
{ type: "reduced-motion", value }
```

The `ready` event sets `phase: "ready"`, `durationMs`, and `liftPx`; `blocked` and `complete` return to idle only for the active room.

- [ ] **Step 4: Run the focused test and confirm GREEN**

Run: `node --test lib/route-transition.test.mjs`

Expected: all route-transition reducer tests pass.

### Task 2: Add the persistent provider, shader, and composer overlay

**Files:**
- Create: `components/route-transition-provider.tsx`
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`
- Modify: `components/direction-two-shell.tsx`
- Modify: `app/room/[id]/page.tsx`
- Create: `lib/route-transition-contract.test.mjs`
- Modify: `lib/ambient-shader.test.mjs`

**Interfaces:**
- Produces context methods `beginRoomHandoff(roomId, composerElement)`, `reportRoomReady(roomId, inputElement)`, and `cancelRoomHandoff(roomId)`.
- The provider captures the outgoing `children` and composer DOM snapshot at begin time, keeps it visible after navigation, and mounts one shader beneath both route layers.

- [ ] **Step 1: Write failing source/component contract tests**

Assert that the root layout mounts `RouteTransitionProvider`, the provider is the only landing/room owner of `AmbientShaderBackground`, landing and room local shader mounts are removed, both composers expose route-composer markers, and both use shared composer geometry tokens.

- [ ] **Step 2: Run contracts and confirm RED**

Run: `node --test lib/route-transition-contract.test.mjs lib/ambient-shader.test.mjs`

Expected: failures for the missing provider and remaining local shader mounts.

- [ ] **Step 3: Implement the provider and root integration**

The provider must:

- subscribe once to `prefers-reduced-motion`;
- render one fixed `AmbientShaderBackground` for `/` and `/room/*`;
- retain the landing child subtree only after navigation reaches the pending room;
- render the incoming room at final geometry with opacity 0 and pointer events disabled until matching readiness;
- render one `aria-hidden`, inert composer snapshot at its measured bounding box while both route-local composer visuals are hidden;
- transition outgoing opacity/translateY and incoming opacity for the reducer-provided duration;
- complete with a timeout, remove the outgoing subtree/snapshot, enable the room, and focus the reported room input;
- cancel without animation on password, expired, error, unmount, or mismatched destination.

- [ ] **Step 4: Integrate landing begin calls and shared composer markers**

In both `openRoom` and successful `createRoom`, call `beginRoomHandoff(id, promptRowRef.current)` immediately before `router.push`. Mark the landing composer frame with `data-route-composer="landing"` and retain all current command behavior.

- [ ] **Step 5: Hoist the shader and preserve route backgrounds**

Remove landing and room local shader imports/mounts. Keep the existing opacity values by letting the persistent provider select landing opacity (`0.34` mobile / `0.43` desktop) or room opacity (`0.24`) without remounting the shader component. Keep current theme interpolation and performance limits unchanged.

- [ ] **Step 6: Run contracts and confirm GREEN**

Run: `node --test lib/route-transition-contract.test.mjs lib/ambient-shader.test.mjs lib/direction-two-terminal-layout.test.mjs lib/room-composer-ui.test.mjs`

Expected: all focused contract and existing composer/shader tests pass.

### Task 3: Gate room readiness on the complete bootstrap path

**Files:**
- Modify: `app/room/[id]/page.tsx`
- Modify: `lib/room-chat-ui.mjs`
- Modify: `lib/room-chat-ui.mjs.d.ts`
- Modify: `lib/room-chat-ui.test.mjs`

**Interfaces:**
- Produces: `isRoomReadyForHandoff({ stage, historyHydrated, socketJoined, passwordGate })`.
- Consumes: `reportRoomReady(roomId, composerRef.current)` and `cancelRoomHandoff(roomId)` from the transition provider.

- [ ] **Step 1: Write failing readiness tests**

Assert false for loading, missing history, socket not joined, password gate, expired, and error; assert true only for joined + hydrated + socket joined + no password gate.

- [ ] **Step 2: Run readiness tests and confirm RED**

Run: `node --test lib/room-chat-ui.test.mjs`

Expected: failure because `isRoomReadyForHandoff` is missing.

- [ ] **Step 3: Implement bootstrap evidence and provider signals**

Track history hydration and socket `join_room_success` separately. Report readiness in an effect only when the pure helper returns true and the composer ref exists. Cancel the matching pending handoff for password, expired, error, and room cleanup. Suppress the existing stage-based focus effect while a handoff is pending; provider completion owns the final focus transfer.

- [ ] **Step 4: Run readiness and transition tests and confirm GREEN**

Run: `node --test lib/room-chat-ui.test.mjs lib/route-transition.test.mjs lib/route-transition-contract.test.mjs`

Expected: all readiness and handoff tests pass.

### Task 4: Full verification and focused browser proof

**Files:**
- Verify only; fix regressions in the files above with a new failing test first.

- [ ] **Step 1: Run focused regression tests**

Run: `node --test lib/route-transition.test.mjs lib/route-transition-contract.test.mjs lib/ambient-shader.test.mjs lib/direction-two-shell.test.mjs lib/direction-two-terminal-layout.test.mjs lib/room-chat-ui.test.mjs lib/room-composer-ui.test.mjs`

- [ ] **Step 2: Run production build**

Run: `npm run build`

- [ ] **Step 3: Check patch hygiene**

Run: `git diff --check`

- [ ] **Step 4: Verify create and join in the existing browser runtime**

Reuse `http://127.0.0.1:3000`. For both create and direct `/join <room-id>`, verify that landing remains visible while pending; transition starts only after room interaction is ready; the mark/content fade and lift while room content fades at final geometry; composer geometry does not move; only one shader canvas exists and does not restart; room input receives focus and accepts input immediately after completion. Also verify password-gated, expired, and invalid rooms retain their existing states without animation.

## Plan self-review

- Spec coverage: state matching, failure/password cancellation, room readiness, persistent shader, composer overlay, reduced motion, focus/inert semantics, focused tests, build, diff check, and live create/join checks are each assigned.
- Scope: no router, API, socket, shader effect, reverse transition, or unrelated visual redesign is introduced.
- Dirty-worktree safety: existing edits in landing, room, 404, and Direction 2 files remain in place; no blanket reset or unrelated formatting is allowed.
