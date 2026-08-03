# Task 4 Brief: Full-screen canvas, HUD, input, audio, and clear actions

## Global Constraints

- Keep AmbientShaderBackground and its theme configuration unchanged.
- Remove both grids and the inset panel; viewport edges are the game boundaries.
- Keep the large dense 404 produced by the engine.
- R always restarts; only approved ordinary keys/arrows launch.
- Honor global mute with no local toggle.
- Cleared state shows only restart and back to home over square confetti.
- Add no dependency, route, backend, score, power-up, level, or autoplay.
- Preserve unrelated Direction 2 and room changes.

## Files

- Modify only components/not-found-breakout.tsx, app/globals.css, and lib/not-found-page.test.mjs.
- app/not-found.tsx may be staged only if its existing thin shell is needed in the task commit; do not redesign it.
- Do not modify components/ambient-shader-background.tsx.

## Required Integration

- Consume resizeBreakout, shouldLaunchBreakoutForKey, engine events, confetti helpers, and useSystemSound().play(name).
- Map launch/wall/paddle/brickA/brickB/brickC/miss/clear to the corresponding breakout sound names.

## TDD Requirements

1. Update lib/not-found-page.test.mjs first to require ResizeObserver, key helper, sound hook, confetti, restart/home clear actions, full-screen borders, unchanged shader mounting, and both home links. Assert the old page-grid declarations, canvas-grid loop, inset frame selector, fixed aspect ratio, and panel background/shadow are absent.
2. Run node --test lib/not-found-page.test.mjs and capture expected RED.
3. Remove the frame wrapper, fixed aspect ratio, opaque canvas fill, and both grids. Observe arena bounds, use measured dimensions for physics, and cap backing DPR at 2.
4. Handle R before launch. Approved ordinary keys launch idle/waiting; arrows launch then move. Modifier-only keys do nothing.
5. Play each engine event once through useSystemSound. Add no local mute control.
6. On clear, initialize confetti once; animate normally and show a static scatter under reduced motion. Hide prompt, lives, controls, normal home HUD, ball, and paddle. Render only restart and back to home actions.
7. CSS: full width and 100dvh; full-width header bottom border; viewport-bottom arena border; no colored HUD container. Prompt top-center, lives top-right, controls lower-left, home lower-right, responsive safe-area padding.
8. Run node --test lib/not-found-page.test.mjs lib/not-found-breakout.test.mjs lib/not-found-confetti.test.mjs lib/system-sound.test.mjs and capture GREEN.

## Commit

Commit only app/not-found.tsx, app/globals.css, components/not-found-breakout.tsx, and lib/not-found-page.test.mjs with subject: Make Breakout 404 a full-screen experience
