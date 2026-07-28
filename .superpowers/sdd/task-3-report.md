# Task 3 Report: Deterministic square confetti

## Status

Committed `fe3723a` with subject `Add square Breakout confetti`.

## RED evidence

Command:

```sh
node --test lib/not-found-confetti.test.mjs
```

Result: exit code `1`, with the expected missing-production-module failure:

```text
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/Users/tanuj/Desktop/Incog/inkog-frontend/lib/not-found-confetti.mjs'
```

## Implementation

- Added a local seedable pseudo-random generator derived from arena dimensions.
- Added `createBreakoutConfetti(width, height, count = 160)`, which creates exact-count square particles spread across the full width, within the upper 45% of the arena, with 4-10px sizes and deterministic color indices.
- Added `stepBreakoutConfetti(particles, deltaSeconds, width, height)`, which returns new particles after drag, gravity, movement, rotation, and life reduction; it filters only expired or below-arena particles.

## GREEN evidence

Command:

```sh
node --test lib/not-found-confetti.test.mjs
```

Result: exit code `0`.

```text
✔ creates deterministic square particles across the full arena
✔ steps particles with motion, rotation, and decreasing life
ℹ tests 2
ℹ pass 2
ℹ fail 0
```

## Files

- `lib/not-found-confetti.mjs`
- `lib/not-found-confetti.test.mjs`

## Self-review

- The test precedes the module and demonstrated the expected module-not-found RED state.
- Tests cover deterministic output, requested count, square-size bounds, outer-quarter coverage, movement, rotation, and decreasing life.
- The module has no dependencies, does not mutate its input array or particle records, and is ready for Task 4 integration.
- The commit contains only the two requested confetti files.

## Concerns

None. This module intentionally owns only deterministic particle generation and simulation; rendering, palette mapping, and animation scheduling remain for Task 4.
