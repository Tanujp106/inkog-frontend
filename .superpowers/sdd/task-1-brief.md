# Task 1 Brief: Responsive dense physics, launch rules, events, and speed

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

## Files

- Modify: lib/not-found-breakout.mjs
- Modify: lib/not-found-breakout.test.mjs
- Do not edit any other file.

## Required Interfaces

- create404Bricks(width, height)
- resizeBreakout(state, width, height)
- shouldLaunchBreakoutForKey(key)
- State fields speedMultiplier and events
- Events: launch, wall, paddle, brickA, brickB, brickC, miss, clear

## TDD Requirements

1. Write tests first for:
   - a hand-authored 9x13-style 404 with 90-110 active square bricks;
   - all 13 rows represented;
   - total 404 footprint at least 62% of a 1200px arena;
   - stable IDs and preserved destroyed state after resize;
   - letters, numbers, Space, Enter, and arrows launch;
   - R and modifier-only keys do not launch;
   - launch, wall, paddle, brick, miss, and clear events;
   - speed increases after bricks and caps at 1.7;
   - life loss preserves speed; restart and third miss reset speed to 1.
2. Run node --test lib/not-found-breakout.test.mjs and record expected RED output.
3. Implement minimal production code.
4. Rerun the same test and record GREEN output.

## Exact Launch Rule

~~~js
export function shouldLaunchBreakoutForKey(key) {
  if ([" ", "Enter", "ArrowLeft", "ArrowRight"].includes(key)) return true;
  return /^[a-z0-9]$/i.test(key) && key.toLowerCase() !== "r";
}
~~~

## Resize Behavior

Regenerate geometry from create404Bricks(width, height), preserve isActive by stable brick ID, proportionally scale and clamp ball/paddle, preserve mode/lives/speed, and clear events.

## Speed Behavior

Initialize speedMultiplier: 1 and events: []. Clear events at the start of each step/helper. After each brick:

~~~js
const destroyed = bricks.length - bricks.filter(brick => brick.isActive).length;
const speedMultiplier = Math.min(1.7, 1 + (destroyed / bricks.length) * 0.7);
~~~

Normalize velocity to BASE_BALL_SPEED times speedMultiplier while preserving direction and paddle-angle rebounds. Append exactly one event per resolved collision.

## Commit

Stage only lib/not-found-breakout.mjs and lib/not-found-breakout.test.mjs, then commit with subject:

Build responsive dense Breakout physics

