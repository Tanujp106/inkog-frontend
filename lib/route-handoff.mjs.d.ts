import type { CSSProperties } from "react";

export type RouteHandoffPhase = "idle" | "leaving" | "pending" | "entering";

export type RouteHandoffState = {
  phase: RouteHandoffPhase;
  roomId: string | null;
};

export type RouteHandoffEvent =
  | { type: "begin"; roomId: string }
  | { type: "left"; roomId: string }
  | { type: "ready"; roomId: string }
  | { type: "complete"; roomId: string }
  | { type: "cancel" };

export const routeHandoffExitMs: number;
export const routeHandoffEnterMs: number;
export function createRouteHandoffState(): RouteHandoffState;
export function reduceRouteHandoff(state: RouteHandoffState, event: RouteHandoffEvent): RouteHandoffState;
export function getRouteForegroundStyle(options: {
  reducedMotion?: boolean;
  roomId?: string;
  state: RouteHandoffState;
  surface: "landing" | "room";
}): CSSProperties;
export function getRouteComposerStyle(): CSSProperties;
