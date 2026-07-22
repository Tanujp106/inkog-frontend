import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createImpactFeedbackState,
  createImpactParticles,
  getImpactTransform,
  stepImpactFeedback,
  triggerImpactFeedback,
} from './not-found-feedback.mjs';

const wallImpact = { type: 'wall', x: 120, y: 80, normalX: 1, normalY: 0 };

test('maps impact types to their specified feedback profiles', () => {
  const cases = [
    ['wall', 0.75, 0.04, 0.1],
    ['paddle', 1.5, 0.08, 0.13],
    ['brickA', 2, 0.1, 0.15],
    ['brickB', 2.5, 0.14, 0.17],
    ['brickC', 3, 0.18, 0.19],
    ['miss', 5, 0.3, 0.24],
    ['clear', 4, 0.2, 0.28],
  ];

  for (const [type, distance, rotation, duration] of cases) {
    const state = triggerImpactFeedback(
      createImpactFeedbackState(),
      { ...wallImpact, type },
    );

    assert.deepEqual(state.impulses[0], {
      x: distance,
      y: 0,
      rotation,
      elapsed: 0,
      duration,
    });
  }
});

test('creates deterministic round spark trajectories for each impact', () => {
  const first = createImpactParticles({ type: 'brickB', x: 320, y: 180, normalX: 0, normalY: -1 });
  const second = createImpactParticles({ type: 'brickB', x: 320, y: 180, normalX: 0, normalY: -1 });

  assert.deepEqual(first, second);
  assert.equal(first.length, 6);
  assert.ok(first.every((particle) => particle.radius > 0 && particle.life > 0));
  assert.ok(first.every((particle) => Number.isFinite(particle.vx) && Number.isFinite(particle.vy)));
});

test('merges impulses and active particles without exceeding the caps', () => {
  let state = createImpactFeedbackState();

  for (let index = 0; index < 32; index += 1) {
    state = triggerImpactFeedback(state, { ...wallImpact, x: 120 + index });
  }

  const transform = getImpactTransform(state);
  assert.match(transform, /translate3d\(6px, 0px, 0\) rotate\(0\.35deg\)/);
  assert.equal(state.impulses.length, 1);
  assert.deepEqual(state.impulses[0], {
    x: 6,
    y: 0,
    rotation: 0.35,
    elapsed: 0,
    duration: 0.1,
  });
  assert.equal(state.particles.length, 96);
});

test('smoothly decays feedback and removes expired impulses and particles', () => {
  const initial = triggerImpactFeedback(createImpactFeedbackState(), wallImpact);
  const halfway = stepImpactFeedback(initial, 0.05);
  const complete = stepImpactFeedback(initial, 1);

  assert.match(getImpactTransform(halfway), /translate3d\(0\.375px, 0px, 0\) rotate\(0\.02deg\)/);
  assert.equal(complete.impulses.length, 0);
  assert.equal(complete.particles.length, 0);
});

test('keeps transforms and sparks static when reduced motion is enabled', () => {
  const state = triggerImpactFeedback(
    createImpactFeedbackState({ reducedMotion: true }),
    { type: 'clear', x: 400, y: 260, normalX: 0, normalY: -1 },
  );

  assert.equal(getImpactTransform(state), 'translate3d(0px, 0px, 0) rotate(0deg)');
  assert.deepEqual(state.particles, []);
  assert.deepEqual(stepImpactFeedback(state, 1), state);
});

test('clears active feedback when runtime reduced motion becomes preferred', () => {
  const active = triggerImpactFeedback(createImpactFeedbackState(), wallImpact);
  const reduced = stepImpactFeedback(active, 0.016, true);

  assert.deepEqual(reduced.impulses, []);
  assert.deepEqual(reduced.particles, []);
  assert.equal(getImpactTransform(reduced), 'translate3d(0px, 0px, 0) rotate(0deg)');
});
