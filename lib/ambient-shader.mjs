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

export const ambientShaderColorTransitionMs = 2200;

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

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function parseHexColor(value) {
  const match = value.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
  if (!match) return null;

  const hex = match[1];
  const expand = part => part.length === 1 ? `${part}${part}` : part;
  const parts = hex.length <= 4
    ? [...hex].map(expand)
    : hex.match(/.{2}/g);

  if (!parts || parts.length < 3) return null;

  return {
    r: Number.parseInt(parts[0], 16),
    g: Number.parseInt(parts[1], 16),
    b: Number.parseInt(parts[2], 16),
    a: parts[3] ? Number.parseInt(parts[3], 16) / 255 : 1,
  };
}

function parseRgbColor(value) {
  const match = value.trim().match(/^rgba?\((.+)\)$/i);
  if (!match) return null;

  const parts = match[1].split(",").map(part => part.trim());
  if (parts.length < 3) return null;

  const [r, g, b] = parts.slice(0, 3).map(Number);
  const a = parts[3] === undefined ? 1 : Number(parts[3]);
  if (![r, g, b, a].every(Number.isFinite)) return null;

  return { r, g, b, a };
}

export function parseAmbientShaderColor(value) {
  return parseHexColor(value) ?? parseRgbColor(value);
}

export function easeAmbientShaderColorTransition(progress) {
  const clampedProgress = clamp(progress, 0, 1);
  return clampedProgress * clampedProgress * (3 - 2 * clampedProgress);
}

export function mixAmbientShaderColor(fromColor, toColor, progress) {
  const from = parseAmbientShaderColor(fromColor);
  const to = parseAmbientShaderColor(toColor);
  const easedProgress = easeAmbientShaderColorTransition(progress);

  if (!from || !to) return easedProgress < 1 ? fromColor : toColor;

  const mix = (fromValue, toValue) => fromValue + (toValue - fromValue) * easedProgress;
  const r = Math.round(mix(from.r, to.r));
  const g = Math.round(mix(from.g, to.g));
  const b = Math.round(mix(from.b, to.b));
  const a = Number(mix(from.a, to.a).toFixed(4));

  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export function mixAmbientShaderColors(fromColors, toColors, progress) {
  return {
    colors: toColors.colors.map((toColor, index) => mixAmbientShaderColor(fromColors.colors[index] ?? toColor, toColor, progress)),
    colorBack: mixAmbientShaderColor(fromColors.colorBack, toColors.colorBack, progress),
  };
}
