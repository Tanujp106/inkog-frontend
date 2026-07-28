export type DirectionTwoAmbientPixel = {
  id: string;
  left: number;
  top: number;
  size: 2 | 3 | 4;
  delay: number;
  duration: number;
  opacity: number;
  driftX: number;
  driftY: number;
  waveDelay: number;
  sweepDuration: number;
  shimmerDelay: number;
  shimmerPhase: number;
};

export declare const directionTwoBrandLabels: string[];
export declare const directionTwoMarkWords: string[];
export declare const directionTwoMarkSlotCount: number;
export declare const directionTwoMarkIcons: Array<{
  id: string;
  label: string;
  pattern: string[];
}>;
export declare const directionTwoAmbientConfig: {
  count: number;
  gridStep: number;
  minSize: number;
  maxSize: number;
  minDelay: number;
  maxDelay: number;
  minDuration: number;
  maxDuration: number;
  minOpacity: number;
  maxOpacity: number;
  diagonalBoost: number;
  driftXMin: number;
  driftXMax: number;
  driftYMin: number;
  driftYMax: number;
  sweepDuration: number;
  shimmerSettleDelay: number;
};
export declare function getDirectionTwoScrambleFrame(target: string, progress: number): string;
export declare function buildDirectionTwoPixelWord(word: string): string[][];
export declare function buildDirectionTwoMarkPattern(word: string): string[][];
export declare function createDirectionTwoAmbientRandom(seed?: number): () => number;
export declare function createDirectionTwoAmbientPixels(
  random?: () => number,
  options?: {
    count?: number;
    gridStep?: number;
    minSize?: number;
    maxSize?: number;
    minDelay?: number;
    maxDelay?: number;
    minDuration?: number;
    maxDuration?: number;
    minOpacity?: number;
    maxOpacity?: number;
    diagonalBoost?: number;
    driftXMin?: number;
    driftXMax?: number;
    driftYMin?: number;
    driftYMax?: number;
    sweepDuration?: number;
    shimmerSettleDelay?: number;
  },
): DirectionTwoAmbientPixel[];
export declare const createDirectionTwoAmbientDots: typeof createDirectionTwoAmbientPixels;
