export const routeHandoffTransitionMs = 560;

export function createRouteHandoffState() {
  return { phase: "idle", roomId: null };
}

export function reduceRouteHandoff(state, event) {
  if (!event || typeof event !== "object") return state;

  if (event.type === "cancel") {
    return createRouteHandoffState();
  }

  if (event.type === "begin" && typeof event.roomId === "string" && event.roomId) {
    return { phase: "pending", roomId: event.roomId };
  }

  if (event.roomId !== state.roomId) return state;

  if (event.type === "ready" && state.phase === "pending") {
    return { phase: "transitioning", roomId: state.roomId };
  }

  if (event.type === "complete" && state.phase === "transitioning") {
    return { phase: "settled", roomId: state.roomId };
  }

  if (event.type === "cleanup" && state.phase === "settled") {
    return createRouteHandoffState();
  }

  return state;
}

export function getRouteComposerStyle() {
  return {
    bottom: "24px",
    left: "50%",
    maxWidth: "1200px",
    position: "fixed",
    transform: "translateX(-50%)",
    width: "min(calc(100vw - var(--route-composer-inline-gutter, 5rem)), 1200px)",
    zIndex: 20,
  };
}

const landingDelayByPart = {
  terminal: 0,
  body: 60,
  title: 90,
  composer: 120,
};

const roomDelayByPart = {
  header: 100,
  transcript: 140,
  composer: 180,
};

export function getRouteStatusPresentation(action) {
  if (action === "create") {
    return { ariaLabel: "Creating private room", text: "creating private room..." };
  }
  if (action === "join") {
    return { ariaLabel: "Joining room", text: "joining room..." };
  }
  return null;
}

export function getLandingHandoffStyle({ state, part, order = 0, reducedMotion = false }) {
  if (state.phase === "settled") {
    return {
      opacity: 0,
      pointerEvents: "none",
      transform: part === "composer" ? "translateX(-50%)" : "translateY(-14px)",
      transition: "none",
    };
  }

  if (state.phase !== "transitioning") return {};

  if (reducedMotion) {
    return {
      opacity: 0,
      transition: "opacity 1ms linear",
    };
  }

  const delay = part === "usp"
    ? Math.max(0, order) * 30
    : (landingDelayByPart[part] ?? 0);

  return {
    opacity: 0,
    pointerEvents: "none",
    transform: part === "composer" ? "translateX(-50%)" : "translateY(-8px)",
    transitionDelay: `${delay}ms`,
    transitionDuration: "180ms, 220ms",
    transitionProperty: "opacity, transform",
    transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
  };
}

export function getRoomHandoffStyle({ state, part, roomId, reducedMotion = false }) {
  const matchesDestination = Boolean(roomId) && roomId === state.roomId;
  if (!matchesDestination || state.phase === "idle") return {};

  if (state.phase === "pending") {
    return {
      opacity: 0,
      pointerEvents: "none",
      transform: part === "composer"
        ? (reducedMotion ? "translate(-50%, 0)" : "translate(-50%, -8px)")
        : (reducedMotion ? "translateY(0)" : "translateY(-8px)"),
    };
  }

  if (state.phase === "settled") {
    return {
      opacity: 1,
      transform: part === "composer" ? "translate(-50%, 0)" : "translateY(0)",
      transition: "none",
    };
  }

  if (state.phase !== "transitioning") return {};

  if (reducedMotion) {
    return {
      opacity: 1,
      transition: "opacity 1ms linear",
    };
  }

  return {
    opacity: 1,
    transform: part === "composer" ? "translate(-50%, 0)" : "translateY(0)",
    transitionDelay: `${roomDelayByPart[part] ?? 0}ms`,
    transitionDuration: "220ms, 240ms",
    transitionProperty: "opacity, transform",
    transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
  };
}
