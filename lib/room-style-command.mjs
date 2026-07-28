import { resolveInkogThemeChoice } from "./inkog-theme.mjs";

export function getRoomStylePrompt() {
  return "style: 1 orange, 2 blue, 3 crimson, 4 purple, 5 surprise";
}

export function resolveRoomStyleSelection(value, random = Math.random) {
  const theme = resolveInkogThemeChoice(value, random);

  if (!theme) {
    return {
      ok: false,
      message: "choose 1, 2, 3, 4, 5, or a theme name",
    };
  }

  return {
    ok: true,
    theme,
    transcriptMessage: `app color changed to ${theme.label}`,
  };
}
