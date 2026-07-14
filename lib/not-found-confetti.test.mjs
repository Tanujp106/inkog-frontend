import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createBreakoutConfetti,
  stepBreakoutConfetti,
} from './not-found-confetti.mjs';

test('creates deterministic square particles across the full arena', () => {
  const width = 1280;
  const height = 720;
  const first = createBreakoutConfetti(width, height, 160);
  const second = createBreakoutConfetti(width, height, 160);

  assert.deepEqual(first, second);
  assert.equal(first.length, 160);
  assert.ok(first.every((particle) => particle.size >= 4 && particle.size <= 10));
  assert.ok(first.some((particle) => particle.x < width * 0.25));
  assert.ok(first.some((particle) => particle.x > width * 0.75));
});

test('steps particles with motion, rotation, and decreasing life', () => {
  const width = 1280;
  const height = 720;
  const particles = createBreakoutConfetti(width, height, 32);
  const stepped = stepBreakoutConfetti(particles, 0.25, width, height);

  assert.equal(stepped.length, particles.length);
  assert.ok(stepped.some((particle, index) => (
    particle.x !== particles[index].x
    || particle.y !== particles[index].y
    || particle.rotation !== particles[index].rotation
  )));
  assert.ok(stepped.every((particle, index) => particle.life < particles[index].life));
});
