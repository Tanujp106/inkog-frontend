# Persistent Landing-to-Room Background Design

## Goal

Make client-side navigation between the landing page and a room feel like a
single continuous surface. The ambient shader, glow, and animated pixel field
must not remount, reseed, restart, or shift while the URL and foreground
content change.

## Scope

- Preserve the existing landing and room foreground layouts.
- Preserve the fixed composer width, position, and handoff behavior exactly.
- Preserve the current desktop shader opacity of `0.43`.
- Preserve the current mobile shader opacity of `0.34` at widths up to `639px`.
- Preserve the existing shader colors, glow styling, pixel generation, and
  reduced-motion behavior.
- Do not add a new dependency or change room data, socket, or navigation logic.

## Architecture

Create one client component, `DirectionTwoAmbientBackground`, that renders the
existing `AmbientShaderBackground`, ambient glow, and animated pixel field.
Mount it once inside `RouteHandoffProvider`, which already lives above route
content in the root layout and remains mounted during client-side navigation.

The shared component owns:

- the responsive shader opacity state;
- one memoized ambient pixel set for the lifetime of the app shell;
- the atmosphere custom properties used by the glow and pixels; and
- a fixed, viewport-sized, pointer-inert background stacking layer.

Landing and room route components will stop importing, generating, or rendering
their own ambient layers. Their existing route shells remain responsible for
foreground color, spacing, content, and interaction only.

## Rendering and Stacking

The persistent layer is fixed to the viewport with `inset: 0`, clips its own
visual overflow, ignores pointer input, and sits behind route content. The
provider wraps route content in a foreground stacking layer so the background
cannot intercept or cover controls.

Route shell backgrounds become transparent where needed so the persistent
ambient layer remains visible. No width, padding, height, composer geometry, or
foreground z-index values change except the minimum wrapper required to define
the shared stacking order.

## Navigation Behavior

During a normal Next.js client-side transition:

1. The persistent background remains mounted.
2. Its shader animation continues from the same frame.
3. The same memoized pixels retain their positions and CSS animation phases.
4. Only route-owned foreground content participates in the existing handoff.

A full browser reload or a direct room URL load creates a new app session and
therefore a fresh background instance. Once mounted, that instance remains
stable for subsequent client-side route transitions.

## Failure and Edge Behavior

- Expired, missing, password-gated, and directly loaded rooms use the same
  app-level ambient background.
- If the viewport crosses the `639px` breakpoint, only shader opacity changes;
  the shader and pixels are not remounted.
- Reduced-motion preferences continue to be handled by the existing shader and
  CSS behavior.
- The not-found Breakout surface keeps its dedicated background because it is a
  separate visual experience and is outside the landing-to-room continuity
  scope.

## Verification

Add a focused regression test that reads the relevant component sources and
proves:

- `RouteHandoffProvider` owns exactly one
  `DirectionTwoAmbientBackground` instance;
- the persistent component owns the shader, glow, pixel generation, and mobile
  opacity behavior;
- neither the landing shell nor room page renders route-owned ambient layers;
  and
- the existing composer geometry values remain unchanged.

Run the focused background, handoff, and intro tests, then run `git diff
--check`. Finally, on the already-running development port, verify that a
landing-to-room client transition leaves the background DOM instance mounted
and keeps the foreground free of layout movement. If a usable room cannot be
entered without creating external data, report that browser boundary rather
than claiming visual verification.
