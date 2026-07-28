export const routeHandoffExitMs = 120;
export const routeHandoffEnterMs = 160;

export function createRouteHandoffState() {
  return { phase: "idle", roomId: null };
}

export function reduceRouteHandoff(state, event) {
  if (!event || typeof event !== "object") return state;

  if (event.type === "cancel") {
    return createRouteHandoffState();
  }

  if (event.type === "begin" && typeof event.roomId === "string" && event.roomId) {
    return { phase: "leaving", roomId: event.roomId };
  }

  if (event.roomId !== state.roomId) return state;

  if (event.type === "left" && state.phase === "leaving") {
    return { phase: "pending", roomId: state.roomId };
  }

  if (event.type === "ready" && state.phase === "pending") {
    return { phase: "entering", roomId: state.roomId };
  }

  if (event.type === "complete" && state.phase === "entering") {
    return createRouteHandoffState();
  }

  return state;
}

function foregroundOpacity({ state, surface, roomId }) {
  if (surface === "landing") {
    return state.phase === "leaving" || state.phase === "pending" ? 0 : 1;
  }

  const matchesDestination = Boolean(roomId) && roomId === state.roomId;
  if (!matchesDestination) return 1;
  return state.phase === "pending" ? 0 : 1;
}

export function getRouteComposerStyle() {
  return {
    bottom: "24px",
    left: "50%",
    maxWidth: "1120px",
    position: "fixed",
    transform: "translateX(-50%)",
    width: "min(calc(100vw - 5rem), 1120px)",
    zIndex: 20,
  };
}

export function getRouteForegroundStyle(options) {
  const opacity = foregroundOpacity(options);

  if (options.reducedMotion) {
    if (options.state.phase === "idle") return {};
    return {
      opacity,
      transition: "opacity 1ms linear",
    };
  }

  if (options.surface === "landing" && options.state.phase === "leaving") {
    return {
      opacity,
      transition: `opacity ${routeHandoffExitMs}ms cubic-bezier(0.22, 1, 0.36, 1)`,
    };
  }

  if (options.surface === "landing" && options.state.phase === "pending") {
    return {
      opacity,
      transition: "none",
    };
  }

  if (
    options.surface === "room" &&
    options.roomId === options.state.roomId &&
    options.state.phase === "pending"
  ) {
    return {
      opacity,
      transition: "none",
    };
  }

  if (
    options.surface === "room" &&
    options.roomId === options.state.roomId &&
    options.state.phase === "entering"
  ) {
    return {
      opacity,
      transition: `opacity ${routeHandoffEnterMs}ms cubic-bezier(0.22, 1, 0.36, 1)`,
    };
  }

  return {};
}
