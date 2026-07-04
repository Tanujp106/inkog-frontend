export function getDirectionTwoAutoScrollTop({
  currentScrollY,
  promptTop,
  viewportHeight,
  anchorRatio = 0.85,
}) {
  if (![currentScrollY, promptTop, viewportHeight, anchorRatio].every(Number.isFinite)) {
    return currentScrollY;
  }

  if (viewportHeight <= 0) return currentScrollY;

  const anchorY = viewportHeight * anchorRatio;
  if (promptTop <= anchorY) return currentScrollY;

  return Math.max(0, currentScrollY + promptTop - anchorY);
}

export function getDirectionTwoScrollReserveHeight({
  viewportHeight,
  promptHeight,
  anchorRatio = 0.85,
}) {
  if (![viewportHeight, promptHeight, anchorRatio].every(Number.isFinite)) {
    return 0;
  }

  if (viewportHeight <= 0) return 0;

  return Math.max(0, viewportHeight - viewportHeight * anchorRatio - promptHeight);
}
