const createSeededRandom = (width, height) => {
  let state = (
    (Math.floor(width) * 73856093)
    ^ (Math.floor(height) * 19349663)
    ^ 0x9e3779b9
  ) >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

export const createBreakoutConfetti = (width, height, count = 160) => {
  const random = createSeededRandom(width, height);

  return Array.from({ length: count }, (_, index) => {
    const size = 4 + Math.floor(random() * 7);

    return {
      x: ((index + random()) / count) * width,
      y: random() * height * 0.45,
      size,
      vx: (random() - 0.5) * 320,
      vy: -80 - random() * 190,
      rotation: random() * 360,
      rotationSpeed: (random() - 0.5) * 540,
      life: 1.8 + random() * 1.4,
      colorIndex: Math.floor(random() * 4),
    };
  });
};

export const stepBreakoutConfetti = (particles, deltaSeconds, width, height) => {
  const drag = Math.pow(0.985, deltaSeconds * 60);

  return particles.reduce((nextParticles, particle) => {
    const life = particle.life - deltaSeconds;
    const vx = particle.vx * drag;
    const vy = particle.vy * drag + 460 * deltaSeconds;
    const nextParticle = {
      ...particle,
      x: particle.x + vx * deltaSeconds,
      y: particle.y + vy * deltaSeconds,
      vx,
      vy,
      rotation: particle.rotation + particle.rotationSpeed * deltaSeconds,
      life,
    };

    if (life > 0 && nextParticle.y <= height + nextParticle.size) {
      nextParticles.push(nextParticle);
    }

    return nextParticles;
  }, []);
};
