export declare const directionTwoAmbientCanvasMaxDpr: number;

export declare function easeDirectionTwoAmbientInOut(progress: number): number;
export declare function getDirectionTwoAmbientLoopProgress(
  nowSeconds: number,
  delaySeconds: number,
  durationSeconds: number,
): number;
export declare function sampleDirectionTwoAmbientDrift(
  progress: number,
  driftX: number,
  driftY: number,
): { x: number; y: number };
export declare function sampleDirectionTwoAmbientPresence(
  progress: number,
  opacity: number,
  peakOpacity: number,
): { opacity: number; scale: number };
export declare function resolveDirectionTwoAmbientDpr(devicePixelRatio?: number): number;
export declare function drawDirectionTwoAmbientPixels(
  context: CanvasRenderingContext2D,
  pixels: Array<{
    left: number;
    top: number;
    size: number;
    opacity: number;
    driftX: number;
    driftY: number;
    driftDelay: number;
    driftDuration: number;
    fieldDelay: number;
    fieldDuration: number;
  }>,
  options: {
    width: number;
    height: number;
    nowSeconds: number;
    signalRgb: { r: number; g: number; b: number };
    paused?: boolean;
  },
): void;
export declare function getDirectionTwoAmbientGlowStrength(): number;
