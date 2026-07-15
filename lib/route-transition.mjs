export const routeHandoffDurationMs = 400;
export const reducedRouteHandoffDurationMs = 24;

export const routeComposerGeometry = Object.freeze({
  maxWidth: "1120px",
  horizontalPadding: "clamp(24px, 2.7778vw, 40px)",
  bottomPadding: "var(--route-composer-bottom-padding)",
  framePadding: "16px",
  fontSize: "14px",
  lineHeight: "24px",
});

export function createRouteHandoffState(reducedMotion = false) {
  return {
    phase: "idle",
    roomId: null,
    reducedMotion,
    durationMs: reducedMotion ? reducedRouteHandoffDurationMs : routeHandoffDurationMs,
    liftPx: reducedMotion ? 0 : 6,
  };
}

export function reduceRouteHandoff(state, event) {
  if (event.type === "reduced-motion") {
    return {
      ...state,
      reducedMotion: event.value,
      durationMs: event.value ? reducedRouteHandoffDurationMs : routeHandoffDurationMs,
      liftPx: event.value ? 0 : 6,
    };
  }

  if (event.type === "begin") {
    return {
      ...state,
      phase: "pending",
      roomId: event.roomId,
    };
  }

  if (!state.roomId || event.roomId !== state.roomId) return state;

  if (event.type === "ready") {
    if (state.phase !== "pending") return state;
    return { ...state, phase: "ready" };
  }

  if (event.type === "blocked" || event.type === "complete") {
    return createRouteHandoffState(state.reducedMotion);
  }

  return state;
}
