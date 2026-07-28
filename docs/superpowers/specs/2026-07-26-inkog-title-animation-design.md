# INKOG Title Motion Design

## Goal

Refine the existing landing-page title without changing its pixel-grid identity:

1. Form `INKOG` smoothly and strictly from left to right.
2. Play one separate sine-wave shimmer after the word has fully formed.
3. Make nearby pixels respond like magnets around the pointer on hover.
4. Expose the important values through DialKit for local tuning.

The finished motion should feel deliberate and rich without becoming noisy, scattered, angled, or glitch-like.

## Motion architecture

Keep the existing DOM pixel grid and split the behavior into three independent phases:

- `forming`: a deterministic CSS-driven reveal.
- `shimmering`: a single paint-only signal pass after formation settles.
- `interactive`: pointer-driven magnetic displacement after the intro sequence.

Only one intro phase may affect a pixel at a time. Formation completion starts the shimmer; shimmer completion enables the fully interactive settled state. Hover never restarts the intro or shimmer.

## Formation

The word forms in vertical columns from the left edge to the right edge. Every active pixel in the same visual column starts at the same time, regardless of its row or letter, so the reveal has no diagonal edge.

- Derive delay only from the pixel's global horizontal column.
- Normalize delays across the complete mark width.
- Start active pixels transparent and finish at their normal foreground color and full opacity.
- Use opacity and brightness only.
- Do not animate translation, scale, blur, box-shadow, or layout.
- Keep inactive grid pixels subtle and stationary throughout.
- The final column must settle before the shimmer begins.

The default formation should read as one smooth construction rather than five separate letter reveals. DialKit will control formation duration, total left-to-right spread, and peak brightness.

## Sine-wave shimmer

After formation settles, one signal-colored wave travels across the complete word. The wave path is sinusoidal: each pixel's shimmer timing is derived from its horizontal progress plus a sine-based row offset. This creates a visible wave crest without moving any pixel.

- Animate background color, brightness, and glow only.
- Keep opacity at its settled value.
- Run exactly once after initial formation.
- Do not replay the shimmer on hover.
- Finish every pixel at the same settled foreground appearance.
- Avoid overlapping animation declarations or React state toggles that can restart the pass.

DialKit will control shimmer duration, horizontal spread, sine amplitude, sine frequency, signal color mix, brightness, glow radius, and glow opacity.

## Magnetic hover

After the intro sequence, active title pixels inside a local radius respond continuously to pointer position.

- Each affected pixel moves toward the pointer along the direct pointer-to-pixel vector.
- Attraction falls off smoothly with distance and reaches zero at the radius boundary.
- Displacement is capped so `INKOG` remains readable.
- Pixels outside the radius remain exactly in place.
- Pointer movement updates CSS custom properties through one `requestAnimationFrame` loop; it must not trigger a React render per pointer event.
- On pointer exit, pixels spring smoothly back to their exact grid positions.
- Rapid enter, movement, and exit must remain interruptible with no snapping or accumulated offsets.
- Magnetic transforms must not alter layout or pixel spacing after they settle.

Recommended defaults are a roughly `90px` attraction radius and a maximum displacement around `6px` on desktop. DialKit will control radius, strength, maximum displacement, spring stiffness, and damping. Touch input does not run the magnetic interaction.

## DialKit

Re-add DialKit after the motion works with stable defaults.

- Use DialKit's normal/default development interface; do not build custom tuning UI.
- Keep a single title-motion configuration grouped by formation, shimmer, and magnet values.
- Source production-safe defaults from code so the title remains correct without the tuning panel.
- Do not make DialKit state responsible for animation sequencing.
- Keep the integration development-only and out of the visible product interface.

## Accessibility and fallback behavior

- With `prefers-reduced-motion: reduce`, render the settled title immediately.
- Disable formation, shimmer, and magnetic displacement for reduced-motion users.
- Preserve the existing `role="img"` and accessible word label.
- If pointer coordinates are unavailable, the title remains in its settled static state.
- The animation must not delay access to the terminal or other page interactions.

## Implementation boundaries

- `components/direction-two-shell.tsx`: explicit intro phase, global pixel coordinates, shimmer timing variables, pointer tracking, magnetic CSS variables, and DialKit configuration.
- `lib/direction-two-intro.mjs`: deterministic formation and sine-wave timing helpers plus default motion constants where they can be tested without React.
- `app/globals.css`: isolated formation, shimmer, and magnetic transform rules with no competing title-layer animation.
- `lib/direction-two-intro.test.mjs`: timing geometry, phase separation, reduced-motion, pointer-loop, and DialKit-default regression checks.
- `package.json` and lockfile: DialKit dependency.

Do not refactor unrelated Direction Two layout, terminal behavior, ambient pixels, intro copy, or room flows.

## Verification

Run the focused intro tests, TypeScript/build checks, and `git diff --check`. Then use the already-running app port to verify the browser-only behavior at the reported `1205x846` viewport:

- the formation edge is vertical and travels strictly left to right;
- no pixel translates, scales, or blurs during formation;
- shimmer starts only after the final column settles;
- the shimmer follows one smooth sine-shaped crest and ends cleanly;
- pointer attraction is local, readable, responsive, and springs back without jitter;
- rapid pointer movement does not queue or snap;
- reduced motion renders a static settled word;
- DialKit changes each exposed value without altering phase sequencing.
