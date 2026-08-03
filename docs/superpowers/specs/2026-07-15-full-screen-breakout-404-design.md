# Full-Screen Breakout 404 Design

## Goal

Turn the custom 404 into one continuous, shader-backed Breakout surface. The browser viewport is the game arena rather than a page containing a smaller game panel. Keep the existing Inkog visual language and game rules while increasing the density of the destructible `404` and adding sound, progressive difficulty, and a celebratory completion state.

## Visual Composition

- Keep the existing `AmbientShaderBackground` implementation and theme-reactive colors unchanged.
- Remove the page-level checkered CSS background and the grid painted inside the canvas.
- Remove the inset game panel background, border, shadow, fixed maximum width, and separate aspect-ratio presentation.
- Make the 404 shell fill `100dvh` and the full viewport width.
- Keep the linked `inkog` wordmark in a full-width header. A subtle horizontal border directly below the header is the arena's visible top boundary.
- Add a second subtle horizontal border at the bottom of the viewport as the arena's visible bottom boundary.
- Place the state prompt at the top center, lives at the top right, controls at the lower left, and `back to home` at the lower right. These elements are a quiet HUD inside the arena, not a separate footer or panel.
- On narrow screens, stack the lower HUD copy without creating a separate colored container. Keep the paddle above the HUD's safe area.

## Responsive Arena

- Measure the available arena with `ResizeObserver`; use those measured dimensions for both canvas rendering and game physics.
- Size the canvas backing buffer using the measured CSS size and a device-pixel ratio capped at 2.
- Keep the canvas transparent so the unchanged ambient shader remains the only visual background.
- On resize, proportionally scale and clamp the ball and paddle, regenerate the brick geometry for the new dimensions, and preserve brick active states by stable brick IDs. Preserve mode and lives.
- The playable boundaries match the visible viewport arena. There is no invisible centered playfield and no stretched fixed-ratio physics surface.

## Denser Pixel 404

- Replace the current 5×7 digit patterns with hand-authored 9×13-style patterns.
- Keep the overall `404` large: approximately 62–70% of the arena width on desktop and up to 86% on small screens.
- Target roughly 90–110 active square bricks across all three digits, around twice the current density. Exact count follows the cleanest readable digit shapes rather than an arbitrary fixed number.
- Reduce individual brick size and gaps while retaining square geometry, crisp spacing, stable IDs, and the current accent glow.
- Each small brick remains independently destructible.

## Input and Game States

- Preserve `idle | running | waiting | cleared`.
- Any letter, number, Space, Enter, or arrow key launches from `idle` or `waiting`.
- An arrow-key launch also immediately begins paddle movement in that direction.
- Modifier-only keys such as Shift, Control, Option/Alt, and Command/Meta do not launch.
- `R` remains reserved for full restart and never acts as a launch key.
- Existing mouse, touch, arrow, and Shift-accelerated paddle controls remain.
- Input remains frozen in `idle`, `waiting`, and `cleared`, except for launch/restart actions.

## Progressive Difficulty

- Increase ball speed by a small deterministic multiplier after each destroyed brick.
- Base difficulty remains approachable; speed growth is smooth across the denser formation and capped at approximately 1.7× the launch speed.
- Preserve the paddle-impact angle behavior while normalizing the rebound to the current progressive speed.
- A lost life preserves the current difficulty and destroyed bricks. A full restart or third miss restores base speed.

## Sound

- Use the existing `SystemSoundProvider`, AudioContext lifecycle, and persisted global mute preference. Do not add a 404-specific sound toggle.
- Add short synthesized cues for launch, wall rebound, paddle rebound, brick destruction, life loss, and clear.
- Provide two or three restrained brick-hit variants selected deterministically so dense collisions do not sound monotonous.
- Keep collision cues short and quiet enough to avoid audio fatigue. The clear flourish is the only layered celebratory cue.
- Emit explicit pure physics events from each step so the client triggers each sound once and does not infer collisions from rendered state.

## Clear Celebration

- Destroying the final brick freezes physics and starts a canvas-native square confetti burst using current theme colors.
- Confetti spans the full arena, falls with gravity, rotates, and fades without adding a dependency.
- During the cleared state, hide the normal prompt, lives, controls, and home HUD.
- Show only two centered actions over the shader and confetti: `restart` and `back to home`. Do not add completion prose.
- `restart` restores the full denser `404`, three lives, and base speed. `back to home` navigates to `/`.
- Under reduced motion, show a short static celebratory scatter and the same two actions without sustained particle animation.

## Architecture

- Keep `app/not-found.tsx` as a thin shell.
- Keep viewport measurement, keyboard/pointer input, audio playback, confetti animation, and canvas drawing in `components/not-found-breakout.tsx` or small focused client helpers if extraction improves clarity.
- Keep layout generation, resize transformation, collision events, speed progression, life loss, and restart behavior deterministic in `lib/not-found-breakout.mjs`.
- Extend the existing sound profile with Breakout-specific sound names and specifications; do not introduce audio files or dependencies.
- Preserve unrelated Direction 2 and room working-tree changes.

## Testing and Verification

- Update focused tests first so they fail against the current inset, grid-backed, 5×7 implementation.
- Test the denser pattern dimensions and target brick-count range, stable IDs, responsive geometry, resize preservation, any-key launch exclusions, `R` precedence, progressive speed and cap, event emission, life-loss speed preservation, restart reset, and clear state.
- Test the page contract for no grid backgrounds, no inset frame styling, unchanged shader mounting, full-screen boundaries, completion buttons, and existing home links.
- Run focused 404 tests, relevant sound-profile tests, `git diff --check`, and `npm run build`.
- Reuse the existing `127.0.0.1:3000` listener for focused browser verification at desktop and mobile widths.
- Verify that the visible screen edges are the actual play boundaries, the shader is unchanged, the 404 remains large but visibly denser, normal HUD elements disappear on clear, confetti plays, only two completion actions remain, audio honors mute, and no console errors occur.

## Out of Scope

- Scores, power-ups, multiple levels, autoplay, backend changes, new routes, audio assets, and third-party game or confetti dependencies.
