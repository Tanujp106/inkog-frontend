# Direction Two Intro Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a smaller animated landing sequence to `/playground` Direction 2, then reveal the terminal shell with theme-tinted atmosphere and a desktop custom cursor.

**Architecture:** Add one deterministic helper module for scramble frames and ambient dot layout, then layer a small amount of client-side orchestration into `direction-two-shell.tsx`. Keep the motion mostly CSS-based, use reduced-motion fallbacks, and preserve the existing terminal session logic.

**Tech Stack:** Next.js App Router, React 19 client components, TypeScript, Tailwind utility classes, small `.mjs` helper modules, node:test

---

### Task 1: Add deterministic intro helpers

**Files:**
- Create: `lib/direction-two-intro.test.mjs`
- Create: `lib/direction-two-intro.mjs`
- Create: `lib/direction-two-intro.mjs.d.ts`

- [ ] **Step 1: Write the failing test**

```js
import assert from "node:assert/strict";
import test from "node:test";

import {
  createDirectionTwoAmbientDots,
  directionTwoBrandLabels,
  getDirectionTwoScrambleFrame,
} from "./direction-two-intro.mjs";

test("returns the final text once scramble progress is complete", () => {
  assert.equal(getDirectionTwoScrambleFrame("anonymous rooms", 1), "anonymous rooms");
});

test("preserves spaces while scrambling unfinished characters", () => {
  const frame = getDirectionTwoScrambleFrame("go fast", 0.3);
  assert.equal(frame.length, 7);
  assert.equal(frame[2], " ");
});

test("exposes the rotating intro labels in the expected order", () => {
  assert.deepEqual(directionTwoBrandLabels, ["anonymous rooms", "temporary chat"]);
});

test("creates bounded ambient dot data", () => {
  const values = [0.1, 0.2, 0.3, 0.4, 0.5];
  let index = 0;
  const dots = createDirectionTwoAmbientDots(() => values[index++ % values.length], 2);

  assert.equal(dots.length, 2);
  assert.deepEqual(dots[0], {
    id: "dot-0",
    left: 10,
    top: 20,
    size: 2,
    delay: 1.2,
    duration: 3.5,
    opacity: 0.32,
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node lib/direction-two-intro.test.mjs`
Expected: FAIL with module-not-found or missing export errors because the helper does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```js
export const directionTwoBrandLabels = ["anonymous rooms", "temporary chat"];

const scrambleAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export function getDirectionTwoScrambleFrame(target, progress) {
  if (progress >= 1) return target;
  const safeProgress = Math.max(0, Math.min(1, progress));
  const revealIndex = Math.floor(target.length * safeProgress);

  return [...target].map((char, index) => {
    if (char === " ") return " ";
    if (index < revealIndex) return char;
    return scrambleAlphabet[(index + Math.floor(safeProgress * 17)) % scrambleAlphabet.length];
  }).join("");
}

export function createDirectionTwoAmbientDots(random = Math.random, count = 16) {
  return Array.from({ length: count }, (_, index) => ({
    id: `dot-${index}`,
    left: Math.round(random() * 100),
    top: Math.round(random() * 100),
    size: random() > 0.45 ? 3 : 2,
    delay: Number((random() * 3).toFixed(1)),
    duration: Number((2.5 + random() * 2).toFixed(1)),
    opacity: Number((0.2 + random() * 0.4).toFixed(2)),
  }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node lib/direction-two-intro.test.mjs`
Expected: PASS

### Task 2: Integrate the new intro sequence into the shell

**Files:**
- Modify: `components/direction-two-shell.tsx`
- Modify: `lib/direction-two-shell.test.mjs`

- [ ] **Step 1: Add any new deterministic shell assertions first**

```js
import { commands } from "./direction-two-shell.mjs";

test("direction two keeps style available as a top-level command", () => {
  assert.ok(commands.includes("style"));
});
```

- [ ] **Step 2: Implement the shell updates**

```tsx
const ambientDots = useMemo(() => createDirectionTwoAmbientDots(), []);
const [isTerminalVisible, setIsTerminalVisible] = useState(false);
const [rotatingLabel, setRotatingLabel] = useState(directionTwoBrandLabels[0]);
const scrambledHeadline = useDirectionTwoScrambleText("start a room without carrying an identity", {
  durationMs: 1100,
});
```

Include:

- compact intro layout
- rotating brand label
- delayed prompt/transcript reveal
- background dot layer
- custom cursor component
- reduced-motion fallback

- [ ] **Step 3: Run targeted tests**

Run: `node lib/direction-two-shell.test.mjs`
Expected: PASS

### Task 3: Add supporting styles and verify the app

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Add motion and atmosphere styles**

```css
:root {
  --ease-out-strong: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-in-out-strong: cubic-bezier(0.77, 0, 0.175, 1);
}

@keyframes direction-two-dot-blink {
  0%, 100% { opacity: 0.08; transform: scale(1); }
  50% { opacity: var(--dot-opacity, 0.32); transform: scale(1.08); }
}
```

- [ ] **Step 2: Run targeted helper tests**

Run: `node lib/direction-two-intro.test.mjs && node lib/direction-two-scroll.test.mjs`
Expected: PASS

- [ ] **Step 3: Run the full frontend build**

Run: `npm run build`
Expected: exit code 0 with successful Next.js production build output.
