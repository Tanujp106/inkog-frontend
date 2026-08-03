# Breakout Ghost Bricks Design

## Summary

Keep destroyed `404` bricks visible as extremely faint ghost pixels so the complete `404` silhouette remains readable throughout play and after the final brick is cleared.

## Visual Behavior

- Active bricks retain their current accent color, opacity variation, glow, and collision behavior.
- Destroyed bricks render with the current theme accent at 8% opacity.
- Destroyed bricks have no shadow or glow.
- Ghost bricks remain visible in `running`, `waiting`, and `cleared` states.
- In the cleared state, the complete faint `404` remains behind the square confetti and the restart/home actions.

## Implementation

- Keep brick activity and physics state unchanged.
- Update canvas drawing to render inactive bricks in a separate no-glow pass before rendering active bricks.
- Preserve the existing brick geometry and stable IDs; the change is visual only.
- Keep active bricks visually dominant and ensure ghost pixels cannot be mistaken for live collision targets.

## Verification

- Extend the focused page/canvas contract to require an inactive-brick rendering branch with 8% opacity and no shadow.
- Confirm active bricks keep their existing glow and opacity treatment.
- Confirm the cleared state still draws ghost bricks beneath confetti while paddle and ball remain hidden.
- Run the focused 404 tests, TypeScript, production build, and a live invalid-route browser check on the existing port.

## Scope

No changes to collisions, brick destruction, scoreless game state, sounds, lives, controls, speed, confetti behavior, routes, dependencies, or shader configuration.
