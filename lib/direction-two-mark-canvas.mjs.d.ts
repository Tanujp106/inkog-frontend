export declare const directionTwoMarkDensity: number;
export declare const directionTwoMarkMagnetGridCellSize: number;
export declare const directionTwoMarkIdleScale: number;
export declare const directionTwoMarkIdleOpacity: number;
export declare const directionTwoMarkMaxDpr: number;

export type DirectionTwoMarkRgb = { r: number; g: number; b: number };

export type DirectionTwoMarkPixel = {
  active: boolean;
  x: number;
  y: number;
  formationDelay: number;
  shimmerDelay: number;
  offsetX: number;
  offsetY: number;
  highlighted: boolean;
};

export type DirectionTwoMarkLayout = {
  width: number;
  height: number;
  cellSize: number;
  gap: number;
  letterGap: number;
  pixels: DirectionTwoMarkPixel[];
};

export type DirectionTwoMarkMagnetRecord = {
  pixel: DirectionTwoMarkPixel;
  x: number;
  y: number;
  offsetX: number;
  offsetY: number;
};

export declare function createDensePixelPattern(pattern: string[], density?: number): string[];
export declare function getDirectionTwoMarkMagnetGridKey(cellX: number, cellY: number): string;
export declare function easeDirectionTwoMarkProgress(progress: number): number;
export declare function getDirectionTwoMarkFormationOpacity(elapsedMs: number, durationMs: number): number;
export declare function getDirectionTwoMarkShimmerMix(elapsedMs: number, durationMs: number): number;
export declare function mixDirectionTwoMarkHighlightColor(
  foregroundRgb: DirectionTwoMarkRgb,
  signalRgb: DirectionTwoMarkRgb,
  colorMixPercent: number,
  brightness: number,
): DirectionTwoMarkRgb;
export declare function parseCssRgbColor(value: string): DirectionTwoMarkRgb | null;
export declare function buildDirectionTwoMarkLayout(
  word: string,
  options: {
    cellSize: number;
    gap: number;
    letterGap: number;
    density?: number;
    motionSettings: {
      formationSpreadMs: number;
      shimmerSpreadMs: number;
      shimmerAmplitudeMs: number;
      shimmerFrequency: number;
    };
  },
): DirectionTwoMarkLayout;
export declare function attachDirectionTwoMarkPixelCenters(
  layout: DirectionTwoMarkLayout,
  originX: number,
  originY: number,
): { records: DirectionTwoMarkMagnetRecord[]; grid: Map<string, DirectionTwoMarkMagnetRecord[]> };
export declare function getDirectionTwoMarkMagnetCandidates(
  grid: Map<string, DirectionTwoMarkMagnetRecord[]>,
  pointerX: number,
  pointerY: number,
  radius: number,
): DirectionTwoMarkMagnetRecord[];
export declare function applyDirectionTwoMarkMagnetism(
  records: DirectionTwoMarkMagnetRecord[],
  grid: Map<string, DirectionTwoMarkMagnetRecord[]>,
  pointer: { x: number; y: number },
  settings: {
    magnetRadius: number;
    magnetStrength: number;
    magnetMaxDisplacement: number;
  },
): boolean;
export declare function resetDirectionTwoMarkMagnetism(layout: DirectionTwoMarkLayout): boolean;
export declare function drawDirectionTwoMark(
  context: CanvasRenderingContext2D,
  layout: DirectionTwoMarkLayout,
  options: {
    phase: "forming" | "shimmering" | "interactive";
    now: number;
    formationStartedAt: number;
    shimmerStartedAt: number;
    colors: {
      foreground: DirectionTwoMarkRgb;
      border: DirectionTwoMarkRgb;
      signal: DirectionTwoMarkRgb;
    };
    motionSettings: {
      formationDurationMs: number;
      shimmerDurationMs: number;
      shimmerColorMixPercent: number;
      shimmerPeakOpacity: number;
      hoverHighlightColorMixPercent: number;
      hoverHighlightBrightness: number;
      hoverHighlightGlowRadius: number;
      hoverHighlightGlowOpacity: number;
      magnetMaxDisplacement: number;
    };
    magnetActive?: boolean;
    pointer?: { localX: number; localY: number } | null;
  },
): void;
export declare function resolveDirectionTwoMarkDpr(devicePixelRatio?: number): number;
