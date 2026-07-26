# INKOG Title Animation Design

## Goal

Make the landing-page INKOG title feel like the icon shimmer: one calm, legible pixel wave on initial load, followed by the same wave replayed once when the pointer enters the title.

## Current problem

The title currently combines a layer-entry animation with per-pixel delayed animation. Those timelines overlap, while hover can also restart the pixel animation through a separate React state toggle. The title therefore has multiple active timelines affecting the same pixels, which produces visible jitter and inconsistent settling.

## Design

The title will use one coordinated per-pixel timeline for both entry and hover. Each active pixel receives a deterministic delay based on its horizontal position, with a hard maximum so the word resolves as one readable gesture rather than a long cascade. The animation will use the existing DialKit defaults: 380ms duration, 350ms maximum delay, 420ms tail, the shared cubic-bezier easing, brightness peak of 1.16, and the shared signal/halo values.

The title layer itself will remain structurally stable. No scale, translation, blur, or layout-affecting properties will be animated during the shimmer. Pixels will animate opacity, brightness, signal color mix, and glow only. The initial reveal may still establish visibility, but it must not compete with the shimmer timeline.

## Interaction and accessibility

- Initial load plays once when the landing title enters.
- Pointer entry after the initial reveal replays the wave once.
- Re-entry cancels the previous replay before starting a fresh one.
- Reduced-motion users receive the settled title with no shimmer.
- The title remains an accessible `role="img"` with its existing label.

## Implementation surface

- `components/direction-two-shell.tsx`: consolidate title timing and trigger state; keep deterministic pixel delays and shared defaults.
- `app/globals.css`: define one title shimmer keyframe and remove competing title-layer animation behavior.
- `lib/direction-two-intro.test.mjs`: add regression checks for one title timeline, capped delays, and reduced-motion behavior.

## Verification

Run the focused intro test, `git diff --check`, and the frontend build. In the running landing page on port 3000, verify: one load wave, one hover wave, clean rapid re-entry, no layout movement, and reduced-motion settling.
