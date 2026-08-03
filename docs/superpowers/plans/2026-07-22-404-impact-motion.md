# 404 Impact Motion and Spark Effects

## Global constraints

- Preserve collision outcomes, controls, sound event strings, shader configuration, routes, and existing layout.
- Keep the ambient shader outside the moving game stage.
- Use the existing requestAnimationFrame loop only; no dependencies or extra scheduler.
- Use round spark particles, deterministic trajectories, bounded lifetimes, and a maximum active-particle cap.
- Respect reduced motion by suppressing moving shake and sparks.
- Preserve user-owned unrelated worktree changes, including the current crimson fallback accent change.

## Task 1: Deterministic feedback engine

Create `lib/not-found-feedback.mjs` and `lib/not-found-feedback.test.mjs`.

- Expose `createImpactFeedbackState`, `triggerImpactFeedback`, `stepImpactFeedback`, `getImpactTransform`, and `createImpactParticles`.
- Profiles: wall 0.75px/0.04deg/100ms; paddle 1.5px/0.08deg/130ms; brick A/B/C 2-3px/0.10-0.18deg/150-190ms; miss 5px/0.30deg/240ms; clear 4px/0.20deg/280ms.
- Merge impulses with a smooth decay, capped at 6px translation and 0.35deg rotation.
- Generate round sparks: wall 2-4; paddle 5-7; brick 4-8; miss 10; clear 12. Cap active particles at 96.
- Test mappings, deterministic generation, cap/merge behavior, decay, expiration, and reduced motion.

## Task 2: Collision impact metadata

Update `lib/not-found-breakout.mjs` and `lib/not-found-breakout.test.mjs`.

- Keep `events` as the existing sound-string array.
- Add an ephemeral `impactEvents` array of `{ type, x, y, normalX, normalY }` and clear it alongside `events`.
- Populate metadata for wall, paddle, brick, miss, and clear collisions in stable order.
- Keep all existing ball, brick, speed, lives, and mode outcomes unchanged.
- Test impact origins/normals and verify legacy event strings and game outcomes remain unchanged.

## Task 3: Canvas and game-stage integration

Update `components/not-found-breakout.tsx`, `app/globals.css`, and `lib/not-found-page.test.mjs`.

- Keep the ambient shader outside a new game-stage wrapper containing canvas, HUD, controls, lives, home link, and completion actions.
- Consume `impactEvents` to trigger feedback while retaining existing sound playback from `events`.
- Advance feedback in the existing RAF loop, apply `translate3d` plus rotation to the game-stage DOM ref, and render round sparks in the canvas after game objects.
- Reset feedback on restart and visibility changes; keep reduced-motion transforms and sparks static.
- Keep clear confetti and ghost bricks intact.
- Add page contracts for stage/shader separation, feedback lifecycle, and spark rendering.

## Task 4: Verification

- Run all focused 404, feedback, confetti, and sound tests; TypeScript; `git diff --check`; and production build.
- Reuse the existing `127.0.0.1:3000` listener to verify paddle, brick, wall, miss, clear, restart, and reduced-motion behavior.
- Review the final diff for scope adherence and preserve unrelated dirty changes.
