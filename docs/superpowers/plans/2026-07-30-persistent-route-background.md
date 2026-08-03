# Persistent Route Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep one ambient shader, glow, and pixel field mounted while the landing and room foregrounds change routes.

**Architecture:** A focused client component owns every ambient visual and is mounted once by `RouteHandoffProvider`, which persists above Next.js route content. Landing and room components render transparent foreground shells and no longer create route-local ambient state.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, Node test runner

## Global Constraints

- Preserve all landing and room foreground dimensions, spacing, and behavior.
- Preserve the fixed composer geometry, including its `24px` bottom offset.
- Preserve shader opacity `0.43` on desktop and `0.34` up to `639px`.
- Do not change room networking, navigation, theme, or handoff state logic.
- Keep the dedicated not-found Breakout background unchanged.

---

### Task 1: Define Persistent Background Ownership

**Files:**
- Create: `components/direction-two-ambient-background.tsx`
- Modify: `components/route-handoff-provider.tsx`
- Modify: `lib/room-background.test.mjs`

**Interfaces:**
- Consumes: `AmbientShaderBackground`, `createDirectionTwoAmbientPixels`, `createDirectionTwoAmbientRandom`, `directionTwoAmbientAtmosphere`, and `directionTwoAmbientConfig`
- Produces: `DirectionTwoAmbientBackground(): JSX.Element`

- [ ] **Step 1: Write the failing ownership regression test**

Replace the route-local expectations in `lib/room-background.test.mjs` with
source assertions that require the provider to render one shared component:

```js
test("keeps one persistent ambient background above both routes", () => {
  const provider = readFileSync(
    new URL("../components/route-handoff-provider.tsx", import.meta.url),
    "utf8",
  );
  const ambient = readFileSync(
    new URL("../components/direction-two-ambient-background.tsx", import.meta.url),
    "utf8",
  );

  assert.equal((provider.match(/<DirectionTwoAmbientBackground \\/>/g) ?? []).length, 1);
  assert.match(ambient, /createDirectionTwoAmbientPixels/);
  assert.match(ambient, /directionTwoAmbientAtmosphere/);
  assert.match(ambient, /<AmbientShaderBackground/);
  assert.match(ambient, /isMobileViewport \\? 0\\.34 : 0\\.43/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
node --test lib/room-background.test.mjs
```

Expected: FAIL because `components/direction-two-ambient-background.tsx` does
not exist and the provider does not own the background.

- [ ] **Step 3: Implement the shared component and provider stacking**

Create `DirectionTwoAmbientBackground` with one memoized pixel set, the existing
atmosphere styles, a responsive `matchMedia("(max-width: 639px)")` listener,
and this stable outer boundary:

```tsx
<div
  aria-hidden="true"
  className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
  data-direction-two-ambient-background=""
>
  <div className="direction-two-ambient-glow absolute inset-0" style={ambientAtmosphereStyle} />
  {ambientPixels.map(pixel => /* existing pixel markup */)}
  <AmbientShaderBackground
    opacity={isMobileViewport ? 0.34 : 0.43}
    style={{ mixBlendMode: "screen", zIndex: 0 }}
  />
</div>
```

Render the component once inside `RouteHandoffProvider` and wrap `children` in
a `relative z-10` foreground layer:

```tsx
<RouteHandoffContext.Provider value={value}>
  <DirectionTwoAmbientBackground />
  <div className="relative z-10">{children}</div>
</RouteHandoffContext.Provider>
```

- [ ] **Step 4: Run the focused test to verify it passes**

Run:

```bash
node --test lib/room-background.test.mjs
```

Expected: PASS.

### Task 2: Remove Route-Local Ambient Instances

**Files:**
- Modify: `components/direction-two-shell.tsx`
- Modify: `app/room/[id]/page.tsx`
- Modify: `lib/room-background.test.mjs`

**Interfaces:**
- Consumes: the shared background through `RouteHandoffProvider`
- Produces: landing and room foregrounds with no ambient imports, state, or JSX

- [ ] **Step 1: Extend the regression test to reject route-local backgrounds**

Add:

```js
test("does not remount ambient visuals inside either route", () => {
  const landing = readFileSync(
    new URL("../components/direction-two-shell.tsx", import.meta.url),
    "utf8",
  );
  const room = readFileSync(new URL("../app/room/[id]/page.tsx", import.meta.url), "utf8");

  for (const route of [landing, room]) {
    assert.doesNotMatch(route, /AmbientShaderBackground/);
    assert.doesNotMatch(route, /createDirectionTwoAmbientPixels/);
    assert.doesNotMatch(route, /direction-two-ambient-glow/);
  }
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
node --test lib/room-background.test.mjs
```

Expected: FAIL because both routes still render their own ambient visuals.

- [ ] **Step 3: Remove route-owned ambient code without changing foreground geometry**

Delete ambient imports, memoized pixel state, atmosphere styles, responsive
shader-only state from the room page, and ambient JSX from both routes. Change
only the landing route root background utility from `bg-[var(--background)]`
to `bg-transparent`; retain every width, padding, min-height, and composer
value.

- [ ] **Step 4: Run focused and adjacent tests**

Run:

```bash
node --test lib/room-background.test.mjs lib/route-handoff.test.mjs lib/direction-two-intro.test.mjs
```

Expected: all tests PASS.

- [ ] **Step 5: Verify source integrity**

Run:

```bash
git diff --check
npx tsc --noEmit
```

Expected: both commands exit `0`.

- [ ] **Step 6: Verify the running application**

Use the already-running development port. Confirm the page compiles without
console errors, the persistent background DOM node survives a client-side route
transition, and the landing and room composer bounding boxes do not change. If
no usable room is available, verify the mounted background ownership in the
runtime and report the untested room-entry boundary explicitly.
