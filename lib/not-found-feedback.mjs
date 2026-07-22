const MAX_TRANSLATION = 6;
const MAX_ROTATION = 0.35;
const MAX_PARTICLES = 96;

const IMPACT_PROFILES = {
  wall: { distance: 0.75, rotation: 0.04, duration: 0.1, particleCount: 3 },
  paddle: { distance: 1.5, rotation: 0.08, duration: 0.13, particleCount: 6 },
  brickA: { distance: 2, rotation: 0.1, duration: 0.15, particleCount: 4 },
  brickB: { distance: 2.5, rotation: 0.14, duration: 0.17, particleCount: 6 },
  brickC: { distance: 3, rotation: 0.18, duration: 0.19, particleCount: 8 },
  brick: { distance: 2.5, rotation: 0.14, duration: 0.17, particleCount: 6 },
  miss: { distance: 5, rotation: 0.3, duration: 0.24, particleCount: 10 },
  clear: { distance: 4, rotation: 0.2, duration: 0.28, particleCount: 12 },
};

const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), maximum);

const capTranslation = (x, y) => {
  const magnitude = Math.hypot(x, y);
  if (magnitude <= MAX_TRANSLATION) return { x, y };

  const scale = MAX_TRANSLATION / magnitude;
  return { x: x * scale, y: y * scale };
};

const getProfile = (type) => IMPACT_PROFILES[type] ?? IMPACT_PROFILES.wall;

const createSeededRandom = ({ type, x, y, normalX, normalY }) => {
  let state = (
    (Math.floor(x) * 73856093)
    ^ (Math.floor(y) * 19349663)
    ^ (Math.floor(normalX * 100) * 83492791)
    ^ (Math.floor(normalY * 100) * 2654435761)
    ^ [...type].reduce((hash, character) => ((hash * 33) ^ character.charCodeAt(0)) >>> 0, 5381)
  ) >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

const getParticleDirection = (impact) => {
  const magnitude = Math.hypot(impact.normalX, impact.normalY);
  if (magnitude) return { x: impact.normalX / magnitude, y: impact.normalY / magnitude };
  return { x: 0, y: -1 };
};

const format = (value) => Number(value.toFixed(3));

const getImpulseDecay = (impulse) => {
  const progress = clamp(impulse.elapsed / impulse.duration, 0, 1);
  return 1 - (progress * progress * (3 - (2 * progress)));
};

const mergeImpulses = (impulses) => {
  if (!impulses.length) return [];

  const merged = impulses.reduce((total, impulse) => {
    const decay = getImpulseDecay(impulse);
    total.x += impulse.x * decay;
    total.y += impulse.y * decay;
    total.rotation += impulse.rotation * decay;
    total.duration = Math.max(total.duration, impulse.duration - impulse.elapsed);
    return total;
  }, { x: 0, y: 0, rotation: 0, duration: 0 });
  const translation = capTranslation(merged.x, merged.y);

  return [{
    x: format(translation.x),
    y: format(translation.y),
    rotation: format(clamp(merged.rotation, -MAX_ROTATION, MAX_ROTATION)),
    elapsed: 0,
    duration: format(merged.duration),
  }];
};

export const createImpactFeedbackState = ({ reducedMotion = false } = {}) => ({
  reducedMotion,
  impulses: [],
  particles: [],
});

export const createImpactParticles = (impact) => {
  const profile = getProfile(impact.type);
  const random = createSeededRandom(impact);
  const direction = getParticleDirection(impact);

  return Array.from({ length: profile.particleCount }, (_, index) => {
    const spread = (random() - 0.5) * 1.25;
    const speed = 90 + random() * 150;
    const cosine = Math.cos(spread);
    const sine = Math.sin(spread);
    const vx = (direction.x * cosine - direction.y * sine) * speed;
    const vy = (direction.y * cosine + direction.x * sine) * speed;

    return {
      x: impact.x,
      y: impact.y,
      radius: format(1.25 + random() * 2),
      vx: format(vx),
      vy: format(vy),
      life: format(0.24 + random() * 0.22),
    };
  });
};

export const triggerImpactFeedback = (state, impact) => {
  if (state.reducedMotion) return state;

  const profile = getProfile(impact.type);
  const direction = getParticleDirection(impact);
  const rotationDirection = direction.x || (impact.x % 2 ? -1 : 1);
  const impulse = {
    x: format(direction.x * profile.distance),
    y: format(direction.y * profile.distance),
    rotation: format(rotationDirection * profile.rotation),
    elapsed: 0,
    duration: profile.duration,
  };
  const particles = [...state.particles, ...createImpactParticles(impact)].slice(-MAX_PARTICLES);

  return { ...state, impulses: mergeImpulses([...state.impulses, impulse]), particles };
};

export const stepImpactFeedback = (state, deltaSeconds, prefersReducedMotion = false) => {
  if (state.reducedMotion || prefersReducedMotion) {
    return { ...state, impulses: [], particles: [] };
  }

  const delta = Math.max(0, deltaSeconds);
  const impulses = state.impulses.reduce((next, impulse) => {
    const elapsed = impulse.elapsed + delta;
    if (elapsed < impulse.duration) next.push({ ...impulse, elapsed });
    return next;
  }, []);
  const particles = state.particles.reduce((next, particle) => {
    const life = particle.life - delta;
    if (life > 0) {
      next.push({
        ...particle,
        x: particle.x + particle.vx * delta,
        y: particle.y + particle.vy * delta,
        vy: particle.vy + 420 * delta,
        life,
      });
    }
    return next;
  }, []);

  return { ...state, impulses, particles };
};

export const getImpactTransform = (state) => {
  if (state.reducedMotion) return 'translate3d(0px, 0px, 0) rotate(0deg)';

  const values = state.impulses.reduce((total, impulse) => {
    const decay = getImpulseDecay(impulse);
    total.x += impulse.x * decay;
    total.y += impulse.y * decay;
    total.rotation += impulse.rotation * decay;
    return total;
  }, { x: 0, y: 0, rotation: 0 });
  const translation = capTranslation(values.x, values.y);
  const x = format(translation.x);
  const y = format(translation.y);
  const rotation = format(clamp(values.rotation, -MAX_ROTATION, MAX_ROTATION));

  return `translate3d(${x}px, ${y}px, 0) rotate(${rotation}deg)`;
};
