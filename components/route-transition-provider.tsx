"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  type CSSProperties,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";

import { AmbientShaderBackground } from "@/components/ambient-shader-background";
import {
  createRouteHandoffState,
  reduceRouteHandoff,
  routeComposerGeometry,
} from "@/lib/route-transition.mjs";
import { roomAmbientShaderOpacity } from "@/lib/room-background.mjs";

type ComposerSnapshot = {
  height: number;
  html: string;
  left: number;
  top: number;
  width: number;
};

type RouteTransitionContextValue = {
  activeRoomId: string | null;
  beginRoomHandoff: (roomId: string, composerElement: HTMLElement | null) => void;
  cancelRoomHandoff: (roomId: string) => void;
  handoffPending: boolean;
  reportRoomReady: (roomId: string, inputElement: HTMLInputElement | null) => void;
};

const RouteTransitionContext = createContext<RouteTransitionContextValue | null>(null);

export function useRouteTransition() {
  const value = useContext(RouteTransitionContext);
  if (!value) throw new Error("useRouteTransition must be used within RouteTransitionProvider");
  return value;
}

export function RouteTransitionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [handoff, dispatch] = useReducer(reduceRouteHandoff, false, createRouteHandoffState);
  const [composerSnapshot, setComposerSnapshot] = useState<ComposerSnapshot | null>(null);
  const [composerBottomOffset, setComposerBottomOffset] = useState<number | null>(null);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const outgoingChildrenRef = useRef<ReactNode | null>(null);
  const currentChildrenRef = useRef(children);
  const roomInputRef = useRef<HTMLInputElement | null>(null);
  currentChildrenRef.current = children;

  const clearVisualHandoff = useCallback(() => {
    outgoingChildrenRef.current = null;
    roomInputRef.current = null;
    setComposerSnapshot(null);
    setComposerBottomOffset(null);
  }, []);

  const beginRoomHandoff = useCallback((roomId: string, composerElement: HTMLElement | null) => {
    outgoingChildrenRef.current = currentChildrenRef.current;
    roomInputRef.current = null;

    if (composerElement) {
      const rect = composerElement.getBoundingClientRect();
      setComposerBottomOffset(window.innerHeight - rect.bottom);
      setComposerSnapshot({
        height: rect.height,
        html: composerElement.outerHTML,
        left: rect.left,
        top: rect.top,
        width: rect.width,
      });
    } else {
      setComposerSnapshot(null);
      setComposerBottomOffset(null);
    }

    dispatch({ type: "begin", roomId });
  }, []);

  const cancelRoomHandoff = useCallback((roomId: string) => {
    dispatch({ type: "blocked", roomId });
    clearVisualHandoff();
  }, [clearVisualHandoff]);

  const reportRoomReady = useCallback((roomId: string, inputElement: HTMLInputElement | null) => {
    roomInputRef.current = inputElement;
    dispatch({ type: "ready", roomId });
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => dispatch({ type: "reduced-motion", value: mediaQuery.matches });
    syncPreference();
    mediaQuery.addEventListener("change", syncPreference);
    return () => mediaQuery.removeEventListener("change", syncPreference);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 639px)");
    const syncViewport = () => setIsMobileViewport(mediaQuery.matches);

    syncViewport();
    mediaQuery.addEventListener("change", syncViewport);
    return () => mediaQuery.removeEventListener("change", syncViewport);
  }, []);

  useEffect(() => {
    if (handoff.phase !== "ready" || !handoff.roomId) return;

    const roomId = handoff.roomId;
    const timeout = window.setTimeout(() => {
      dispatch({ type: "complete", roomId });
      outgoingChildrenRef.current = null;
      setComposerSnapshot(null);
      window.requestAnimationFrame(() => {
        roomInputRef.current?.focus();
        const input = roomInputRef.current;
        if (input) input.setSelectionRange(input.value.length, input.value.length);
        roomInputRef.current = null;
      });
    }, handoff.durationMs);

    return () => window.clearTimeout(timeout);
  }, [handoff.durationMs, handoff.phase, handoff.roomId]);

  useEffect(() => {
    if (handoff.phase === "idle" || !handoff.roomId || !pathname.startsWith("/room/")) return;
    if (pathname !== `/room/${handoff.roomId}`) cancelRoomHandoff(handoff.roomId);
  }, [cancelRoomHandoff, handoff.phase, handoff.roomId, pathname]);

  const contextValue = useMemo<RouteTransitionContextValue>(() => ({
    activeRoomId: handoff.roomId,
    beginRoomHandoff,
    cancelRoomHandoff,
    handoffPending: handoff.phase !== "idle",
    reportRoomReady,
  }), [beginRoomHandoff, cancelRoomHandoff, handoff.phase, handoff.roomId, reportRoomReady]);

  const isPersistentShaderRoute = pathname === "/" || pathname.startsWith("/room/");
  const destinationMounted = Boolean(
    handoff.roomId
    && pathname === `/room/${handoff.roomId}`
    && outgoingChildrenRef.current,
  );
  const visibleHandoff = destinationMounted && handoff.phase === "ready";
  const shaderOpacity = pathname.startsWith("/room/") ? roomAmbientShaderOpacity : isMobileViewport ? 0.34 : 0.43;
  const rootStyle = {
    ...(composerBottomOffset === null ? {} : {
      "--route-composer-bottom-padding": `${composerBottomOffset}px`,
    }),
    "--route-composer-font-size": routeComposerGeometry.fontSize,
    "--route-composer-frame-padding": routeComposerGeometry.framePadding,
    "--route-composer-horizontal-padding": routeComposerGeometry.horizontalPadding,
    "--route-composer-line-height": routeComposerGeometry.lineHeight,
    "--route-composer-max-width": routeComposerGeometry.maxWidth,
  } as CSSProperties;

  return (
    <RouteTransitionContext.Provider value={contextValue}>
      {isPersistentShaderRoute ? (
        <div className="route-transition-root" style={rootStyle}>
          <AmbientShaderBackground
            className="route-transition-shader"
            opacity={shaderOpacity}
            style={{ mixBlendMode: "screen", position: "fixed", zIndex: 0 }}
          />
          {destinationMounted ? (
            <div
              aria-hidden={visibleHandoff ? "true" : undefined}
              className="route-transition-layer route-transition-outgoing"
              data-route-transition-outgoing
              inert={true}
              style={{
                opacity: visibleHandoff ? 0 : 1,
                transform: visibleHandoff ? `translateY(-${handoff.liftPx}px)` : "translateY(0)",
                transitionDuration: `${handoff.durationMs}ms`,
              }}
            >
              {outgoingChildrenRef.current}
            </div>
          ) : null}
          <div
            aria-hidden={destinationMounted && !visibleHandoff ? "true" : undefined}
            className={`route-transition-layer route-transition-incoming${destinationMounted ? " route-transition-destination" : ""}`}
            inert={destinationMounted && !visibleHandoff}
            style={{
              opacity: destinationMounted && !visibleHandoff ? 0 : 1,
              pointerEvents: destinationMounted && !visibleHandoff ? "none" : "auto",
              transitionDuration: `${handoff.durationMs}ms`,
            }}
          >
            {children}
          </div>
          {destinationMounted && composerSnapshot ? (
            <div
              aria-hidden="true"
              className="route-transition-composer-snapshot"
              dangerouslySetInnerHTML={{ __html: composerSnapshot.html }}
              inert={true}
              style={{
                height: composerSnapshot.height,
                left: composerSnapshot.left,
                top: composerSnapshot.top,
                width: composerSnapshot.width,
              }}
            />
          ) : null}
        </div>
      ) : children}
    </RouteTransitionContext.Provider>
  );
}
