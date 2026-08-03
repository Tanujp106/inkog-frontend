const BOUNCE_DURATION_MS = 1200;
const BOUNCE_HEIGHT = 8;

export function getBreakoutIdleBallOffset(elapsedMs, mode, prefersReducedMotion) {
  if (prefersReducedMotion || (mode !== "idle" && mode !== "waiting")) return 0;

  const safeElapsed = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  const progress = (safeElapsed % BOUNCE_DURATION_MS) / BOUNCE_DURATION_MS;
  const offset = -BOUNCE_HEIGHT * Math.sin(Math.PI * progress) ** 2;
  return offset === 0 ? 0 : offset;
}
