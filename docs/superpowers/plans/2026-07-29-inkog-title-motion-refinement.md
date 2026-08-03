# INKOG Title Motion Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine the existing DOM pixel title with strict left-to-right formation, a separate sine-wave shimmer, pointer-local magnetic attraction, and development-only DialKit tuning.

**Architecture:** Put deterministic timing and magnetic falloff math in `lib/direction-two-intro.mjs`, keep animation sequencing and pointer lifecycle in `InkPatternMark`, and let CSS own the paint/transform effects through per-pixel custom properties. DialKit supplies live values to the same typed settings object without controlling phase transitions.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, CSS keyframes/custom properties, `requestAnimationFrame`, Node `node:test`, DialKit 1.4.x

## Global Constraints

- Keep the existing DOM pixel grid and accessible `role="img"` label.
- Formation delays depend only on the global horizontal column; pixels in one column start together.
- Formation animates opacity and brightness only—never translation, scale, blur, shadow, or layout.
- Shimmer starts after the last formation pixel settles and runs exactly once.
- Shimmer uses paint properties only; hover never replays it.
- Magnetic hover is pointer-only, local, capped, interruptible, and disabled for reduced motion.
- Pointer movement must not cause a React render per event.
- DialKit uses its default development-only UI and must not own sequencing.
- Do not edit Direction Two layout, terminal behavior, ambient pixels, intro copy, room flows, or existing `lib/room-background*` changes.

---

### Task 1: Deterministic title-motion math

**Files:**
- Modify: `lib/direction-two-intro.mjs`
- Modify: `lib/direction-two-intro.mjs.d.ts`
- Test: `lib/direction-two-intro.test.mjs`

**Interfaces:**
- Produces: `getDirectionTwoFormationDelay(column, columnCount, spreadMs): number`
- Produces: `getDirectionTwoSineShimmerDelay(column, row, columnCount, rowCount, spreadMs, amplitudeMs, frequency): number`
- Produces: `getDirectionTwoMagnetOffset(pixelX, pixelY, pointerX, pointerY, radius, strength, maxDisplacement): { x: number; y: number }`
- Produces: `directionTwoTitleMotionDefaults`

- [ ] **Step 1: Write failing behavior tests**

Add literal assertions proving:

```js
assert.deepEqual(
  [0, 1, 2, 3].map(column => getDirectionTwoFormationDelay(column, 4, 300)),
  [0, 100, 200, 300],
);
assert.equal(getDirectionTwoSineShimmerDelay(0, 0, 5, 5, 400, 40, 1), 20);
assert.equal(getDirectionTwoSineShimmerDelay(2, 1, 5, 5, 400, 40, 1), 210);
assert.deepEqual(
  getDirectionTwoMagnetOffset(50, 50, 60, 50, 40, 1, 6),
  { x: 6, y: 0 },
);
assert.deepEqual(
  getDirectionTwoMagnetOffset(0, 0, 100, 100, 40, 1, 6),
  { x: 0, y: 0 },
);
```

The production break caught is row-dependent formation, non-deterministic wave timing, attraction outside the radius, or uncapped displacement.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test lib/direction-two-intro.test.mjs`

Expected: FAIL because the three helpers and defaults export do not exist.

- [ ] **Step 3: Add minimal pure helpers and typed declarations**

Implement clamped, finite-safe calculations. Formation linearly normalizes `column / (columnCount - 1)`. Sine shimmer adds a non-negative row phase offset to horizontal progress. Magnet falloff uses `1 - distance / radius`, multiplies by strength, caps the displacement vector, and returns `{ x: 0, y: 0 }` for zero/invalid radius or points outside the radius.

Add stable defaults for:

```js
{
  formationDurationMs: 260,
  formationSpreadMs: 420,
  formationPeakBrightness: 1.55,
  shimmerDurationMs: 760,
  shimmerSpreadMs: 520,
  shimmerAmplitudeMs: 72,
  shimmerFrequency: 1,
  shimmerColorMixPercent: 46,
  shimmerPeakBrightness: 1.65,
  shimmerGlowRadius: 14,
  shimmerGlowOpacity: 46,
  magnetRadius: 90,
  magnetStrength: 1,
  magnetMaxDisplacement: 6,
  magnetSpringMs: 180,
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test lib/direction-two-intro.test.mjs`

Expected: all focused tests pass.

### Task 2: Phase-separated formation and sine shimmer

**Files:**
- Modify: `components/direction-two-shell.tsx`
- Modify: `app/globals.css`
- Test: `lib/direction-two-intro.test.mjs`

**Interfaces:**
- Consumes: Task 1 timing helpers and `directionTwoTitleMotionDefaults`
- Produces: title phases `"forming" | "shimmering" | "interactive"`
- Produces: per-pixel `--mark-formation-delay` and `--mark-shimmer-delay`

- [ ] **Step 1: Write failing source-contract tests**

Add narrow assertions proving the component has explicit phases, passes global row/column coordinates, uses the pure delay helpers, and no longer uses `direction-two-mark-layer-enter`, `direction-two-mark-pixel-resolve`, or the hover-triggered `direction-two-mark-shimmering` restart. Assert formation CSS contains no `transform`, `blur`, or `box-shadow`, and shimmer CSS contains no `transform`.

The production break caught is reintroducing competing timelines, diagonal formation, or geometry motion.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test lib/direction-two-intro.test.mjs`

Expected: FAIL because current code still has layer entry, row-based resolve delay, and pointer-enter shimmer restart.

- [ ] **Step 3: Implement phase sequencing and CSS**

In `InkPatternMark`:

- initialize to `interactive` for reduced motion and `forming` otherwise;
- move to `shimmering` after `formationDurationMs + formationSpreadMs`;
- move to `interactive` after `shimmerDurationMs + shimmerSpreadMs + shimmerAmplitudeMs`;
- clear phase timers on dependency change and unmount;
- provide a stable `data-mark-phase`.

In the pixel renderer:

- compute one global column and row for every dense pixel;
- use Task 1 helpers for the two delays;
- attach `--mark-formation-delay` and `--mark-shimmer-delay`.

In CSS:

- replace layer entry and pixel resolve with `direction-two-mark-form`;
- add `direction-two-mark-sine-shimmer`;
- scope each keyframe to its matching phase;
- keep inactive pixels stationary;
- remove hover shimmer restart rules.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test lib/direction-two-intro.test.mjs`

Expected: all focused tests pass.

### Task 3: Pointer-local magnetic pixels

**Files:**
- Modify: `components/direction-two-shell.tsx`
- Modify: `app/globals.css`
- Test: `lib/direction-two-intro.test.mjs`

**Interfaces:**
- Consumes: `getDirectionTwoMagnetOffset` and live title-motion settings
- Produces: per-pixel `--mark-magnet-x` and `--mark-magnet-y`

- [ ] **Step 1: Write failing interaction-contract tests**

Assert the title stores active pixel elements in a ref, handles `onPointerMove` and `onPointerLeave`, coalesces updates through `requestAnimationFrame`, calls `getDirectionTwoMagnetOffset`, writes CSS properties directly, ignores non-mouse pointers, and resets both offsets to `0px`. Assert the magnetic transform is scoped only to the interactive phase and reduced-motion CSS removes it.

The production break caught is React-state pointer rendering, attraction on touch, queued frames, stale offsets, or hover transforms during intro.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test lib/direction-two-intro.test.mjs`

Expected: FAIL because magnetic pointer handling and CSS variables are absent.

- [ ] **Step 3: Implement one-frame pointer updates**

Collect active pixel nodes through the mark container ref. On a mouse pointer move, save the latest client coordinates and schedule at most one animation frame. In that frame, measure the mark and each active pixel center, calculate the local offset with Task 1's helper, and set `--mark-magnet-x`/`--mark-magnet-y` directly. On leave, cancellation, reduced motion, or phase change, cancel the frame and reset every active pixel.

Use CSS transform only in `data-mark-phase="interactive"`, with the tuned return duration and `var(--ease-out-strong)`. Formation and shimmer keep `transform: translate3d(0, 0, 0)`.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test lib/direction-two-intro.test.mjs`

Expected: all focused tests pass.

### Task 4: Development-only DialKit tuning

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `app/layout.tsx`
- Modify: `components/direction-two-shell.tsx`
- Test: `lib/direction-two-intro.test.mjs`

**Interfaces:**
- Consumes: `directionTwoTitleMotionDefaults`
- Produces: one `INKOG title motion` DialKit panel with stable id `inkog-title-motion`

- [ ] **Step 1: Install the official package**

Run: `npm install dialkit@^1.4.3`

Expected: manifest and lockfile include DialKit; existing `motion` dependency satisfies the peer/example requirement.

- [ ] **Step 2: Write failing DialKit wiring tests**

Assert the normal stylesheet and a single development-only `<DialRoot />` are mounted, the title calls `useDialKit` with `satisfies DialConfig`, and all formation, shimmer, and magnet control groups feed the existing settings pipeline.

The production break caught is an installed-but-invisible panel, production exposure, custom UI, or controls disconnected from animation values.

- [ ] **Step 3: Run the focused test and verify RED**

Run: `node --test lib/direction-two-intro.test.mjs`

Expected: FAIL because DialRoot, stylesheet, hook, panel, and grouped controls are absent.

- [ ] **Step 4: Add minimal default DialKit wiring**

Import `DialRoot` and `dialkit/styles.css` in the root layout, render one `<DialRoot />` only in development, and call `useDialKit("INKOG title motion", config, { id: "inkog-title-motion" })` inside `InkPatternMark`. Use nested `formation`, `shimmer`, and `magnet` groups, mutable tuples with `satisfies DialConfig`, no persistence, no custom styling, and no `productionEnabled`.

- [ ] **Step 5: Run focused and static verification**

Run:

```bash
node --test lib/direction-two-intro.test.mjs
npx tsc --noEmit
git diff --check
npm run build
```

Expected: every command exits successfully.

### Task 5: Browser feel-check on the running port

**Files:**
- No source changes unless a browser-only defect is reproduced with a new failing test first.

**Interfaces:**
- Consumes: completed title motion and DialKit integration
- Produces: verified behavior at `/` and `1205x846`

- [ ] **Step 1: Detect the existing frontend listener**

Check port `3000` first and use it if running. Start the frontend only if no listener exists.

- [ ] **Step 2: Verify visible sequencing**

At `/` with a `1205x846` viewport, hard reload and confirm:

- a vertical formation edge travels strictly left to right;
- the last column settles before the shimmer begins;
- one sine-shaped shimmer completes without jitter;
- rapid pointer motion attracts only nearby pixels and returns cleanly;
- DialKit is visible in development and each group changes the intended behavior.

- [ ] **Step 3: Verify accessibility fallback**

Emulate reduced motion, reload, and confirm the settled static word appears immediately with no shimmer or magnetic movement.

- [ ] **Step 4: Final repository checks**

Run `git status --short`, confirm unrelated `lib/room-background.mjs` and `lib/room-background.test.mjs` remain unstaged and unmodified by this task, and stage only the title-motion implementation files.
