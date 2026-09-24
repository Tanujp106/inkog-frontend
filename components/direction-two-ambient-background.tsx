"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import { AmbientShaderBackground } from "@/components/ambient-shader-background";
import {
  drawDirectionTwoAmbientPixels,
  resolveDirectionTwoAmbientDpr,
} from "@/lib/direction-two-ambient-canvas.mjs";
import {
  createDirectionTwoAmbientPixels,
  createDirectionTwoAmbientRandom,
  directionTwoAmbientAtmosphere,
  directionTwoAmbientConfig,
} from "@/lib/direction-two-intro.mjs";
import { parseCssRgbColor } from "@/lib/direction-two-mark-canvas.mjs";

export function DirectionTwoAmbientBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const pixelsRef = useRef<ReturnType<typeof createDirectionTwoAmbientPixels>>([]);
  const signalRgbRef = useRef({ r: 47, g: 125, b: 80 });
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isAmbientPaused, setIsAmbientPaused] = useState(false);
  const ambientPixels = useMemo(
    () => createDirectionTwoAmbientPixels(createDirectionTwoAmbientRandom(), directionTwoAmbientConfig),
    [],
  );
  pixelsRef.current = ambientPixels;

  const ambientAtmosphereStyle = {
    background: directionTwoAmbientAtmosphere.background,
    mixBlendMode: directionTwoAmbientAtmosphere.mixBlendMode,
    "--direction-two-ambient-signal": directionTwoAmbientAtmosphere.signalColor,
    "--direction-two-ambient-glow": directionTwoAmbientAtmosphere.signalGlow,
  } as CSSProperties;

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 639px)");
    const syncViewport = () => setIsMobileViewport(mobileQuery.matches);

    syncViewport();
    mobileQuery.addEventListener("change", syncViewport);
    return () => mobileQuery.removeEventListener("change", syncViewport);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const syncVisibility = () => {
      setIsAmbientPaused(document.visibilityState !== "visible");
    };

    syncVisibility();
    document.addEventListener("visibilitychange", syncVisibility);
    return () => document.removeEventListener("visibilitychange", syncVisibility);
  }, []);

  useEffect(() => {
    const resolveSignal = () => {
      const probe = document.createElement("span");
      probe.style.color = "var(--color-signal)";
      probe.style.position = "absolute";
      probe.style.visibility = "hidden";
      document.body.appendChild(probe);
      signalRgbRef.current = parseCssRgbColor(getComputedStyle(probe).color) ?? signalRgbRef.current;
      probe.remove();
    };

    resolveSignal();
    const observer = new MutationObserver(resolveSignal);
    observer.observe(document.documentElement, {
      attributeFilter: ["data-inkog-theme"],
      attributes: true,
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;

    const resize = () => {
      const nextWidth = Math.max(1, window.innerWidth);
      const nextHeight = Math.max(1, window.innerHeight);
      const dpr = resolveDirectionTwoAmbientDpr(window.devicePixelRatio);
      width = nextWidth;
      height = nextHeight;
      canvas.width = Math.round(nextWidth * dpr);
      canvas.height = Math.round(nextHeight * dpr);
      canvas.style.width = `${nextWidth}px`;
      canvas.style.height = `${nextHeight}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (timestamp: number) => {
      frameRef.current = null;
      drawDirectionTwoAmbientPixels(context, pixelsRef.current, {
        width,
        height,
        nowSeconds: reducedMotion || isAmbientPaused ? 0 : timestamp / 1000,
        signalRgb: signalRgbRef.current,
        paused: reducedMotion || isAmbientPaused,
      });

      if (!reducedMotion && !isAmbientPaused) {
        frameRef.current = window.requestAnimationFrame(draw);
      }
    };

    resize();
    draw(performance.now());

    const onResize = () => {
      resize();
      if (frameRef.current === null) draw(performance.now());
    };

    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    };
  }, [isAmbientPaused]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      data-ambient-paused={isAmbientPaused || undefined}
      data-direction-two-ambient-background=""
    >
      <div className="direction-two-ambient-glow absolute inset-0" style={ambientAtmosphereStyle} />
      <canvas
        className="direction-two-ambient-canvas absolute inset-0"
        data-direction-two-ambient-canvas=""
        ref={canvasRef}
        style={{ mixBlendMode: "screen" }}
      />
      <AmbientShaderBackground
        opacity={isMobileViewport ? 0.34 : 0.43}
        style={{ mixBlendMode: "screen", zIndex: 0 }}
      />
    </div>
  );
}
