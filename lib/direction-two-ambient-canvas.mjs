import { directionTwoAmbientAtmosphere } from "./direction-two-intro.mjs";

export const directionTwoAmbientCanvasMaxDpr = 1.5;

export function easeDirectionTwoAmbientInOut(progress) {
  const t = Math.min(1, Math.max(0, progress));
  return t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
}

export function getDirectionTwoAmbientLoopProgress(nowSeconds, delaySeconds, durationSeconds) {
  if (!(durationSeconds > 0)) return 0;
  const elapsed = nowSeconds - delaySeconds;
  const wrapped = ((elapsed % durationSeconds) + durationSeconds) % durationSeconds;
  return wrapped / durationSeconds;
}

export function sampleDirectionTwoAmbientDrift(progress, driftX, driftY) {
  const wave = progress <= 0.5
    ? easeDirectionTwoAmbientInOut(progress / 0.5)
    : easeDirectionTwoAmbientInOut((1 - progress) / 0.5);
  const fromX = driftX * -0.35;
  const fromY = driftY * -0.35;
  return {
    x: fromX + (driftX - fromX) * wave,
    y: fromY + (driftY - fromY) * wave,
  };
}

export function sampleDirectionTwoAmbientPresence(progress, opacity, peakOpacity) {
  const segments = [
    { at: 0, opacity: opacity * 0.34, scale: 0.58 },
    { at: 0.39, opacity: peakOpacity, scale: 1.08 },
    { at: 0.68, opacity: opacity * 0.64, scale: 0.82 },
    { at: 1, opacity: opacity * 0.34, scale: 0.58 },
  ];

  for (let index = 0; index < segments.length - 1; index += 1) {
    const start = segments[index];
    const end = segments[index + 1];
    if (progress >= start.at && progress <= end.at) {
      const local = (progress - start.at) / Math.max(0.0001, end.at - start.at);
      const eased = easeDirectionTwoAmbientInOut(local);
      return {
        opacity: start.opacity + (end.opacity - start.opacity) * eased,
        scale: start.scale + (end.scale - start.scale) * eased,
      };
    }
  }

  return segments[segments.length - 1];
}

export function resolveDirectionTwoAmbientDpr(devicePixelRatio = 1) {
  return Math.min(Math.max(1, devicePixelRatio || 1), directionTwoAmbientCanvasMaxDpr);
}

export function drawDirectionTwoAmbientPixels(
  context,
  pixels,
  {
    width,
    height,
    nowSeconds,
    signalRgb,
    paused = false,
  },
) {
  context.clearRect(0, 0, width, height);
  if (paused) {
    nowSeconds = 0;
  }

  for (const pixel of pixels) {
    const driftProgress = getDirectionTwoAmbientLoopProgress(
      nowSeconds,
      pixel.driftDelay,
      pixel.driftDuration,
    );
    const presenceProgress = getDirectionTwoAmbientLoopProgress(
      nowSeconds,
      pixel.fieldDelay,
      pixel.fieldDuration,
    );
    const drift = sampleDirectionTwoAmbientDrift(driftProgress, pixel.driftX, pixel.driftY);
    const presence = sampleDirectionTwoAmbientPresence(
      presenceProgress,
      pixel.opacity,
      Math.min(pixel.opacity * 1.38, 1),
    );

    const centerX = (pixel.left / 100) * width + drift.x;
    const centerY = (pixel.top / 100) * height + drift.y;
    const size = pixel.size * presence.scale;
    const half = size / 2;

    context.globalAlpha = Math.max(0, presence.opacity * 0.5);
    context.fillStyle = `rgb(${signalRgb.r}, ${signalRgb.g}, ${signalRgb.b})`;
    context.fillRect(centerX - half, centerY - half, size, size);
  }

  context.globalAlpha = 1;
}

export function getDirectionTwoAmbientGlowStrength() {
  return directionTwoAmbientAtmosphere.glowStrength;
}
