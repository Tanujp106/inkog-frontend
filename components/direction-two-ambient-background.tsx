"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";

import { AmbientShaderBackground } from "@/components/ambient-shader-background";
import {
  createDirectionTwoAmbientPixels,
  createDirectionTwoAmbientRandom,
  directionTwoAmbientAtmosphere,
  directionTwoAmbientConfig,
} from "@/lib/direction-two-intro.mjs";

export function DirectionTwoAmbientBackground() {
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const ambientPixels = useMemo(
    () => createDirectionTwoAmbientPixels(createDirectionTwoAmbientRandom(), directionTwoAmbientConfig),
    [],
  );
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

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      data-direction-two-ambient-background=""
    >
      <div className="direction-two-ambient-glow absolute inset-0" style={ambientAtmosphereStyle} />
      {ambientPixels.map(pixel => (
        <span
          key={pixel.id}
          className="direction-two-ambient-pixel absolute"
          style={
            {
              left: `${pixel.left}%`,
              top: `${pixel.top}%`,
              width: `${pixel.size}px`,
              height: `${pixel.size}px`,
              "--pixel-opacity": String(pixel.opacity),
              "--pixel-opacity-peak": String(Math.min(pixel.opacity * 1.38, 1)),
              "--pixel-drift-x": `${pixel.driftX}px`,
              "--pixel-drift-y": `${pixel.driftY}px`,
              "--pixel-field-delay": `${pixel.fieldDelay}s`,
              "--pixel-field-duration": `${pixel.fieldDuration}s`,
              "--pixel-glow-delay": `${pixel.glowDelay}s`,
              "--pixel-glow-duration": `${pixel.glowDuration}s`,
              "--pixel-drift-delay": `${pixel.driftDelay}s`,
              "--pixel-drift-duration": `${pixel.driftDuration}s`,
              "--pixel-glow-strength": `${directionTwoAmbientAtmosphere.glowStrength}px`,
              "--pixel-glow-soft": `${directionTwoAmbientAtmosphere.glowStrength * 0.45}px`,
              "--direction-two-ambient-signal": directionTwoAmbientAtmosphere.signalColor,
              "--direction-two-ambient-glow": directionTwoAmbientAtmosphere.signalGlow,
            } as CSSProperties
          }
        >
          <span className="direction-two-ambient-pixel-core block h-full w-full rounded-[1px]" />
        </span>
      ))}
      <AmbientShaderBackground
        opacity={isMobileViewport ? 0.34 : 0.43}
        style={{ mixBlendMode: "screen", zIndex: 0 }}
      />
    </div>
  );
}
