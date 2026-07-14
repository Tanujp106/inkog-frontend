# Full-Screen Breakout 404 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Replace the inset Breakout panel with a true viewport arena over the unchanged Inkog shader, using a denser destructible 404, progressive difficulty, mute-aware sounds, any-key launch, and confetti with only restart and home actions.

**Architecture:** Keep geometry, input rules, resize transforms, collision events, and speed progression in lib/not-found-breakout.mjs. Add a deterministic confetti module and extend the existing sound profile. The client component owns measurement, canvas drawing, event-to-sound playback, and the DOM HUD.

**Tech Stack:** Next.js 15 App Router, React, Canvas 2D, existing SystemSoundProvider, CSS, Node test runner.

## Global Constraints

- Keep AmbientShaderBackground and its theme configuration unchanged.
- Remove both grids and the inset panel; viewport edges are game boundaries.
- Keep the 404 large with approximately 90-110 destructible square bricks.
- R always restarts; modifier-only keys do not launch.
- Preserve destroyed bricks and speed after life loss; reset on third miss or restart.
- Honor global mute; add no 404-specific toggle.
- Cleared state shows only restart and back to home over square confetti.
- Add no dependency, route, backend, score, power-up, level, or autoplay.
- Preserve unrelated Direction 2 and room changes.

---

### Task 1: Responsive dense physics, launch rules, events, and speed

**Files:**
- Modify: lib/not-found-breakout.mjs
- Modify: lib/not-found-breakout.test.mjs

**Produces:**
- create404Bricks(width, height)
- resizeBreakout(state, width, height)
- shouldLaunchBreakoutForKey(key)
- State fields speedMultiplier and events
- Events launch, wall, paddle, brickA, brickB, brickC, miss, clear

- [ ] **Step 1: Write failing dense-layout and resize tests**

~~~js
test("creates a large dense 9 by 13 pixel 404", () => {
  const bricks = create404Bricks(1200, 700);
  assert.ok(bricks.length >= 90 && bricks.length <= 110);
  assert.deepEqual([...new Set(bricks.map(brick => brick.row))], Array.from({ length: 13 }, (_, index) => index));
  const left = Math.min(...bricks.map(brick => brick.x));
  const right = Math.max(...bricks.map(brick => brick.x + brick.width));
  assert.ok(bricks.every(brick => brick.width === brick.height));
  assert.ok((right - left) / 1200 >= 0.62);
});

test("resize preserves ids and progress", () => {
  const state = launchBreakout(createInitialBreakoutState({ width: 800, height: 520 }));
  state.bricks[0].isActive = false;
  const resized = resizeBreakout(state, 1200, 700);
  assert.equal(resized.bricks.find(brick => brick.id === state.bricks[0].id).isActive, false);
  assert.equal(resized.mode, "running");
});
~~~

- [ ] **Step 2: Write failing launch, event, and speed tests**

~~~js
test("ordinary keys launch while R and modifiers stay reserved", () => {
  for (const key of ["a", "7", " ", "Enter", "ArrowLeft", "ArrowRight"]) {
    assert.equal(shouldLaunchBreakoutForKey(key), true);
  }
  for (const key of ["r", "R", "Shift", "Control", "Alt", "Meta"]) {
    assert.equal(shouldLaunchBreakoutForKey(key), false);
  }
});

test("brick hits emit and increase capped speed", () => {
  const running = launchBreakout(createInitialBreakoutState());
  const target = running.bricks[0];
  const collision = {
    ...running,
    ball: {
      ...running.ball,
      x: target.x + target.width / 2,
      y: target.y + target.height + running.ball.radius - 1,
      vx: 0,
      vy: -260,
    },
  };
  const result = stepBreakout(collision, 1 / 60);
  assert.ok(result.events.some(event => /^brick[ABC]$/.test(event)));
  assert.ok(result.speedMultiplier > 1 && result.speedMultiplier <= 1.7);
});
~~~

Also test launch, wall, paddle, miss, clear, life-loss speed preservation, and reset to 1.

- [ ] **Step 3: Run node --test lib/not-found-breakout.test.mjs**

Expected RED: dense geometry, resize, launch-key helper, events, and speed fields are absent.

- [ ] **Step 4: Implement the engine**

Use hand-authored 9x13 patterns and stable IDs. Initialize speedMultiplier: 1 and events: []. Add:

~~~js
export function shouldLaunchBreakoutForKey(key) {
  if ([" ", "Enter", "ArrowLeft", "ArrowRight"].includes(key)) return true;
  return /^[a-z0-9]$/i.test(key) && key.toLowerCase() !== "r";
}

export function resizeBreakout(state, width, height) {
  const activeById = new Map(state.bricks.map(brick => [brick.id, brick.isActive]));
  const bricks = create404Bricks(width, height).map(brick => ({
    ...brick,
    isActive: activeById.get(brick.id) ?? brick.isActive,
  }));
  const scaleX = width / state.width;
  const scaleY = height / state.height;
  const paddle = {
    ...state.paddle,
    x: Math.min(Math.max(state.paddle.x * scaleX, state.paddle.width / 2), width - state.paddle.width / 2),
    y: height - Math.max(44, height * 0.085),
  };
  const ball = {
    ...state.ball,
    x: Math.min(Math.max(state.ball.x * scaleX, state.ball.radius), width - state.ball.radius),
    y: Math.min(Math.max(state.ball.y * scaleY, state.ball.radius), height - state.ball.radius),
  };
  return { ...state, width, height, bricks, paddle, ball, events: [] };
}
~~~

After brick destruction:

~~~js
const destroyed = bricks.length - bricks.filter(brick => brick.isActive).length;
const speedMultiplier = Math.min(1.7, 1 + (destroyed / bricks.length) * 0.7);
~~~

Normalize velocity to BASE_BALL_SPEED times speedMultiplier and append one event per collision.

- [ ] **Step 5: Rerun the engine test and confirm GREEN**

- [ ] **Step 6: Commit only the engine files**

~~~bash
git add lib/not-found-breakout.mjs lib/not-found-breakout.test.mjs
git commit -m "Build responsive dense Breakout physics"
~~~

---

### Task 2: Breakout sounds through the existing mute system

**Files:**
- Modify: lib/system-sound-profile.mjs
- Modify: lib/system-sound-provider.tsx
- Modify: lib/system-sound.test.mjs

**Produces:** breakoutLaunch, breakoutWall, breakoutPaddle, breakoutBrickA/B/C, breakoutMiss, breakoutClear through useSystemSound().play(name).

- [ ] **Step 1: Write the failing profile test**

~~~js
test("breakout sounds are short, distinct, and controlled", () => {
  const names = [
    "breakoutLaunch", "breakoutWall", "breakoutPaddle",
    "breakoutBrickA", "breakoutBrickB", "breakoutBrickC",
    "breakoutMiss", "breakoutClear",
  ];
  assert.ok(names.every(name => systemSoundNames.includes(name)));
  assert.equal(new Set(["breakoutBrickA", "breakoutBrickB", "breakoutBrickC"].map(name => systemSoundSpecs[name][0].frequency)).size, 3);
  assert.ok(systemSoundSpecs.breakoutClear.length >= 3);
  assert.ok(names.every(name => getSystemSoundPeakGain(name) >= 0.24));
  assert.ok(names.every(name => getSystemSoundPeakGain(name) <= 0.5));
});
~~~

- [ ] **Step 2: Run node --test lib/system-sound.test.mjs and confirm RED**

- [ ] **Step 3: Add names, TypeScript union members, and specs**

~~~js
breakoutWall: [{ frequency: 310, gain: 0.25, type: "triangle", duration: 0.045 }],
breakoutPaddle: [{ frequency: 430, gain: 0.28, type: "square", duration: 0.055 }],
breakoutBrickA: [{ frequency: 640, gain: 0.24, type: "square", duration: 0.04 }],
breakoutBrickB: [{ frequency: 720, gain: 0.24, type: "square", duration: 0.04 }],
breakoutBrickC: [{ frequency: 810, gain: 0.24, type: "square", duration: 0.04 }],
~~~

Keep collision cues below 0.08 seconds, use a low two-note miss, and a three-note clear flourish.

- [ ] **Step 4: Rerun sound tests and confirm GREEN**

- [ ] **Step 5: Commit only sound files**

~~~bash
git add lib/system-sound-profile.mjs lib/system-sound-provider.tsx lib/system-sound.test.mjs
git commit -m "Add Breakout sound effects"
~~~

---

### Task 3: Deterministic square confetti

**Files:**
- Create: lib/not-found-confetti.mjs
- Create: lib/not-found-confetti.test.mjs

**Produces:** createBreakoutConfetti(width, height, count = 160) and stepBreakoutConfetti(particles, deltaSeconds, width, height).

- [ ] **Step 1: Write the failing tests**

~~~js
test("creates deterministic square confetti across the arena", () => {
  const first = createBreakoutConfetti(1000, 600, 160);
  assert.deepEqual(first, createBreakoutConfetti(1000, 600, 160));
  assert.equal(first.length, 160);
  assert.ok(first.every(particle => particle.size >= 4 && particle.size <= 10));
  assert.ok(first.some(particle => particle.x < 250));
  assert.ok(first.some(particle => particle.x > 750));
});

test("advances, rotates, and expires confetti", () => {
  const initial = createBreakoutConfetti(800, 520, 12);
  const next = stepBreakoutConfetti(initial, 1 / 60, 800, 520);
  assert.ok(next.some((particle, index) => particle.y !== initial[index].y));
  assert.ok(next.every(particle => particle.life < 1));
});
~~~

- [ ] **Step 2: Run node --test lib/not-found-confetti.test.mjs and confirm module-not-found RED**

- [ ] **Step 3: Implement a local seeded generator and particles**

Spawn 160 square particles across the upper 45%. Use sizes 4-10, gravity, drag, rotation, finite life, and deterministic colorIndex. Remove expired or below-arena particles.

- [ ] **Step 4: Rerun confetti tests and confirm GREEN**

- [ ] **Step 5: Commit only confetti files**

~~~bash
git add lib/not-found-confetti.mjs lib/not-found-confetti.test.mjs
git commit -m "Add square Breakout confetti"
~~~

---

### Task 4: Full-screen canvas, HUD, input, audio, and clear actions

**Files:**
- Modify: components/not-found-breakout.tsx
- Modify: app/globals.css
- Modify: lib/not-found-page.test.mjs
- Keep unchanged: components/ambient-shader-background.tsx
- Keep thin: app/not-found.tsx

**Consumes:** engine events and resize helpers, confetti helpers, useSystemSound().play(name).

- [ ] **Step 1: Write failing page/client contract tests**

~~~js
assert.match(game, /ResizeObserver/);
assert.match(game, /shouldLaunchBreakoutForKey/);
assert.match(game, /useSystemSound/);
assert.match(game, /createBreakoutConfetti/);
assert.match(game, />restart</i);
assert.match(styles, /border-bottom: 1px solid/);
assert.doesNotMatch(styles, /linear-gradient\(rgba\(255, 255, 255, 0\.022\)/);
assert.doesNotMatch(styles, /background-size: 20px 20px/);
assert.doesNotMatch(styles, /\.not-found-breakout-frame/);
assert.doesNotMatch(game, /for \(let x = 20\.5/);
~~~

Also assert AmbientShaderBackground remains mounted, both home links remain, and cleared markup contains only restart/home actions.

- [ ] **Step 2: Run node --test lib/not-found-page.test.mjs and confirm RED**

- [ ] **Step 3: Make canvas transparent and viewport-sized**

Remove frame wrapper, fixed aspect ratio, canvas fill background, and grid loops. Observe arena bounds with ResizeObserver, update backing buffer at DPR max 2, and call resizeBreakout.

- [ ] **Step 4: Implement key precedence and sound dispatch**

Handle R first. Launch ordinary keys from idle/waiting; arrows launch then move. Ignore modifier-only launch keys. Map events:

~~~ts
const soundByEvent = {
  launch: "breakoutLaunch",
  wall: "breakoutWall",
  paddle: "breakoutPaddle",
  brickA: "breakoutBrickA",
  brickB: "breakoutBrickB",
  brickC: "breakoutBrickC",
  miss: "breakoutMiss",
  clear: "breakoutClear",
} as const;
~~~

Play each event once. Add no local mute control.

- [ ] **Step 5: Add confetti and two clear actions**

Initialize once on cleared transition. Animate in the existing frame; reduced motion draws a static scatter. Hide normal HUD, ball, paddle, and lives. Render only:

~~~tsx
<div className="not-found-breakout-clear-actions">
  <button type="button" onClick={handleRestart}>restart</button>
  <Link href="/">back to home</Link>
</div>
~~~

- [ ] **Step 6: Implement full-screen CSS**

Use full width and 100dvh, no page grid, full-width header bottom border, and viewport-bottom border. Position prompt top-center, lives top-right, controls lower-left, and home lower-right with responsive safe-area padding. Use no colored HUD container.

- [ ] **Step 7: Run all focused tests**

~~~bash
node --test lib/not-found-page.test.mjs lib/not-found-breakout.test.mjs lib/not-found-confetti.test.mjs lib/system-sound.test.mjs
~~~

Expected: all pass.

- [ ] **Step 8: Commit only client/layout files**

~~~bash
git add app/not-found.tsx app/globals.css components/not-found-breakout.tsx lib/not-found-page.test.mjs
git commit -m "Make Breakout 404 a full-screen experience"
~~~

---

### Task 5: Final verification and review

- [ ] **Step 1: Run focused tests, git diff --check, and npm run build**

- [ ] **Step 2: Confirm 127.0.0.1:3000 is already serving; start no extra port**

- [ ] **Step 3: Verify desktop and mobile**

Check shader parity, absent grids/panel, viewport collision edges, large dense 404, keyboard exclusions and R, progressive speed, mute-aware sound, confetti, two clear actions, restart reset, overflow, and console.

- [ ] **Step 4: Request final review**

Review only intended 404, confetti, and sound files. Fix Critical and Important issues, then rerun focused tests and build.
