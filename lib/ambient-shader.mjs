export const ambientShaderConfig = {
  width: 1280,
  height: 720,
  colors: ["var(--color-signal-glow)"],
  colorBack: "var(--color-black)",
  softness: 0.39,
  intensity: 0,
  noise: 0.08,
  shape: "wave",
  speed: 0.5,
  scale: 2.6,
  rotation: 180,
  offsetX: -0.78,
  offsetY: 0.26,
  minPixelRatio: 1.5,
  maxPixelCount: 3600000,
};

function resolveCssColor(style, value) {
  const variableMatch = value.match(/^var\((--[^)]+)\)$/);
  if (!variableMatch) return value;

  const resolved = style?.getPropertyValue?.(variableMatch[1])?.trim();
  return resolved || value;
}

export function resolveAmbientShaderColors(style, config = ambientShaderConfig) {
  return {
    colors: config.colors.map(color => resolveCssColor(style, color)),
    colorBack: resolveCssColor(style, config.colorBack),
  };
}
