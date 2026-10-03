export function getMobileViewportMetrics({ windowHeight, viewportHeight = windowHeight, viewportTop = 0, layoutHeight = windowHeight, focused = false }) {
  const height = Math.max(1, Number.isFinite(viewportHeight) ? viewportHeight : windowHeight);
  const top = Math.max(0, Number.isFinite(viewportTop) ? viewportTop : 0);
  return {
    height,
    top,
    bottomInset: Math.max(0, windowHeight - height - top),
    layoutHeight,
    keyboardOpen: focused && layoutHeight - height > 120,
  };
}

// Keep the page's layout height stable while keyboards change the visible area.
export function observeMobileViewport({ window: win, isFocused, onChange, mediaQuery = "(max-width: 639px), (max-width: 1024px) and (max-height: 500px)" }) {
  const media = win.matchMedia(mediaQuery);
  const viewport = win.visualViewport;
  let width = win.innerWidth;
  let layoutHeight = win.innerHeight;
  let frame = 0;
  const sync = () => {
    frame = 0;
    if (!media.matches) {
      width = win.innerWidth;
      layoutHeight = win.innerHeight;
      onChange(null);
      return;
    }
    layoutHeight = width !== win.innerWidth ? win.innerHeight : Math.max(layoutHeight, win.innerHeight);
    width = win.innerWidth;
    onChange(getMobileViewportMetrics({
      windowHeight: win.innerHeight,
      viewportHeight: viewport?.height ?? win.innerHeight,
      viewportTop: viewport?.offsetTop ?? 0,
      layoutHeight,
      focused: isFocused(),
    }));
  };
  const schedule = () => { if (!frame) frame = win.requestAnimationFrame(sync); };
  const listeners = [[viewport, "resize"], [viewport, "scroll"], [win, "resize"], [media, "change"], [win.document, "focusin"], [win.document, "focusout"]];
  for (const [target, event] of listeners) target?.addEventListener(event, schedule);
  sync();
  return () => {
    if (frame) win.cancelAnimationFrame(frame);
    for (const [target, event] of listeners) target?.removeEventListener(event, schedule);
  };
}
