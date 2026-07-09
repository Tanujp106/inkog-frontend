export const directionTwoAutoScrollAnimationDurationMs = 520;

export function getDirectionTwoAutoScrollTop({
  allowReverse = false,
  currentScrollY,
  floatingBottom,
  floatingHeight = 0,
  promptTop,
  viewportHeight,
  viewportPadding = 0,
  anchorRatio = 0.85,
}) {
  if (![currentScrollY, floatingHeight, promptTop, viewportHeight, viewportPadding, anchorRatio].every(Number.isFinite)) {
    return currentScrollY;
  }

  if (viewportHeight <= 0) return currentScrollY;

  const anchorY = viewportHeight * anchorRatio;
  const trackedBottom = promptTop + Math.max(0, floatingHeight);
  const anchoredScrollTop = currentScrollY + trackedBottom - anchorY;
  const anchorScrollTop = allowReverse ? anchoredScrollTop : trackedBottom > anchorY ? anchoredScrollTop : currentScrollY;
  const visibleBottom = viewportHeight - Math.max(0, viewportPadding);
  const clippedScrollTop =
    Number.isFinite(floatingBottom) && floatingBottom > visibleBottom
      ? currentScrollY + floatingBottom - visibleBottom
      : allowReverse
        ? 0
        : currentScrollY;

  return Math.max(0, anchorScrollTop, clippedScrollTop);
}

export function getDirectionTwoScrollAnimationTop({
  startScrollY,
  targetScrollY,
  elapsedMs,
  durationMs = directionTwoAutoScrollAnimationDurationMs,
}) {
  if (![startScrollY, targetScrollY, elapsedMs, durationMs].every(Number.isFinite)) {
    return Number.isFinite(targetScrollY) ? targetScrollY : 0;
  }

  if (durationMs <= 0) return targetScrollY;

  const progress = Math.min(1, Math.max(0, elapsedMs / durationMs));
  const easedProgress =
    progress < 0.5
      ? 4 * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;

  return startScrollY + (targetScrollY - startScrollY) * easedProgress;
}

export function getDirectionTwoScrollReserveHeight({
  floatingHeight = 0,
  viewportHeight,
  promptHeight,
  anchorRatio = 0.85,
}) {
  if (![floatingHeight, viewportHeight, promptHeight, anchorRatio].every(Number.isFinite)) {
    return 0;
  }

  if (viewportHeight <= 0) return 0;

  return Math.max(
    0,
    viewportHeight - viewportHeight * anchorRatio - promptHeight,
    floatingHeight,
  );
}
