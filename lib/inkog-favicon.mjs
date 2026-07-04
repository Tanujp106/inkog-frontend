export const inkogFaviconThemeColors = {
  orange: "#ffb15c",
  blue: "#7cc7ff",
  green: "#c8ff57",
  purple: "#c792ff",
};

export const defaultInkogFaviconTheme = "green";

const chatBubblePixels = [
  "0001111111110000",
  "0011111111111000",
  "0110000000001100",
  "1100000000000110",
  "1100011001100110",
  "1100011001100110",
  "1100000000000110",
  "1100111111110110",
  "1100000000000110",
  "0110000000001100",
  "0011111111111000",
  "0001111111110000",
  "0000011110000000",
  "0000001100000000",
  "0000001000000000",
  "0000000000000000",
];

export function resolveInkogFaviconTheme(themeId) {
  return Object.hasOwn(inkogFaviconThemeColors, themeId) ? themeId : defaultInkogFaviconTheme;
}

export function buildInkogFaviconSvg(themeId = defaultInkogFaviconTheme) {
  const resolvedThemeId = resolveInkogFaviconTheme(themeId);
  const accent = inkogFaviconThemeColors[resolvedThemeId];
  const cells = chatBubblePixels.flatMap((row, rowIndex) =>
    [...row].map((cell, columnIndex) => {
      if (cell !== "1") return "";
      return `<rect x="${columnIndex * 4}" y="${rowIndex * 4}" width="3" height="3" fill="${accent}"/>`;
    }),
  ).join("");

  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" shape-rendering="crispEdges">',
    '<rect width="64" height="64" fill="#050505"/>',
    cells,
    "</svg>",
  ].join("");
}

export function buildInkogFaviconHref(themeId = defaultInkogFaviconTheme) {
  return `data:image/svg+xml,${encodeURIComponent(buildInkogFaviconSvg(themeId))}`;
}
