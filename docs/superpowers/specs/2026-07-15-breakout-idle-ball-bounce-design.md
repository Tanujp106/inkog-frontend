# Breakout Idle Ball Bounce Design

## Summary

Add a subtle visual bounce to the Breakout ball while the game is waiting for the user. The animation appears in both the initial `idle` state and the post-miss `waiting` state.

## Behavior

- The ball makes an 8-pixel vertical hop on a 1,200ms loop, easing from rest to the peak and back to rest.
- The bounce is visual only. It does not mutate ball position, velocity, launch angle, collision state, lives, or scoreless game progress.
- The animation stops immediately when the game enters `running` or `cleared`.
- Restarting returns to `idle`, where the bounce resumes.
- Reduced-motion mode keeps the ball stationary on the paddle.
- The bounce does not emit sound.

## Implementation

- Add a small pure helper that derives the visual vertical offset from elapsed time and whether idle animation is enabled.
- Pass the offset into canvas rendering rather than modifying the Breakout engine state.
- Extend the existing animation-frame gate so it redraws during `idle` and `waiting` only when reduced motion is not requested.
- Keep physics advancement restricted to `running`; idle animation frames only redraw the canvas.
- Reset the animation phase when entering `idle` or `waiting` so each waiting period starts predictably.

## Verification

- Unit-test the bounce helper at the resting point, peak, and loop boundary.
- Assert that only `idle` and `waiting` opt into the bounce and that reduced motion disables it.
- Protect the distinction between canvas redraws and physics advancement in the page contract test.
- Run the focused 404 test suite, TypeScript, production build, and a live browser check on the existing port.

## Scope

No changes to physics, sounds, controls, brick layout, confetti, lives, clear actions, routes, dependencies, or the shader background.
