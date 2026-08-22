export const routeHandoffTransitionMs = 800;

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
    width: "min(calc(100vw - var(--route-composer-inline-gutter)), 1200px)",
    zIndex: 20,
  };
}

const landingDelayByPart = {
  terminal: 0,
  body: 135,
  title: 210,
  composer: 380,
};

const roomDelayByPart = {
  header: 280,
  transcript: 360,
  composer: 440,
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
    ? Math.max(0, order) * 45
    : (landingDelayByPart[part] ?? 0);

  return {
    opacity: 0,
    pointerEvents: "none",
    transform: part === "composer" ? "translateX(-50%)" : "translateY(-14px)",
    transitionDelay: `${delay}ms`,
    transitionDuration: "240ms, 300ms",
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
      transform: part === "composer" ? "translate(-50%, -8px)" : "translateY(-8px)",
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
    transitionDuration: "260ms, 320ms",
    transitionProperty: "opacity, transform",
    transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
  };
}
