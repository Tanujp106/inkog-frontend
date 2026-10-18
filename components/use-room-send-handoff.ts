"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from "react";

type Origin = { left: number; top: number; viewportWidth: number; viewportHeight: number };
type PendingHandoff = { actionId: string; origin: Origin | null };
type ActiveHandoff = { animation: Animation; ghost: HTMLElement; target: HTMLElement };

const HANDOFF_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

function durationFromTokens() {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue("--motion-handoff-duration");
  return Number.parseFloat(value) || 210;
}

/** Animate only the visual copy; the real optimistic row remains the sole accessible message. */
export function useRoomSendHandoff(
  transcriptRevision: readonly unknown[],
  viewportRef: RefObject<HTMLElement | null>,
  followTranscriptRef: RefObject<boolean>,
) {
  const pendingRef = useRef<PendingHandoff[]>([]);
  const activeRef = useRef(new Map<string, ActiveHandoff>());
  const suppressSmoothScrollRef = useRef(false);

  const queueHandoff = useCallback((actionId: string, source: HTMLElement | null) => {
    const bounds = source?.getBoundingClientRect();
    pendingRef.current.push({
      actionId,
      origin: bounds ? {
        left: bounds.left + 4,
        top: bounds.top + 2,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      } : null,
    });
    suppressSmoothScrollRef.current = true;
  }, []);

  useLayoutEffect(() => {
    for (const [actionId, handoff] of activeRef.current) {
      if (!handoff.target.isConnected) {
        handoff.animation.cancel();
        activeRef.current.delete(actionId);
      }
    }

    const viewport = viewportRef.current;
    if (!viewport || pendingRef.current.length === 0) return;

    if (followTranscriptRef.current) viewport.scrollTop = viewport.scrollHeight;
    const pending = pendingRef.current.splice(0);
    const viewportBounds = viewport.getBoundingClientRect();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = durationFromTokens();

    for (const { actionId, origin } of pending) {
      const target = Array.from(viewport.querySelectorAll<HTMLElement>("[data-room-send-action-id]"))
        .find(node => node.dataset.roomSendActionId === actionId);
      if (!target) continue;

      const destination = target.getBoundingClientRect();
      const visible = destination.bottom > viewportBounds.top && destination.top < viewportBounds.bottom;
      if (!visible || reducedMotion || typeof target.animate !== "function") continue;

      const lineHeight = Number.parseFloat(getComputedStyle(target).lineHeight) || 24;
      const wrapped = destination.height > lineHeight * 2.5;
      const viewportMoved = origin && (
        Math.abs(origin.viewportWidth - window.innerWidth) > 16 ||
        Math.abs(origin.viewportHeight - window.innerHeight) > 16
      );
      if (!origin || wrapped || viewportMoved) {
        target.animate(
          [{ opacity: 0.75, transform: "translateY(8px)" }, { opacity: 1, transform: "translateY(0)" }],
          { duration, easing: HANDOFF_EASING },
        );
        continue;
      }

      const ghost = document.createElement("span");
      const computed = getComputedStyle(target);
      ghost.textContent = target.textContent;
      ghost.setAttribute("aria-hidden", "true");
      Object.assign(ghost.style, {
        color: computed.color,
        display: "block",
        fontFamily: computed.fontFamily,
        fontSize: computed.fontSize,
        fontStyle: computed.fontStyle,
        fontWeight: computed.fontWeight,
        letterSpacing: computed.letterSpacing,
        lineHeight: computed.lineHeight,
        overflowWrap: computed.overflowWrap,
        pointerEvents: "none",
        position: "fixed",
        left: `${destination.left}px`,
        top: `${destination.top}px`,
        width: `${destination.width}px`,
        whiteSpace: computed.whiteSpace,
        zIndex: "999",
      });
      document.body.appendChild(ghost);

      const animation = ghost.animate(
        [
          { opacity: 0.85, transform: `translate3d(${origin.left - destination.left}px, ${origin.top - destination.top}px, 0)` },
          { opacity: 1, transform: "translate3d(0, 0, 0)" },
        ],
        { duration, easing: HANDOFF_EASING, fill: "both" },
      );
      target.style.opacity = "0";
      const cleanup = () => {
        ghost.remove();
        target.style.removeProperty("opacity");
        activeRef.current.delete(actionId);
      };
      activeRef.current.set(actionId, { animation, ghost, target });
      animation.onfinish = cleanup;
      animation.oncancel = cleanup;
    }
  }, [transcriptRevision, viewportRef, followTranscriptRef]);

  useEffect(() => () => {
    for (const handoff of activeRef.current.values()) handoff.animation.cancel();
    activeRef.current.clear();
    pendingRef.current = [];
  }, []);

  return { queueHandoff, suppressSmoothScrollRef };
}
