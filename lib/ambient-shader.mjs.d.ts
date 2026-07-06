export const ambientShaderConfig: {
  width: number;
  height: number;
  colors: string[];
  colorBack: string;
  softness: number;
  intensity: number;
  noise: number;
  shape: "wave";
  speed: number;
  scale: number;
  rotation: number;
  offsetX: number;
  offsetY: number;
  minPixelRatio: number;
  maxPixelCount: number;
};

export const ambientShaderColorTransitionMs: number;

export function resolveAmbientShaderColors(
  style: Pick<CSSStyleDeclaration, "getPropertyValue"> | undefined,
  config?: typeof ambientShaderConfig,
): {
  colors: string[];
  colorBack: string;
};

export function parseAmbientShaderColor(value: string): {
  r: number;
  g: number;
  b: number;
  a: number;
} | null;

export function easeAmbientShaderColorTransition(progress: number): number;

export function mixAmbientShaderColor(fromColor: string, toColor: string, progress: number): string;

export function mixAmbientShaderColors(
  fromColors: {
    colors: string[];
    colorBack: string;
  },
  toColors: {
    colors: string[];
    colorBack: string;
  },
  progress: number,
): {
  colors: string[];
  colorBack: string;
};

export function resolveAmbientShaderLayerOpacity(progress: number): number;
