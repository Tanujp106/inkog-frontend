# Task 1 report: responsive dense Breakout physics

## Implementation summary

- Replaced the 5x7, 44-pixel formation with a hand-authored 9x13 `404` formation containing 90 active square bricks. Geometry now scales from both arena dimensions and remains inside a compact 320x200 arena while the 1200px formation spans more than 62% of the arena.
- Added `resizeBreakout(state, width, height)` to regenerate geometry, retain each brick's active state by stable ID, proportionally scale and clamp the ball and paddle, preserve mode/lives/speed, and clear events.
- Added the exact keyboard launch predicate. Letters, numbers, Space, Enter, and horizontal arrows launch; `R` and modifier-only keys do not.
- Added `speedMultiplier` and per-action `events` to state. Collision events cover launch, walls, paddle, brick bands, misses, and clearing. Brick hits use the required capped multiplier formula and normalize ball velocity to the base speed times that multiplier.
- Kept destroyed bricks and speed through the first two life losses; restart and the third miss reset speed and board state.

## TDD evidence

### RED

Command:

```sh
node --test lib/not-found-breakout.test.mjs
```

Initial requirements run excerpt:

```text
tests 14
pass 3
fail 11

AssertionError: expected rows 0 through 12; actual rows were 0 through 6
TypeError: breakout.resizeBreakout is not a function
TypeError: breakout.shouldLaunchBreakoutForKey is not a function
actual: undefined
expected: [ 'launch' ]
```

The responsive self-review test was also run red before changing geometry sizing:

```text
tests 14
pass 13
fail 1

AssertionError: assert.ok(Math.min(...compactBricks.map(brick => brick.x)) >= 0)
```

### GREEN

Command:

```sh
node --test lib/not-found-breakout.test.mjs
```

Output excerpt:

```text
tests 14
pass 14
fail 0
cancelled 0
skipped 0
duration_ms 118.1305
```

## Files changed

- `lib/not-found-breakout.mjs`
- `lib/not-found-breakout.test.mjs`

This report is the requested uncommitted task artifact; it is not included in the task commit.

## Self-review

- Confirmed the 404 uses stable IDs and exactly 90 square bricks across all 13 rows.
- Confirmed the launch rule matches the supplied implementation exactly.
- Confirmed resize preserves inactive IDs, mode, lives, and speed while dropping stale events.
- Confirmed events are reset before physics work and append once per resolved wall, paddle, brick, miss, launch, or clear action.
- Confirmed brick-hit speed derives from the required destroyed-brick formula, caps at 1.7, and re-normalizes velocity after brick and paddle rebounds.
- Confirmed only the two required engine/test files will be staged and committed.

## Concerns

None. Browser verification was not required: this task changes the pure engine only, and the focused Node suite covers the new interfaces and behavior.

---

## Review fix: clear stale movement events

### Fix summary

- `movePaddle` now clears `events` before checking running state or direction, so regular moves, direction-zero calls, and non-running calls cannot return stale collision/sound events.
- `setPaddleFromPointer` now clears `events` before checking running state, so both pointer moves and non-running returns are event-clean.
- Added focused regression coverage for both helpers, including direction-zero and non-running paths.

### RED

Command:

```sh
node --test lib/not-found-breakout.test.mjs
```

Output excerpt:

```text
tests 16
pass 14
fail 2

actual: [ 'wall' ]
expected: []

actual: [ 'paddle' ]
expected: []
```

### GREEN

Command:

```sh
node --test lib/not-found-breakout.test.mjs
```

Output excerpt:

```text
tests 16
pass 16
fail 0
cancelled 0
skipped 0
duration_ms 107.568
```
