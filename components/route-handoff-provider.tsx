"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ContextType,
  type CSSProperties,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";
import { usePathname } from "next/navigation";
import { LayoutRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";

import { DirectionTwoAmbientBackground } from "@/components/direction-two-ambient-background";
import {
  createRouteHandoffState,
  getLandingHandoffStyle,
  getRouteComposerStyle,
  getRoomHandoffStyle,
  reduceRouteHandoff,
  routeHandoffTransitionMs,
} from "@/lib/route-handoff.mjs";

type RouteHandoffState = ReturnType<typeof createRouteHandoffState>;
type LandingHandoffPart = "usp" | "body" | "title" | "terminal" | "composer";
type RoomHandoffPart = "header" | "transcript" | "composer";
type RouteLayer = {
  children: ReactNode;
  pathname: string;
  routerContext: ContextType<typeof LayoutRouterContext>;
};

type RouteHandoffContextValue = {
  beginRoomHandoff: (roomId: string) => void;
  cancelRoomHandoff: () => void;
  composerStyle: CSSProperties;
  getLandingPartStyle: (part: LandingHandoffPart, order?: number) => CSSProperties;
  getRoomPartStyle: (roomId: string, part: RoomHandoffPart) => CSSProperties;
  markRoomReady: (roomId: string) => void;
  state: RouteHandoffState;
};

const RouteHandoffContext = createContext<RouteHandoffContextValue | null>(null);

export function RouteHandoffProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const routerContext = useContext(LayoutRouterContext);
  const [state, dispatch] = useReducer(reduceRouteHandoff, undefined, createRouteHandoffState);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [routeLayers, setRouteLayers] = useState<RouteLayer[]>(() => [{ children, pathname, routerContext }]);
  const [returnPhase, setReturnPhase] = useState<"idle" | "preparing" | "entering">("idle");
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const returnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const returnFrameRef = useRef<number | null>(null);
  const previousPathnameRef = useRef(pathname);
  const latestChildrenRef = useRef(children);
  const latestRouterContextRef = useRef(routerContext);
  latestChildrenRef.current = children;
  latestRouterContextRef.current = routerContext;

  const clearReturnTimers = useCallback(() => {
    if (returnTimerRef.current) {
      clearTimeout(returnTimerRef.current);
      returnTimerRef.current = null;
    }
    if (returnFrameRef.current !== null) {
      cancelAnimationFrame(returnFrameRef.current);
      returnFrameRef.current = null;
    }
  }, []);

  const clearTimers = useCallback(() => {
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
    clearReturnTimers();
  }, [clearReturnTimers]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => setReducedMotion(query.matches);
    syncPreference();
    query.addEventListener("change", syncPreference);
    return () => query.removeEventListener("change", syncPreference);
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  useEffect(() => {
    const previousPathname = previousPathnameRef.current;
    if (previousPathname === pathname) return;
    previousPathnameRef.current = pathname;
    clearReturnTimers();
    const returningToLanding = !reducedMotion && state.phase === "idle" &&
      previousPathname.startsWith("/room/") && pathname === "/";
    setRouteLayers(current => {
      const destination = current[current.length - 1];
      const nextLayer = {
        children: latestChildrenRef.current,
        pathname,
        routerContext: latestRouterContextRef.current,
      };
      if (state.phase === "pending" && destination) return [destination, nextLayer];
      if (returningToLanding && destination) return [destination, nextLayer];
      return [nextLayer];
    });
    if (!returningToLanding) {
      setReturnPhase("idle");
      return;
    }
    setReturnPhase("preparing");
    returnFrameRef.current = requestAnimationFrame(() => {
      returnFrameRef.current = null;
      setReturnPhase("entering");
      returnTimerRef.current = setTimeout(() => {
        returnTimerRef.current = null;
        setRouteLayers(current => current.length > 1 ? [current[current.length - 1]] : current);
        setReturnPhase("idle");
      }, 240);
    });
  }, [clearReturnTimers, pathname, reducedMotion, state.phase]);

  useEffect(() => {
    if (state.phase !== "settled") return;
    setRouteLayers(current => current.length > 1 ? [current[current.length - 1]] : current);
  }, [state.phase]);

  useEffect(() => {
    if (state.phase !== "settled" || routeLayers.length > 1 || !state.roomId) return;
    dispatch({ type: "cleanup", roomId: state.roomId });
  }, [routeLayers.length, state.phase, state.roomId]);

  const beginRoomHandoff = useCallback((roomId: string) => {
    clearTimers();
    flushSync(() => {
      dispatch({ type: "begin", roomId });
    });
  }, [clearTimers]);

  const markRoomReady = useCallback(
    (roomId: string) => {
      if (state.phase !== "pending" || state.roomId !== roomId) return;

      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
      dispatch({ type: "ready", roomId });
      transitionTimerRef.current = setTimeout(() => {
        transitionTimerRef.current = null;
        dispatch({ type: "complete", roomId });
      }, reducedMotion ? 1 : routeHandoffTransitionMs);
    },
    [reducedMotion, state.phase, state.roomId],
  );

  const cancelRoomHandoff = useCallback(() => {
    clearTimers();
    dispatch({ type: "cancel" });
  }, [clearTimers]);

  const value = useMemo<RouteHandoffContextValue>(
    () => ({
      beginRoomHandoff,
      cancelRoomHandoff,
      composerStyle: getRouteComposerStyle() as CSSProperties,
      getLandingPartStyle: (part: LandingHandoffPart, order = 0) =>
        getLandingHandoffStyle({
          order,
          part,
          reducedMotion,
          state,
        }) as CSSProperties,
      getRoomPartStyle: (roomId: string, part: RoomHandoffPart) =>
        getRoomHandoffStyle({
          part,
          reducedMotion,
          roomId,
          state,
        }) as CSSProperties,
      markRoomReady,
      state,
    }),
    [beginRoomHandoff, cancelRoomHandoff, markRoomReady, reducedMotion, state],
  );

  return (
    <RouteHandoffContext.Provider value={value}>
      <DirectionTwoAmbientBackground />
      <div className="relative z-10">
        {routeLayers.map((layer, index) => {
          const hasRetainedRoute = routeLayers.length > 1;
          const isDestination = index === routeLayers.length - 1;
          const isRetained = hasRetainedRoute && !isDestination;
          const isReturning = hasRetainedRoute && returnPhase !== "idle";
          const isPendingDestination = isDestination && (state.phase === "pending" || returnPhase === "preparing");
          const isHiddenRetained =
            isRetained && (isReturning || state.phase === "transitioning" || state.phase === "settled");

          return (
            <div
              aria-hidden={(isPendingDestination || isHiddenRetained) || undefined}
              inert={(isPendingDestination || isHiddenRetained) || undefined}
              key={layer.pathname}
              style={{
                inset: hasRetainedRoute ? 0 : undefined,
                pointerEvents: isPendingDestination || isHiddenRetained ? "none" : undefined,
                position: hasRetainedRoute ? "fixed" : "relative",
                zIndex: isRetained ? 2 : 1,
                ...(isReturning ? {
                  opacity: returnPhase === "entering" ? (isRetained ? 0 : 1) : (isRetained ? 1 : 0),
                  transform: returnPhase === "entering"
                    ? (isRetained ? "translateY(-6px)" : "translateY(0)")
                    : (isRetained ? "translateY(0)" : "translateY(6px)"),
                  transition: "opacity 180ms cubic-bezier(0.22, 1, 0.36, 1), transform 220ms cubic-bezier(0.22, 1, 0.36, 1)",
                } : {}),
              }}
            >
              <LayoutRouterContext.Provider value={layer.routerContext}>
                {layer.children}
              </LayoutRouterContext.Provider>
            </div>
          );
        })}
      </div>
    </RouteHandoffContext.Provider>
  );
}

export function useRouteHandoff() {
  const value = useContext(RouteHandoffContext);
  if (!value) throw new Error("useRouteHandoff must be used within RouteHandoffProvider");
  return value;
}
