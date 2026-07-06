export function getDirectionTwoAutoScrollTop({
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
  const anchorScrollTop = trackedBottom > anchorY ? currentScrollY + trackedBottom - anchorY : currentScrollY;
  const visibleBottom = viewportHeight - Math.max(0, viewportPadding);
  const clippedScrollTop =
    Number.isFinite(floatingBottom) && floatingBottom > visibleBottom
      ? currentScrollY + floatingBottom - visibleBottom
      : currentScrollY;

  return Math.max(0, anchorScrollTop, clippedScrollTop);
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
