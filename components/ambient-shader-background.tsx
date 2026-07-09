"use client";

import { GrainGradient, type GrainGradientProps } from "@paper-design/shaders-react";
import { CSSProperties, useEffect, useRef, useState } from "react";

import {
  ambientShaderColorTransitionMs,
  ambientShaderConfig,
  mixAmbientShaderColors,
  resolveAmbientShaderColors,
} from "@/lib/ambient-shader.mjs";

type ResolvedShaderColors = ReturnType<typeof resolveAmbientShaderColors>;

type AmbientShaderBackgroundProps = {
  className?: string;
  opacity?: number;
  style?: CSSProperties;
};

export function AmbientShaderBackground({
  className,
  opacity = 0.43,
  style,
}: AmbientShaderBackgroundProps) {
  const [resolvedColors, setResolvedColors] = useState<ResolvedShaderColors | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const resolvedColorsRef = useRef<ResolvedShaderColors | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const setDisplayedColors = (colors: ResolvedShaderColors) => {
      resolvedColorsRef.current = colors;
      setResolvedColors(colors);
    };

    const animateColors = (nextColors: ResolvedShaderColors) => {
      const currentColors = resolvedColorsRef.current;
      if (!currentColors) {
        setDisplayedColors(nextColors);
        return;
      }

      if (JSON.stringify(currentColors) === JSON.stringify(nextColors)) return;

      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }

      const startedAt = window.performance.now();

      const step = (timestamp: number) => {
        const progress = Math.min((timestamp - startedAt) / ambientShaderColorTransitionMs, 1);
        setDisplayedColors(mixAmbientShaderColors(currentColors, nextColors, progress));

        if (progress < 1) {
          animationFrameRef.current = window.requestAnimationFrame(step);
          return;
        }

        setDisplayedColors(nextColors);
        animationFrameRef.current = null;
      };

      animationFrameRef.current = window.requestAnimationFrame(step);
    };

    const syncColors = () => {
      animateColors(resolveAmbientShaderColors(window.getComputedStyle(document.documentElement), ambientShaderConfig));
    };

    syncColors();

    const observer = new MutationObserver(syncColors);
    observer.observe(document.documentElement, {
      attributeFilter: ["data-inkog-theme"],
      attributes: true,
    });

    return () => {
      observer.disconnect();
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  if (!resolvedColors) return null;

  return (
    <div
      aria-hidden="true"
      className={className}
      style={{
        inset: 0,
        opacity,
        overflow: "hidden",
        pointerEvents: "none",
        position: "absolute",
        ...style,
      }}
    >
      <GrainGradient
        colorBack={resolvedColors.colorBack}
        colors={resolvedColors.colors}
        fit="cover"
        height="100%"
        intensity={ambientShaderConfig.intensity}
        maxPixelCount={ambientShaderConfig.maxPixelCount}
        minPixelRatio={ambientShaderConfig.minPixelRatio}
        noise={ambientShaderConfig.noise}
        offsetX={ambientShaderConfig.offsetX}
        offsetY={ambientShaderConfig.offsetY}
        rotation={ambientShaderConfig.rotation}
        scale={ambientShaderConfig.scale}
        shape={ambientShaderConfig.shape as GrainGradientProps["shape"]}
        softness={ambientShaderConfig.softness}
        speed={ambientShaderConfig.speed}
        width="100%"
      />
    </div>
  );
}
