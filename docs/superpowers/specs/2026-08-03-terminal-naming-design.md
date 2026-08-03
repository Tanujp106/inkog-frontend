# Terminal Naming Cleanup Design

## Goal

Remove the historical `Direction Two` naming from Inkog's existing terminal-style landing experience without deleting or changing its behavior. The code remains in place; only names and references become semantic and role-based.

## Naming model

Use `terminal` as the primary replacement for the command-driven landing experience:

- `direction-two-shell.tsx` becomes `terminal-shell.tsx` and `DirectionTwoShell` becomes `TerminalShell`.
- `direction-two-intro.mjs` becomes `terminal-intro.mjs`; its exported helpers use `terminal...` names.
- `direction-two-scroll.mjs` becomes `terminal-scroll.mjs`; its exported helpers use `terminal...` names.
- `direction-two-*.test.mjs` files become `terminal-*.test.mjs` where the test concerns the terminal experience.

Use narrower semantic names for supporting pieces:

- `direction-two-ambient-background.tsx` becomes `ambient-background.tsx` and `DirectionTwoAmbientBackground` becomes `AmbientBackground`.
- Ambient CSS classes, variables, and data attributes use `ambient-*` names.
- Shared room or password behavior uses `room-*` or `password-*` names where the existing behavior already has that responsibility.

CSS keyframes, selectors, custom properties, TypeScript types, imports, test assertions, and documentation are renamed consistently. No compatibility aliases or old-name references remain in active source, tests, or project documentation.

## Scope

Included:

- Frontend source filenames, imports, exports, symbols, CSS selectors, CSS variables, and data attributes.
- Focused tests and test filenames that encode the old name.
- Relevant frontend design docs and implementation plans so future work no longer repeats the old codename.

Excluded:

- Visual, responsive, animation, interaction, routing, or data-flow changes.
- Backend code and unrelated working-tree changes.
- Deleting any implementation because of its old name.

## Verification

- Search the frontend source, tests, and docs for case-insensitive `direction two`, `direction-two`, and `directionTwo`; expected result is empty.
- Run the focused terminal, room-background, route-handoff, password, and related source-shape tests.
- Run the frontend TypeScript check/build if available.
- Run `git diff --check`.
- Confirm the final diff is naming-only and preserves the existing behavior.
