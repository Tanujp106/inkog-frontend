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
  type CSSProperties,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";

import {
  createRouteHandoffState,
  getRouteComposerStyle,
  getRouteForegroundStyle,
  reduceRouteHandoff,
  routeHandoffEnterMs,
  routeHandoffExitMs,
} from "@/lib/route-handoff.mjs";

type RouteHandoffState = ReturnType<typeof createRouteHandoffState>;

type RouteHandoffContextValue = {
  beginRoomHandoff: (roomId: string) => Promise<void>;
  cancelRoomHandoff: () => void;
  composerStyle: CSSProperties;
  getRoomForegroundStyle: (roomId: string) => CSSProperties;
  landingForegroundStyle: CSSProperties;
  markRoomReady: (roomId: string) => void;
  state: RouteHandoffState;
};

const RouteHandoffContext = createContext<RouteHandoffContextValue | null>(null);

export function RouteHandoffProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reduceRouteHandoff, undefined, createRouteHandoffState);
  const [reducedMotion, setReducedMotion] = useState(false);
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    if (enterTimerRef.current) {
      clearTimeout(enterTimerRef.current);
      enterTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => setReducedMotion(query.matches);
    syncPreference();
    query.addEventListener("change", syncPreference);
    return () => query.removeEventListener("change", syncPreference);
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const beginRoomHandoff = useCallback(
    (roomId: string) => {
      clearTimers();
      flushSync(() => {
        dispatch({ type: "begin", roomId });
      });

      return new Promise<void>(resolve => {
        leaveTimerRef.current = setTimeout(() => {
          leaveTimerRef.current = null;
          dispatch({ type: "left", roomId });
          resolve();
        }, reducedMotion ? 1 : routeHandoffExitMs);
      });
    },
    [clearTimers, reducedMotion],
  );

  const markRoomReady = useCallback(
    (roomId: string) => {
      if (state.phase !== "pending" || state.roomId !== roomId) return;

      if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
      dispatch({ type: "ready", roomId });
      enterTimerRef.current = setTimeout(() => {
        enterTimerRef.current = null;
        dispatch({ type: "complete", roomId });
      }, reducedMotion ? 1 : routeHandoffEnterMs);
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
      getRoomForegroundStyle: (roomId: string) =>
        getRouteForegroundStyle({
          reducedMotion,
          roomId,
          state,
          surface: "room",
        }),
      landingForegroundStyle: getRouteForegroundStyle({
        reducedMotion,
        state,
        surface: "landing",
      }),
      markRoomReady,
      state,
    }),
    [beginRoomHandoff, cancelRoomHandoff, markRoomReady, reducedMotion, state],
  );

  return <RouteHandoffContext.Provider value={value}>{children}</RouteHandoffContext.Provider>;
}

export function useRouteHandoff() {
  const value = useContext(RouteHandoffContext);
  if (!value) throw new Error("useRouteHandoff must be used within RouteHandoffProvider");
  return value;
}
