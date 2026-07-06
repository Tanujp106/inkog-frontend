export function getDirectionTwoAutoScrollTop({
  currentScrollY,
  floatingHeight = 0,
  promptTop,
  viewportHeight,
  anchorRatio = 0.85,
}) {
  if (![currentScrollY, floatingHeight, promptTop, viewportHeight, anchorRatio].every(Number.isFinite)) {
    return currentScrollY;
  }

  if (viewportHeight <= 0) return currentScrollY;

  const anchorY = viewportHeight * anchorRatio;
  const trackedBottom = promptTop + Math.max(0, floatingHeight);
  if (trackedBottom <= anchorY) return currentScrollY;

  return Math.max(0, currentScrollY + trackedBottom - anchorY);
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
