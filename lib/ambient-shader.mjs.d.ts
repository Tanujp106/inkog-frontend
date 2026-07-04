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

export function resolveAmbientShaderColors(
  style: Pick<CSSStyleDeclaration, "getPropertyValue"> | undefined,
  config?: typeof ambientShaderConfig,
): {
  colors: string[];
  colorBack: string;
};
