const BOUNCE_DURATION_MS = 1200;
const BOUNCE_HEIGHT = 8;

const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), maximum);

const ENERGY_COLORS = [
  { name: "signal", ball: null, glow: null, trail: null },
  { name: "cyan", ball: "#d8ffff", glow: "#61dada", trail: "#8ceeee" },
  { name: "amber", ball: "#fff0c4", glow: "#f2b45f", trail: "#ffd88e" },
  { name: "magenta", ball: "#ffe0ef", glow: "#e57eb3", trail: "#f4a6ce" },
];

export function getBreakoutColorStage(energyLevel, accent = "#2f7d50") {
  const stage = ENERGY_COLORS[clamp(Math.round(energyLevel ?? 0), 0, ENERGY_COLORS.length - 1)];

  return {
    ...stage,
    ball: stage.ball ?? accent,
    glow: stage.glow ?? accent,
    trail: stage.trail ?? accent,
    brick: stage.glow ?? accent,
    paddle: stage.ball ?? accent,
  };
}

export function getBreakoutIdleBallOffset(elapsedMs, mode, prefersReducedMotion) {
  if (prefersReducedMotion || (mode !== "idle" && mode !== "waiting")) return 0;

  const safeElapsed = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  const progress = (safeElapsed % BOUNCE_DURATION_MS) / BOUNCE_DURATION_MS;
  const offset = -BOUNCE_HEIGHT * Math.sin(Math.PI * progress) ** 2;
  return offset === 0 ? 0 : offset;
}
