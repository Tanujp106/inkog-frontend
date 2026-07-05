export const inkogFaviconThemeColors = {
  orange: "#ffb15c",
  blue: "#7cc7ff",
  green: "#c8ff57",
  purple: "#c792ff",
};

export const defaultInkogFaviconTheme = "green";

const chatBubblePixels = [
  "0000011111100000",
  "0001111111111000",
  "0011111111111100",
  "0111111111111110",
  "0111111111111110",
  "0111111111111110",
  "0111111111111110",
  "0111111111111110",
  "0011111111111100",
  "0001111111111000",
  "0000111111110000",
  "0000011111000000",
  "0000111000000000",
  "0001100000000000",
  "0000000000000000",
  "0000000000000000",
];

function buildPixelRects(pattern, color) {
  return pattern.flatMap((row, rowIndex) =>
    [...row].map((cell, columnIndex) => {
      if (cell !== "1") return "";
      return `<rect x="${columnIndex * 4}" y="${rowIndex * 4}" width="4" height="4" fill="${color}"/>`;
    }),
  ).join("");
}

export function resolveInkogFaviconTheme(themeId) {
  return Object.hasOwn(inkogFaviconThemeColors, themeId) ? themeId : defaultInkogFaviconTheme;
}

export function buildInkogFaviconSvg(themeId = defaultInkogFaviconTheme) {
  const resolvedThemeId = resolveInkogFaviconTheme(themeId);
  const accent = inkogFaviconThemeColors[resolvedThemeId];
  const bubbleCells = buildPixelRects(chatBubblePixels, accent);

  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" shape-rendering="crispEdges">',
    bubbleCells,
    "</svg>",
  ].join("");
}

export function buildInkogFaviconHref(themeId = defaultInkogFaviconTheme) {
  return `data:image/svg+xml,${encodeURIComponent(buildInkogFaviconSvg(themeId))}`;
}
