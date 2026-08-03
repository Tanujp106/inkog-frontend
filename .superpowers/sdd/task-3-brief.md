# Task 3 Brief: Deterministic square confetti

## Global Constraints

- Use no dependency.
- Use square pixel language and full-arena coverage.
- Preserve unrelated working-tree changes.

## Files

- Create only lib/not-found-confetti.mjs and lib/not-found-confetti.test.mjs.

## Required Interface

- createBreakoutConfetti(width, height, count = 160)
- stepBreakoutConfetti(particles, deltaSeconds, width, height)
- Particle fields: x, y, size, vx, vy, rotation, rotationSpeed, life, colorIndex.

## TDD Requirements

1. Write tests first proving deterministic output, exact requested count, 4-10px sizes, coverage in both outer arena quarters, movement/rotation after a step, and decreasing life.
2. Run node --test lib/not-found-confetti.test.mjs and capture module-not-found RED.
3. Implement a local seeded generator based on dimensions. Spawn across the upper 45%, apply gravity, drag, rotation, finite life, and deterministic colorIndex. Remove only expired or below-arena particles.
4. Rerun the same test and capture GREEN.

## Commit

Commit only both confetti files with subject: Add square Breakout confetti
