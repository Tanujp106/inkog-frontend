export type RouteHandoffPhase = "idle" | "pending" | "ready";

export type RouteHandoffState = {
  phase: RouteHandoffPhase;
  roomId: string | null;
  reducedMotion: boolean;
  durationMs: number;
  liftPx: number;
};

export type RouteHandoffEvent =
  | { type: "begin"; roomId: string }
  | { type: "ready"; roomId: string }
  | { type: "blocked"; roomId: string }
  | { type: "complete"; roomId: string }
  | { type: "reduced-motion"; value: boolean };

export const routeHandoffDurationMs: number;
export const reducedRouteHandoffDurationMs: number;
export const routeComposerGeometry: Readonly<{
  maxWidth: string;
  horizontalPadding: string;
  bottomPadding: string;
  framePadding: string;
  fontSize: string;
  lineHeight: string;
}>;

export function createRouteHandoffState(reducedMotion?: boolean): RouteHandoffState;
export function reduceRouteHandoff(state: RouteHandoffState, event: RouteHandoffEvent): RouteHandoffState;
