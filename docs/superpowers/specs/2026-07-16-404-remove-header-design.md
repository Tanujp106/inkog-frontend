# Remove the 404 Header Design

## Summary

Remove the `inkog` header and logo treatment from the Breakout 404 page. The game arena will begin at the top edge and fill the entire viewport.

## Page Structure

- Remove the `<header className="not-found-header">` element, linked `inkog` wordmark, square mark, and unused `Link` import from `app/not-found.tsx`.
- Keep the screen-reader-only `404 page not found` heading.
- Keep `back to home` inside the normal game HUD and inside the cleared-state actions.
- Let `NotFoundBreakout` become the only visible page content.

## Layout and Styling

- The transparent shader-backed Breakout arena occupies the full `100dvh`, beginning at viewport coordinate `y: 0`.
- Remove the unused `.not-found-header`, `.not-found-brand`, `.not-found-brand span`, and mobile header rules.
- Preserve the arena's subtle bottom boundary, shader, HUD safe-area spacing, canvas focus treatment, and responsive behavior.

## Verification

- Update the focused page contract to reject header and logo markup and require a full-height arena.
- Confirm the `back to home` recovery link remains present.
- Run the focused 404 tests, TypeScript, production build, and a live invalid-route browser check on the existing port.

## Scope

No changes to the Breakout game, physics, controls, sounds, confetti, shader, brick layout, completion actions, or the separate idle-ball bounce design.
