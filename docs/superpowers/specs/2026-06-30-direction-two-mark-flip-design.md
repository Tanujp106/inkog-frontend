# Direction Two Mark Flip Design

**Goal:** Keep the restored large `inkog` hero mark, then add a shimmering pixel treatment and a timed pixel-flip morph into `anonymous chat`.

## Approved Direction

- Start on the large `inkog` mark.
- Add shimmer across the pixel mark in both states.
- After a short delay, flip the pixels into `anonymous chat`.
- Keep the sequence looping so the mark alternates between the two states.

## Interaction Notes

- This is a hero-only motion treatment; it must not affect the terminal transcript or prompt behavior.
- The mark remains the same top-left hero anchor the user restored.
- Reduced-motion users should keep the mark static rather than repeatedly morphing.

## Architecture

- Add deterministic helper data for the two pixel words in `lib/direction-two-intro.mjs`.
- Keep timing/orchestration inside `components/direction-two-shell.tsx`.
- Add shimmer and flip styles in `app/globals.css`.

## Testing

- Add helper tests for the exported mark words and pixel pattern builder.
- Run targeted helper tests and `npm run build`.
