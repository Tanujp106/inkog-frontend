# Task 2 Report: Breakout sounds through the existing mute system

## Implementation

- Added the eight Breakout sound names to `systemSoundNames` and the `SystemSoundName` TypeScript union.
- Added synthesized Web Audio profiles for launch, wall, paddle, three brick variants, miss, and clear.
- Left `SystemSoundProvider` playback and mute handling unchanged: every new name travels through the existing `useSystemSound().play(name)` function, which returns without creating audio when globally muted.
- Added a regression test covering name registration, controlled gains, required collision frequencies and durations, a descending two-note miss, and a three-note-or-longer clear flourish.

## RED evidence

Command:

```sh
node --test lib/system-sound.test.mjs
```

Result: exit 1. Existing tests 1–8 passed; the new ninth test failed as intended:

```text
not ok 9 - Breakout cues are distinct, brief, and balanced
err: 'breakoutLaunch should be a playable system sound'
# pass 8
# fail 1
```

## GREEN evidence

Command:

```sh
node --test lib/system-sound.test.mjs
```

Result: exit 0.

```text
ok 9 - Breakout cues are distinct, brief, and balanced
# tests 9
# pass 9
# fail 0
```

## Files

- `lib/system-sound-profile.mjs`
- `lib/system-sound-provider.tsx`
- `lib/system-sound.test.mjs`

## Self-review

- All new peak gains are within 0.24–0.5 after the existing master-volume multiplier.
- Wall, paddle, and brick collision durations are all under 0.08 seconds.
- Collision-leading frequencies match the brief: wall 310, paddle 430, bricks 640/720/810.
- No toggle, audio asset, dependency, engine file, plan, spec, or ledger change was made.

## Concerns

- No browser check was run: this task changes only the existing synthesized sound profile and typed interface; the focused Node test validates the specified contract. Audible tuning can be adjusted later during Breakout client integration if desired.
