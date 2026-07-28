# Task 2 Brief: Breakout sounds through the existing mute system

## Global Constraints

- Honor the existing persisted global mute preference; add no 404-specific toggle.
- Add no audio assets or dependencies.
- Preserve unrelated working-tree changes.

## Files

- Modify only lib/system-sound-profile.mjs, lib/system-sound-provider.tsx, and lib/system-sound.test.mjs.

## Required Interface

Add SystemSoundName and profile entries for breakoutLaunch, breakoutWall, breakoutPaddle, breakoutBrickA, breakoutBrickB, breakoutBrickC, breakoutMiss, and breakoutClear. They must work through the existing useSystemSound().play(name) path.

## TDD Requirements

1. First add a test proving all eight names exist, the three brick-leading frequencies are distinct, breakoutClear has at least three notes, and every peak gain is between 0.24 and 0.5.
2. Run node --test lib/system-sound.test.mjs and capture expected RED.
3. Add the TypeScript union names and synthesized profile specs.
4. Keep wall/paddle/brick collision cues below 0.08 seconds. Use leading frequencies: wall 310, paddle 430, brickA 640, brickB 720, brickC 810. Use a low two-note miss and three-note clear flourish.
5. Rerun the same test and capture GREEN.

## Commit

Commit only the three sound files with subject: Add Breakout sound effects
