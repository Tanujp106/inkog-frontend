# Task 4 Report: Full-screen canvas, HUD, input, audio, and clear actions

## Status

Completed and committed on `tanuj-changes`.

- Commit: `1580e0956f57727547aa897cebe051ad3ec63d64`
- Subject: `Make Breakout 404 a full-screen experience`
- Base: `fe3723a9029988fe5ed840ee43cdd03ebdcaed85`

## RED evidence

The page/client contract was updated before production code. The required command failed for the expected missing Task 4 behavior:

```text
$ node --test lib/not-found-page.test.mjs
TAP version 13
# Subtest: custom 404 page mounts the pixel breakout game and keeps both home links
not ok 1 - custom 404 page mounts the pixel breakout game and keeps both home links
error: The input did not match the regular expression /press any key to start/. Input:
1..1
# tests 1
# suites 0
# pass 0
# fail 1
# cancelled 0
# skipped 0
# todo 0
# duration_ms 49.926833
```

The failure was a contract mismatch against the old Enter-only client, not a syntax or test setup error.

## Implementation

- Replaced the inset fixed-ratio game frame with one transparent canvas filling the measured arena between the full-width header border and viewport-bottom arena border.
- Added `ResizeObserver`-driven physics/canvas sizing through `resizeBreakout`, with backing resolution capped at device-pixel ratio 2 and resize handling for DPR changes.
- Kept `AmbientShaderBackground` mounted with the existing call and did not modify its implementation or configuration.
- Added top-center status, top-right lives, lower-left controls, lower-right home recovery, responsive safe-area padding, and no colored HUD container.
- Added `shouldLaunchBreakoutForKey` input handling with `R` precedence, approved ordinary-key launch, arrow launch-then-move, modifier blocking, pointer scaling to measured geometry, and an interactive-target guard so Enter still activates links/buttons.
- Routed every engine event through the existing global `useSystemSound().play(name)` mapping. Events are played when a state is committed, once per emitted event; the arrow-launch ordering was corrected during self-review so movement cannot clear the launch cue first.
- Initialized square confetti once on transition to `cleared`, animated it through `stepBreakoutConfetti`, and used a static full-arena scatter under reduced motion.
- Replaced the normal HUD with only `restart` and `back to home` in the cleared branch; canvas drawing suppresses the ball and paddle in that state.

## GREEN evidence

Final focused suite after review fixes:

```text
$ node --test lib/not-found-page.test.mjs lib/not-found-breakout.test.mjs lib/not-found-confetti.test.mjs lib/system-sound.test.mjs
1..28
# tests 28
# suites 0
# pass 28
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 59.604708
```

Additional verification:

```text
$ npx tsc --noEmit --pretty false
# exit 0, no output

$ git diff --cached --check
# exit 0, no output
```

## Files and hunks committed

- `components/not-found-breakout.tsx`: full-screen arena client, measured resize, HUD, keyboard/pointer input, sound dispatch, confetti, clear actions, and rendering.
- `app/not-found.tsx`: thin App Router shell mounting the linked brand and `NotFoundBreakout`.
- `lib/not-found-page.test.mjs`: Task 4 page/client/CSS contract, including required presences and legacy frame/grid absences.
- `app/globals.css`: only the final 404-specific block and its related responsive/reduced-motion rules.

CSS was staged non-interactively through an index-only blob built from the HEAD prefix plus the final 404 block. The route-transition rules near the top and Direction 2/password rules after the 404 block were excluded from the index. Post-commit, `app/globals.css` remains modified only because those unrelated working-tree rules were preserved.

## Self-review

- Viewport arena boundaries: the shell is full width and `100dvh`; the header and arena each provide their required bottom boundary; `ResizeObserver` measures the actual arena used by physics and rendering.
- Clear-only actions: normal prompt, lives, controls, home HUD, paddle, and ball are absent/suppressed while cleared; only restart and home actions overlay the canvas/confetti.
- Event sound replay: state events are consumed only during state commit and are not inferred during rendering; arrow launch commits its launch event before movement clears transient events.
- Reduced motion: clear particles are spread once and remain static; sustained confetti stepping is disabled.
- Pointer/keyboard: pointer coordinates map to current measured width; touch capture remains scoped; `R` is checked first; approved launch keys use the engine helper; modifiers and interactive targets are respected.
- High-DPI resize: CSS dimensions drive physics, backing dimensions use capped DPR, transforms are reset after backing changes, and window resize covers monitor/zoom DPR changes.
- Dirty tree: staged file list was exactly the four intended files; unrelated route, Direction 2, room, and transition work remains unstaged/untracked.

## Concerns

- Task 4 was verified with contract/engine/confetti/sound tests and TypeScript only. Browser visual and audio validation is intentionally deferred to the later final-verification task.
- The working tree remains dirty with pre-existing unrelated work, including the deliberately unstaged CSS rules; none of it was discarded or committed.

## Task 4 review fixes

Completed and committed on `tanuj-changes`.

- Commit: `7937bcfe59ab1c2de06a319372371921412358bc`
- Subject: `Refine Breakout canvas lifecycle`
- Files committed: `components/not-found-breakout.tsx`, `lib/not-found-page.test.mjs`
- CSS: unchanged and unstaged; all unrelated `app/globals.css` work remains in the working tree.

### Fix RED evidence

The stronger source contract was written before the review implementation and failed against the conditional shader mount:

```text
$ node --test lib/not-found-page.test.mjs
TAP version 13
# Subtest: custom 404 page mounts the pixel breakout game and keeps both home links
not ok 1 - custom 404 page mounts the pixel breakout game and keeps both home links
error: reduced motion must not unmount the ambient shader
1..1
# tests 1
# suites 0
# pass 0
# fail 1
# cancelled 0
# skipped 0
# todo 0
# duration_ms 57.857875
```

### Review implementation

- Mounted `AmbientShaderBackground` unconditionally with the exact existing props; reduced motion now changes only confetti behavior.
- Gated RAF work so idle, waiting, cleared-reduced, and exhausted-confetti frames do not advance game state or redraw the canvas continuously.
- Added a targeted `MutationObserver` for `data-inkog-theme` canvas redraws with cleanup.
- Moved status/control descriptions directly onto the focusable canvas, changed its interactive role to `application`, added keyboard shortcuts metadata, and kept a polite `sr-only` clear announcement while only the two approved actions remain visible.
- Rebuilt and redistributed static confetti when reduced motion is enabled during an existing cleared state.
- Switched arena measurement to `clientWidth`/`clientHeight` so physics and DPR-capped backing dimensions exclude visible borders.
- Strengthened source contracts for unconditional shader mounting, active-frame gating, observer/listener cleanup, theme redraw, accessibility associations, clear announcement, key ordering/interactive guard, and event-to-sound consumption.

### Fix GREEN evidence

Final focused verification after all review fixes:

```text
$ node --test lib/not-found-page.test.mjs lib/not-found-breakout.test.mjs lib/not-found-confetti.test.mjs lib/system-sound.test.mjs
1..28
# tests 28
# suites 0
# pass 28
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 58.167166

$ npx tsc --noEmit --pretty false
# exit 0, no output

$ git diff --check -- components/not-found-breakout.tsx lib/not-found-page.test.mjs app/globals.css
# exit 0, no output

$ git diff --cached --check
# exit 0, no output
```

### Review-fix concerns

- No browser or audible playback pass was added in this review-fix task; the requested source contracts, focused behavior tests, and TypeScript verification are clean.
- The pre-existing unrelated dirty working tree remains preserved, including the deliberately unstaged CSS changes.
