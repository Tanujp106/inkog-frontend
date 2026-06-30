# Direction Two Mark Flip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add shimmer plus a looping pixel-flip morph from the large `inkog` mark to `anonymous chat` in `/playground` Direction 2.

**Architecture:** Put deterministic pixel-word data and conversion helpers in `lib/direction-two-intro.mjs`, then let `direction-two-shell.tsx` switch between the two mark words on a timer. Use CSS for the shimmer sweep and per-pixel flip transitions so the terminal behavior stays untouched.

**Tech Stack:** Next.js App Router, React client components, TypeScript, CSS animations, node:test

---

### Task 1: Add deterministic pixel-word helpers

**Files:**
- Modify: `lib/direction-two-intro.mjs`
- Modify: `lib/direction-two-intro.mjs.d.ts`
- Modify: `lib/direction-two-intro.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
test("exposes the looping mark words in the expected order", () => {
  assert.deepEqual(directionTwoMarkWords, ["inkog", "anonymous chat"]);
});

test("builds pixel patterns for the anonymous chat mark", () => {
  const pattern = buildDirectionTwoPixelWord("anonymous chat");
  assert.equal(pattern.length, 14);
  assert.equal(pattern[0][0], "01110");
  assert.equal(pattern[9][0], "00000");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node lib/direction-two-intro.test.mjs`
Expected: FAIL with missing export errors.

- [ ] **Step 3: Write minimal implementation**

```js
export const directionTwoMarkWords = ["inkog", "anonymous chat"];

export function buildDirectionTwoPixelWord(word) {
  return [...word.toLowerCase()].map(char => directionTwoPixelAlphabet[char] ?? directionTwoPixelAlphabet[" "]);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node lib/direction-two-intro.test.mjs`
Expected: PASS

### Task 2: Wire the timed flip into the restored hero mark

**Files:**
- Modify: `components/direction-two-shell.tsx`

- [ ] **Step 1: Add the timed mark-word state**

```tsx
const [markWord, setMarkWord] = useState(directionTwoMarkWords[0]);
```

- [ ] **Step 2: Add the looping effect and pass the active word into the mark**

```tsx
useEffect(() => {
  if (prefersReducedMotion) return;
  const intervalId = window.setInterval(() => {
    setMarkWord(current => current === "inkog" ? "anonymous chat" : "inkog");
  }, 2800);
  return () => window.clearInterval(intervalId);
}, [prefersReducedMotion]);
```

- [ ] **Step 3: Update `InkPatternMark` to render from helper-built word patterns**

```tsx
const patterns = buildDirectionTwoPixelWord(word);
```

### Task 3: Add shimmer and flip styles, then verify

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Add mark shimmer and flip classes**

```css
@keyframes direction-two-mark-sweep {
  from { transform: translateX(-20%); opacity: 0; }
  20%, 80% { opacity: 1; }
  to { transform: translateX(120%); opacity: 0; }
}
```

- [ ] **Step 2: Run targeted tests**

Run: `node lib/direction-two-intro.test.mjs`
Expected: PASS

- [ ] **Step 3: Run the full frontend build**

Run: `npm run build`
Expected: exit code 0 with successful Next.js production build output.
