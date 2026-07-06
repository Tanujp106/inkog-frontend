"use client";

import { GrainGradient, type GrainGradientProps } from "@paper-design/shaders-react";
import { CSSProperties, useEffect, useRef, useState } from "react";

import {
  ambientShaderColorTransitionMs,
  ambientShaderConfig,
  mixAmbientShaderColors,
  resolveAmbientShaderLayerOpacity,
  resolveAmbientShaderColors,
} from "@/lib/ambient-shader.mjs";

type ResolvedShaderColors = ReturnType<typeof resolveAmbientShaderColors>;
type ShaderLayerState = {
  base: ResolvedShaderColors;
  overlay: ResolvedShaderColors | null;
  overlayOpacity: number;
};

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
  const [shaderLayers, setShaderLayers] = useState<ShaderLayerState | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const shaderLayersRef = useRef<ShaderLayerState | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const setDisplayedLayers = (layers: ShaderLayerState) => {
      shaderLayersRef.current = layers;
      setShaderLayers(layers);
    };

    const animateColors = (nextColors: ResolvedShaderColors) => {
      const currentLayers = shaderLayersRef.current;
      if (!currentLayers) {
        setDisplayedLayers({ base: nextColors, overlay: null, overlayOpacity: 0 });
        return;
      }

      const currentTarget = currentLayers.overlay ?? currentLayers.base;
      if (JSON.stringify(currentTarget) === JSON.stringify(nextColors)) return;

      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }

      const startedAt = window.performance.now();
      const baseColors = currentLayers.overlay
        ? mixAmbientShaderColors(currentLayers.base, currentLayers.overlay, currentLayers.overlayOpacity)
        : currentLayers.base;

      const step = (timestamp: number) => {
        const progress = Math.min((timestamp - startedAt) / ambientShaderColorTransitionMs, 1);
        const overlayOpacity = resolveAmbientShaderLayerOpacity(progress);
        setDisplayedLayers({
          base: baseColors,
          overlay: nextColors,
          overlayOpacity,
        });

        if (progress < 1) {
          animationFrameRef.current = window.requestAnimationFrame(step);
          return;
        }

        setDisplayedLayers({ base: nextColors, overlay: null, overlayOpacity: 0 });
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

  if (!shaderLayers) return null;

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
      <ShaderLayer colors={shaderLayers.base} opacity={shaderLayers.overlay ? 1 - shaderLayers.overlayOpacity : 1} />
      {shaderLayers.overlay ? <ShaderLayer colors={shaderLayers.overlay} opacity={shaderLayers.overlayOpacity} /> : null}
    </div>
  );
}

function ShaderLayer({
  colors,
  opacity,
}: {
  colors: ResolvedShaderColors;
  opacity: number;
}) {
  return (
    <div
      style={{
        inset: 0,
        opacity,
        position: "absolute",
      }}
    >
      <GrainGradient
        colorBack={colors.colorBack}
        colors={colors.colors}
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
