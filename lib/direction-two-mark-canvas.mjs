import {
  buildDirectionTwoMarkPattern,
  getDirectionTwoFormationDelay,
  getDirectionTwoMagnetOffset,
  getDirectionTwoSineShimmerDelay,
} from "./direction-two-intro.mjs";

export const directionTwoMarkDensity = 2;
export const directionTwoMarkMagnetGridCellSize = 64;
export const directionTwoMarkIdleScale = 0.26;
export const directionTwoMarkIdleOpacity = 0.06;
export const directionTwoMarkMaxDpr = 2;

export function createDensePixelPattern(pattern, density = directionTwoMarkDensity) {
  return pattern.flatMap(row => {
    const expandedRow = [...row].map(cell => cell.repeat(density)).join("");
    return Array.from({ length: density }, () => expandedRow);
  });
}

export function getDirectionTwoMarkMagnetGridKey(cellX, cellY) {
  return `${cellX}:${cellY}`;
}

export function easeDirectionTwoMarkProgress(progress) {
  const t = Math.min(1, Math.max(0, progress));
  return 1 - (1 - t) ** 3;
}

export function getDirectionTwoMarkFormationOpacity(elapsedMs, durationMs) {
  if (durationMs <= 0) return 1;
  const progress = Math.min(1, Math.max(0, elapsedMs / durationMs));
  if (progress >= 0.68) return 1;
  return easeDirectionTwoMarkProgress(progress / 0.68);
}

export function getDirectionTwoMarkShimmerMix(elapsedMs, durationMs) {
  if (durationMs <= 0) return 0;
  const progress = Math.min(1, Math.max(0, elapsedMs / durationMs));
  if (progress <= 0) return 0;
  if (progress >= 1) return 0;
  const peak = progress <= 0.5 ? progress / 0.5 : (1 - progress) / 0.5;
  return easeDirectionTwoMarkProgress(peak);
}

export function mixDirectionTwoMarkHighlightColor(
  foregroundRgb,
  signalRgb,
  colorMixPercent,
  brightness,
) {
  const signalWeight = Math.min(100, Math.max(0, colorMixPercent)) / 100;
  const foregroundWeight = 1 - signalWeight;
  const mix = channel => foregroundRgb[channel] * foregroundWeight + signalRgb[channel] * signalWeight;
  const scale = Math.max(0, brightness);
  const clamp = value => Math.min(255, Math.max(0, Math.round(value * scale)));

  return {
    r: clamp(mix("r")),
    g: clamp(mix("g")),
    b: clamp(mix("b")),
  };
}

export function parseCssRgbColor(value) {
  if (typeof value !== "string") return null;

  const hex = value.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const raw = hex[1];
    const full = raw.length === 3 ? [...raw].map(part => `${part}${part}`).join("") : raw;
    return {
      r: Number.parseInt(full.slice(0, 2), 16),
      g: Number.parseInt(full.slice(2, 4), 16),
      b: Number.parseInt(full.slice(4, 6), 16),
    };
  }

  const rgb = value.trim().match(/^rgba?\((.+)\)$/i);
  if (!rgb) return null;
  const parts = rgb[1].split(",").map(part => Number.parseFloat(part.trim()));
  if (parts.length < 3 || parts.slice(0, 3).some(part => !Number.isFinite(part))) return null;
  return { r: parts[0], g: parts[1], b: parts[2] };
}

export function buildDirectionTwoMarkLayout(
  word,
  {
    cellSize,
    gap,
    letterGap,
    density = directionTwoMarkDensity,
    motionSettings,
  },
) {
  const patterns = buildDirectionTwoMarkPattern(word);
  const denseLetters = patterns.map(pattern => createDensePixelPattern(pattern, density));
  const shimmerColumnCount = denseLetters.reduce(
    (total, pattern) => total + (pattern[0]?.length ?? 0),
    0,
  ) + Math.max(denseLetters.length - 1, 0) * 2;

  const pixels = [];
  let cursorX = 0;
  let height = 0;

  denseLetters.forEach((densePattern, letterIndex) => {
    const columnCount = densePattern[0]?.length ?? 0;
    const rowCount = densePattern.length;
    height = Math.max(height, rowCount * cellSize + Math.max(0, rowCount - 1) * gap);

    densePattern.forEach((row, rowIndex) => {
      [...row].forEach((cell, columnIndex) => {
        const active = cell === "1";
        const shimmerColumn = letterIndex * (columnCount + 2) + columnIndex;
        const x = cursorX + columnIndex * (cellSize + gap);
        const y = rowIndex * (cellSize + gap);

        pixels.push({
          active,
          x,
          y,
          formationDelay: getDirectionTwoFormationDelay(
            shimmerColumn,
            shimmerColumnCount,
            motionSettings.formationSpreadMs,
          ),
          shimmerDelay: getDirectionTwoSineShimmerDelay(
            shimmerColumn,
            rowIndex,
            shimmerColumnCount,
            rowCount,
            motionSettings.shimmerSpreadMs,
            motionSettings.shimmerAmplitudeMs,
            motionSettings.shimmerFrequency,
          ),
          offsetX: 0,
          offsetY: 0,
          highlighted: false,
        });
      });
    });

    cursorX += columnCount * cellSize + Math.max(0, columnCount - 1) * gap;
    if (letterIndex < denseLetters.length - 1) cursorX += letterGap;
  });

  return {
    width: cursorX,
    height,
    cellSize,
    gap,
    letterGap,
    pixels,
  };
}

export function attachDirectionTwoMarkPixelCenters(layout, originX, originY) {
  const cellCenter = layout.cellSize / 2;
  const records = [];
  const grid = new Map();

  for (const pixel of layout.pixels) {
    if (!pixel.active) continue;

    const record = {
      pixel,
      x: originX + pixel.x + cellCenter,
      y: originY + pixel.y + cellCenter,
      offsetX: pixel.offsetX,
      offsetY: pixel.offsetY,
    };
    records.push(record);

    const key = getDirectionTwoMarkMagnetGridKey(
      Math.floor(record.x / directionTwoMarkMagnetGridCellSize),
      Math.floor(record.y / directionTwoMarkMagnetGridCellSize),
    );
    const bucket = grid.get(key);
    if (bucket) bucket.push(record);
    else grid.set(key, [record]);
  }

  return { records, grid };
}

export function getDirectionTwoMarkMagnetCandidates(grid, pointerX, pointerY, radius) {
  const minCellX = Math.floor((pointerX - radius) / directionTwoMarkMagnetGridCellSize);
  const maxCellX = Math.floor((pointerX + radius) / directionTwoMarkMagnetGridCellSize);
  const minCellY = Math.floor((pointerY - radius) / directionTwoMarkMagnetGridCellSize);
  const maxCellY = Math.floor((pointerY + radius) / directionTwoMarkMagnetGridCellSize);
  const candidates = [];

  for (let cellY = minCellY; cellY <= maxCellY; cellY += 1) {
    for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
      const bucket = grid.get(getDirectionTwoMarkMagnetGridKey(cellX, cellY));
      if (bucket) candidates.push(...bucket);
    }
  }

  return candidates;
}

export function applyDirectionTwoMarkMagnetism(
  records,
  grid,
  pointer,
  {
    magnetRadius,
    magnetStrength,
    magnetMaxDisplacement,
  },
) {
  const radius = Math.max(0, magnetRadius);
  const radiusSquared = radius * radius;
  const candidates = getDirectionTwoMarkMagnetCandidates(grid, pointer.x, pointer.y, radius);
  const candidateSet = new Set(candidates);
  let changed = false;

  for (const record of records) {
    if (!candidateSet.has(record) && (record.offsetX !== 0 || record.offsetY !== 0 || record.pixel.highlighted)) {
      record.offsetX = 0;
      record.offsetY = 0;
      record.pixel.offsetX = 0;
      record.pixel.offsetY = 0;
      record.pixel.highlighted = false;
      changed = true;
    }
  }

  for (const record of candidates) {
    const deltaX = pointer.x - record.x;
    const deltaY = pointer.y - record.y;
    const distanceSquared = deltaX * deltaX + deltaY * deltaY;
    if (distanceSquared >= radiusSquared) {
      if (record.offsetX !== 0 || record.offsetY !== 0 || record.pixel.highlighted) {
        record.offsetX = 0;
        record.offsetY = 0;
        record.pixel.offsetX = 0;
        record.pixel.offsetY = 0;
        record.pixel.highlighted = false;
        changed = true;
      }
      continue;
    }

    const offset = getDirectionTwoMagnetOffset(
      record.x,
      record.y,
      pointer.x,
      pointer.y,
      magnetRadius,
      magnetStrength,
      magnetMaxDisplacement,
    );
    const highlighted = offset.x !== 0 || offset.y !== 0;

    if (
      offset.x !== record.offsetX
      || offset.y !== record.offsetY
      || record.pixel.highlighted !== highlighted
    ) {
      record.offsetX = offset.x;
      record.offsetY = offset.y;
      record.pixel.offsetX = offset.x;
      record.pixel.offsetY = offset.y;
      record.pixel.highlighted = highlighted;
      changed = true;
    }
  }

  return changed;
}

export function resetDirectionTwoMarkMagnetism(layout) {
  let changed = false;
  for (const pixel of layout.pixels) {
    if (pixel.offsetX !== 0 || pixel.offsetY !== 0 || pixel.highlighted) {
      pixel.offsetX = 0;
      pixel.offsetY = 0;
      pixel.highlighted = false;
      changed = true;
    }
  }
  return changed;
}

function rgba({ r, g, b }, alpha = 1) {
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * @param {CanvasRenderingContext2D} context
 * @param {{ width: number, height: number, cellSize: number, pixels: Array<{ active: boolean, x: number, y: number, formationDelay: number, shimmerDelay: number, offsetX: number, offsetY: number, highlighted: boolean }> }} layout
 * @param {{
 *   phase: "forming" | "shimmering" | "interactive",
 *   now: number,
 *   formationStartedAt: number,
 *   shimmerStartedAt: number,
 *   colors: { foreground: { r: number, g: number, b: number }, border: { r: number, g: number, b: number }, signal: { r: number, g: number, b: number } },
 *   motionSettings: {
 *     formationDurationMs: number,
 *     shimmerDurationMs: number,
 *     shimmerColorMixPercent: number,
 *     shimmerPeakOpacity: number,
 *     hoverHighlightColorMixPercent: number,
 *     hoverHighlightBrightness: number,
 *     hoverHighlightGlowRadius: number,
 *     hoverHighlightGlowOpacity: number,
 *     magnetMaxDisplacement: number,
 *   },
 *   magnetActive?: boolean,
 *   pointer?: { localX: number, localY: number } | null,
 * }} options
 */
export function drawDirectionTwoMark(
  context,
  layout,
  {
    phase,
    now,
    formationStartedAt,
    shimmerStartedAt,
    colors,
    motionSettings,
  },
) {
  const {
    foreground,
    border,
    signal,
  } = colors;
  const cell = layout.cellSize;
  const highlightColor = mixDirectionTwoMarkHighlightColor(
    foreground,
    signal,
    motionSettings.hoverHighlightColorMixPercent,
    motionSettings.hoverHighlightBrightness,
  );
  const shimmerMixColor = mixDirectionTwoMarkHighlightColor(
    foreground,
    signal,
    motionSettings.shimmerColorMixPercent,
    1,
  );

  context.clearRect(
    -motionSettings.magnetMaxDisplacement - 2,
    -motionSettings.magnetMaxDisplacement - 2,
    layout.width + motionSettings.magnetMaxDisplacement * 2 + 4,
    layout.height + motionSettings.magnetMaxDisplacement * 2 + 4,
  );

  for (const pixel of layout.pixels) {
    const drawX = pixel.x + (pixel.active ? pixel.offsetX : 0);
    const drawY = pixel.y + (pixel.active ? pixel.offsetY : 0);

    if (!pixel.active) {
      const idleSize = cell * directionTwoMarkIdleScale;
      const idleOffset = (cell - idleSize) / 2;
      context.globalAlpha = directionTwoMarkIdleOpacity;
      context.fillStyle = rgba(border, 1);
      context.fillRect(drawX + idleOffset, drawY + idleOffset, idleSize, idleSize);
      context.globalAlpha = 1;
      continue;
    }

    let opacity = 1;
    let fill = foreground;

    if (phase === "forming") {
      const elapsed = now - formationStartedAt - pixel.formationDelay;
      opacity = getDirectionTwoMarkFormationOpacity(elapsed, motionSettings.formationDurationMs);
      fill = foreground;
    } else if (phase === "shimmering") {
      const elapsed = now - shimmerStartedAt - pixel.shimmerDelay;
      const mix = getDirectionTwoMarkShimmerMix(elapsed, motionSettings.shimmerDurationMs);
      opacity = 1 - mix * (1 - motionSettings.shimmerPeakOpacity);
      fill = {
        r: Math.round(foreground.r + (shimmerMixColor.r - foreground.r) * mix),
        g: Math.round(foreground.g + (shimmerMixColor.g - foreground.g) * mix),
        b: Math.round(foreground.b + (shimmerMixColor.b - foreground.b) * mix),
      };
    } else if (pixel.highlighted) {
      context.save();
      context.shadowColor = rgba(signal, motionSettings.hoverHighlightGlowOpacity / 100);
      context.shadowBlur = motionSettings.hoverHighlightGlowRadius;
      context.fillStyle = rgba({ r: 0, g: 0, b: 0 }, 0.18);
      context.fillRect(drawX - 0.5, drawY - 0.5, cell + 1, cell + 1);
      context.fillStyle = rgba(highlightColor, 1);
      context.fillRect(drawX, drawY, cell, cell);
      context.restore();
      continue;
    }

    if (opacity <= 0.001) continue;
    context.globalAlpha = opacity;
    context.fillStyle = rgba(fill, 1);
    context.fillRect(drawX, drawY, cell, cell);
    context.globalAlpha = 1;
  }
}

export function resolveDirectionTwoMarkDpr(devicePixelRatio = 1) {
  return Math.min(Math.max(1, devicePixelRatio || 1), directionTwoMarkMaxDpr);
}
