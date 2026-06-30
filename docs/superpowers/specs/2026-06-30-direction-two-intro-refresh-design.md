# Direction Two Intro Refresh Design

**Goal:** Refresh `/playground` Direction 2 so the landing moment feels smaller, sharper, and more atmospheric while preserving the terminal-first interaction model.

## Approved Direction

We are implementing `Option A`: a compact boot sequence that introduces the room concept quickly, then hands off to the terminal prompt.

## Experience Summary

- Keep Direction 1 untouched.
- Make the Direction 2 intro visibly smaller and tighter.
- Use one primary text-scramble line for the landing reveal.
- Stagger in three tiny supporting lines underneath.
- Delay the terminal transcript/prompt reveal until the intro sequence completes.
- Tint the background slightly with the currently selected theme.
- Add sparse blinking pixel dots in the background.
- Replace the static `inkog` label treatment with rotating relevant language such as anonymous rooms / temporary chat.
- Add a desktop-only custom cursor with default and pressed states.

## Interaction Model

### Intro sequence

1. The page lands on a compact hero area near the top of the shell.
2. The mark and title region fade/slide in.
3. The main statement resolves through a cryptic scramble effect.
4. Supporting highlight rows appear with short staggered timing.
5. The terminal area fades/slides in after the intro completes.

Reduced-motion users skip the staged sequence and see the final state immediately.

### Terminal continuity

The transcript and prompt behavior stay terminal-like:

- no chat-style landing panels
- no sticky footer behavior
- no helper copy injected into the transcript on load
- prompt remains the operational center once revealed

## Visual Direction

### Scale

The current hero is oversized for the intent. The revised version should feel closer to a boot header than a marketing hero:

- tighter mark sizing
- shorter supporting copy
- reduced gaps
- slightly more top padding so the shell breathes without feeling centered like a splash page

### Motion

Motion should be rare-screen delight, not app-wide decoration:

- use transform/opacity for structural reveals
- use strong ease-out timing for entrances
- keep the scramble effect limited to the main line and rotating label
- keep the prompt reveal calm and fast

### Background

The base background remains dark, but no longer pure flat black:

- add a soft radial/linear tint derived from the active theme
- add sparse pixel dots with independent blink timing
- keep the effect subtle enough that transcript legibility remains dominant

### Cursor

On fine-pointer devices only:

- hide the native cursor inside the Direction 2 shell
- render a small custom cursor with an idle outline state
- switch to a compressed/brighter state while pressed

Touch devices and reduced-motion contexts keep normal cursor behavior.

## Architecture

- Add a focused helper module for intro constants and deterministic scramble/background generation.
- Keep animation orchestration in `components/direction-two-shell.tsx`.
- Extend `app/globals.css` with a small set of reusable motion/background/cursor classes.
- Add deterministic tests for the helper module before implementation.

## Testing

- Unit-test scramble frame generation and ambient dot generation.
- Run targeted node tests for the new helper and existing shell helpers.
- Run `npm run build` in `inkog-frontend`.
