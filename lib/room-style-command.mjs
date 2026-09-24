import { resolveInkogThemeChoice } from "./inkog-theme.mjs";

export function getRoomStylePrompt() {
  return "style: 1 orange, 2 blue, 3 green, 4 purple, 5 surprise (12 colors)";
}

export function resolveRoomStyleSelection(value, random = Math.random) {
  const theme = resolveInkogThemeChoice(value, random);

  if (!theme) {
    return {
      ok: false,
      message: "Pick a theme from 1 to 5, or type a theme name.",
    };
  }

  return {
    ok: true,
    theme,
    transcriptMessage: `app color changed to ${theme.label}`,
  };
}
