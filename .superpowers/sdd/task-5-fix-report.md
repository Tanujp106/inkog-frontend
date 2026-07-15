# Task 5 final-review fix report

## Status

Completed and committed on `tanuj-changes`.

- Commit: `cd474d1` (`Fix responsive Breakout geometry`)
- Starting commit: `7937bcfe59ab1c2de06a319372371921412358bc`
- Scope: responsive Breakout geometry, pure pointer helpers and integration, contract coverage, and the 404 canvas focus indicator only

## Root cause confirmed

Breakout initialization, resize, restart, and miss recovery used different geometry paths. Resize scaled old geometry while restart rebuilt fixed geometry, and `createRestingBall` hard-coded radius 7. That caused geometry jumps and detached sizing after resize, restart, and life loss. The prior bottom placement also did not reserve enough room for the HUD in short landscape viewports. Separately, the canvas focus outline was offset outside an overflow-hidden boundary, and pointer behavior was only structurally covered.

## RED evidence

### Responsive engine geometry

Command:

`node --test lib/not-found-breakout.test.mjs`

Result before implementation: 18 tests, 16 passed, 2 failed, duration 63.407125 ms.

- Portrait geometry failed after resize/restart/miss. Actual resized geometry was `{ ballRadius: 5, paddleHeight: 14, paddleWidth: 78, paddleY: 719.4923076923077 }`; expected current-viewport geometry was `{ ballRadius: 7, paddleHeight: 12, paddleWidth: 78, paddleY: 742 }`.
- Short-landscape geometry failed because `createResponsiveBreakoutGeometry` was not exported: actual `undefined`, expected `function`.

### Pointer helpers

Command:

`node --test --test-name-pattern="pointer client|accepts mouse" lib/not-found-breakout.test.mjs`

Result before implementation: 20 tests discovered, 18 skipped, 0 passed, 2 failed, duration 56.208709 ms.

- `clientXToBreakoutX` was undefined.
- `shouldHandleBreakoutPointer` was undefined.

### Focus contract

Command:

`node --test lib/not-found-page.test.mjs`

Result before implementation: 1 test, 0 passed, 1 failed, duration 46.938917 ms.

- The 404 canvas focus contract required `/outline-offset:\s*-\d+px/`; the source still used `outline-offset: 5px`, outside the clipped canvas boundary.

## Implementation

- Added deterministic `createResponsiveBreakoutGeometry(width, height)` and used it for initial state, resize, restart/full reset, ordinary miss recovery, and resting-ball creation.
- Responsive geometry derives paddle dimensions/y and ball radius from the current viewport, keeps large layouts intact, and reserves at least 48 px beneath the paddle where the viewport permits it.
- Resize preserves paddle x proportionally. Inactive balls reattach to the resulting paddle; active balls scale/clamp their position, adopt the responsive radius, and retain normalized velocity/speed.
- Ordinary misses recenter the paddle while preserving brick state and speed multiplier. Third misses and explicit restarts still reset bricks, lives, and speed.
- Exported pure `clientXToBreakoutX` and `shouldHandleBreakoutPointer` helpers and integrated them into the component without changing pointer capture, release, cancel, focus, or clamping behavior.
- Moved the canvas focus outline inside the overflow boundary with `outline-offset: -3px`.
- Strengthened engine and source contracts for geometry stability, HUD clearance, reset behavior, pointer mapping and gating, helper integration, capture cleanup/cancel, and the inset focus indicator.

## GREEN evidence

Intermediate checks:

- `node --test lib/not-found-breakout.test.mjs`: 20 passed, 0 failed, duration 59.74025 ms.
- `node --test lib/not-found-page.test.mjs`: 1 passed, 0 failed, duration 165.661833 ms.

Final required verification:

- `node --test lib/not-found-page.test.mjs lib/not-found-breakout.test.mjs lib/not-found-confetti.test.mjs lib/system-sound.test.mjs`: 32 passed, 0 failed, duration 64.142292 ms.
- `npx tsc --noEmit --pretty false`: exit 0, no diagnostics.
- `git diff --check -- lib/not-found-breakout.mjs lib/not-found-breakout.test.mjs components/not-found-breakout.tsx lib/not-found-page.test.mjs app/globals.css`: exit 0, no output.
- `git diff --cached --check`: exit 0, no output before commit.

## Files and hunks committed

- `lib/not-found-breakout.mjs`
- `lib/not-found-breakout.test.mjs`
- `components/not-found-breakout.tsx` — pointer-helper imports and use only
- `lib/not-found-page.test.mjs`
- `app/globals.css` — only the `.not-found-breakout-canvas:focus-visible` staging hunk

The CSS index was built non-interactively. Existing route-transition rules near the top and Direction 2/password rules after the 404 block remained unstaged and were not committed. This report is scratch evidence and was not staged.

## Self-review

- Portrait `390x786`: create, resize, restart, and ordinary miss now share deterministic paddle y/size and ball radius; inactive balls remain attached.
- Short landscape `844x332`: responsive geometry exposes and enforces at least 48 px of bottom clearance for the lower HUD.
- Large/default geometry is not unnecessarily reduced.
- Ordinary miss preserves bricks and speed; restart/third miss fully reset bricks, lives, and speed.
- Pointer mapping clamps to game space, handles zero-width bounds with a centered fallback, permits mouse hover movement, and gates touch/pen on active drag state.
- Component pointer capture/release/cancel/focus behavior remains present and contract-covered.
- Canvas keyboard focus is rendered inside the overflow boundary.
- No engine-adjacent dependencies or unrelated source files were changed.

## Concerns

No known functional concerns. Verification was code/test/type-check based; no browser session was needed because the review findings are deterministically covered by engine and source-contract tests. The working tree still contains unrelated pre-existing changes, intentionally preserved.
