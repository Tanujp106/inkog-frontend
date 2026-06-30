---
name: direction-two-interface-tuning
description: Use when tuning the /playground Direction 2 ambient field, pixel fill, intensity, directionality, or related interface polish. Prefer the shared config and helper functions instead of scattered magic numbers.
---

# Direction 2 Interface Tuning

Use this skill when the user wants to tweak the Direction 2 playground surface, especially the ambient pixel field behind the terminal.

If the playground is open, use the DialKit panel on `/playground` first. It is the live interface for the field and should stay in sync with the code defaults.

## What to touch first

1. `lib/direction-two-intro.mjs`
2. `components/direction-two-shell.tsx`
3. `app/globals.css`

Keep the effect in square pixels, not circles. Preserve the directional feel by biasing motion and opacity along a diagonal.

## Tuning workflow

1. Read the current effect and identify the user goal: denser, calmer, sharper, brighter, more directional, or less busy.
2. Adjust `directionTwoAmbientConfig` first.
3. Only change component markup when the visual shape needs to change.
4. Only change CSS when the motion curve, glow, or blend behavior needs to change.
5. Verify the result in `/playground` and keep reduced-motion behavior sensible.

## Important configuration knobs

Adjust these before doing ad hoc edits:

- `count`: total number of ambient pixels.
- `gridStep`: how tightly pixels snap to the grid.
- `minSize` and `maxSize`: square size in pixels.
- `minOpacity` and `maxOpacity`: baseline intensity range.
- `diagonalBoost`: how much extra intensity follows the main diagonal.
- `driftXMin` and `driftXMax`: horizontal directional drift.
- `driftYMin` and `driftYMax`: vertical directional drift.
- `minDelay` and `maxDelay`: how staggered the field feels.
- `minDuration` and `maxDuration`: how quickly the ambient motion breathes.
- `sweepDuration`: how long each pixel takes to flip and settle after the wave reaches it.
- `shimmerSettleDelay`: how long a pixel waits after arriving before it joins the shimmer loop.
- `glowStrength`: how hard the pixels bloom.
- `glowOpacity`: how much the diagonal atmosphere shows through.
- `angle`: the direction of the atmospheric wash.
- `blendMode`: how the wash mixes with the dark background.

## Useful visual controls

When the user asks for a stronger or softer look, tune these together:

- More intense: raise `count`, `maxOpacity`, and `diagonalBoost`.
- More pixel-like: lower `gridStep`, keep `rounded-[1px]` or smaller, and avoid blur.
- More directional: raise `driftXMax` and `driftYMax`, and keep both positive.
- More subtle: lower `count`, `maxOpacity`, and the glow shadow in CSS.
- More animated: widen `minDuration` and `maxDuration`, and keep the animation active.
- More wave-like: raise `maxDelay` and keep `sweepDuration` under 1.2 seconds.
- More settled: raise `shimmerSettleDelay` and lower `glowStrength`.

## CSS touch points

- `.direction-two-ambient-glow`: the large atmospheric layer.
- `.direction-two-ambient-pixel`: the square ambient cell style.
- `.direction-two-ambient-pixel-core`: the settled pixel shimmer.
- `@keyframes direction-two-ambient-pixel-sweep`: the flip-on-arrival wave.
- `@keyframes direction-two-ambient-pixel-shimmer`: the post-sweep shimmer.

Prefer:

- square pixels over dots
- directional drift over symmetric pulsing
- screen blending over flat opacity
- one strong ambient field over many unrelated effects

## Guardrails

- Do not alter Direction 1 while tuning Direction 2.
- Do not switch the field back to circular particles.
- Respect reduced motion where possible.
- Keep the change local unless the user explicitly asks for a broader visual refresh.
