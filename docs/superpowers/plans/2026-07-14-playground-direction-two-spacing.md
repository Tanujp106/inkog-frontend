# Playground Direction 2 Spacing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the three requested Direction 2 `/playground` spacing refinements while preserving current behavior and unrelated working-tree edits.

**Architecture:** Keep the change local to `components/direction-two-shell.tsx`, where the terminal wrapper and desktop intro spacing are defined. Update the existing source-shape tests in the two focused layout test files so the requested spacing remains explicit and regression-tested.

**Tech Stack:** React/TSX, Tailwind utility classes, Node.js built-in test runner, Next.js dev server.

## Global Constraints

- Use the existing frontend listener at `127.0.0.1:3000` for browser verification.
- Do not change Direction 1, behavior, breakpoints, or unrelated working-tree changes.
- Make no dependency or port changes.

---

### Task 1: Update Direction 2 spacing selectors and focused assertions

**Files:**
- Modify: `components/direction-two-shell.tsx:1294-1327`
- Modify: `lib/direction-two-mobile-layout.test.mjs:114-120`
- Modify: `lib/direction-two-terminal-layout.test.mjs:1-12`

**Interfaces:**
- Consumes: Existing Direction 2 shell markup and source-shape tests.
- Produces: `pb-3`, desktop `pt-5`, and desktop highlight `space-y-4` spacing with matching assertions.

- [ ] **Step 1: Update the component classes**

  In `components/direction-two-shell.tsx`, make these exact replacements:

  ```tsx
  <header className="hidden flex-col gap-4 pb-5 pt-5 sm:flex sm:pt-12">
  <div className="space-y-4 pt-8 text-[12px] leading-[18px] text-[var(--muted-foreground)] sm:text-[13px]">
  className={`direction-two-mobile-terminal flex min-h-0 flex-1 flex-col pb-3 pt-11 transition-[opacity,transform] duration-300 [transition-timing-function:var(--ease-out-strong)] sm:pt-12 ${
  ```

- [ ] **Step 2: Update the focused source assertions**

  In `lib/direction-two-mobile-layout.test.mjs`, replace the existing mobile terminal spacing expectation with:

  ```js
  assert.match(source, /direction-two-mobile-terminal[^\"]*pb-3[^\"]*pt-11[^\"]*sm:pt-12/);
  ```

  Keep the existing `max-w-[360px] space-y-6` assertion because it covers the separate mobile intro spacing. In `lib/direction-two-terminal-layout.test.mjs`, add assertions covering the desktop values:

  ```js
  assert.match(source, /hidden flex-col gap-4 pb-5 pt-5 sm:flex sm:pt-12/);
  assert.match(source, /space-y-4 pt-8 text-\[12px\] leading-\[18px\]/);
  ```

- [ ] **Step 3: Run focused tests**

  Run from `/Users/tanuj/Desktop/Incog/inkog-frontend`:

  ```bash
  node --test lib/direction-two-mobile-layout.test.mjs lib/direction-two-terminal-layout.test.mjs
  ```

  Expected: all tests pass with exit code 0.

- [ ] **Step 4: Verify the running route**

  Confirm the existing listener and route from `/Users/tanuj/Desktop/Incog`:

  ```bash
  lsof -nP -iTCP:3000 -sTCP:LISTEN
  curl -sS -I http://127.0.0.1:3000/playground
  ```

  Expected: port 3000 is already listening and `/playground` responds successfully; do not start another port.
