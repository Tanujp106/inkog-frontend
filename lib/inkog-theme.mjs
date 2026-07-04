export const inkogThemeStorageKey = "inkog-theme";

export const inkogThemeChoices = [
  { id: "orange", label: "orange", selection: "1" },
  { id: "blue", label: "blue", selection: "2" },
  { id: "green", label: "green", selection: "3" },
  { id: "purple", label: "purple", selection: "4" },
];
const inkogThemeWordSelections = {
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
};

export function resolveInkogThemeChoice(value, random = Math.random) {
  const trimmedValue = value.trim().toLowerCase();
  if (!trimmedValue) return null;
  const normalizedValue = inkogThemeWordSelections[trimmedValue] ?? trimmedValue;

  if (normalizedValue === "5" || normalizedValue === "surprise" || normalizedValue === "surprise me") {
    const index = Math.max(0, Math.min(inkogThemeChoices.length - 1, Math.floor(random() * inkogThemeChoices.length)));
    return inkogThemeChoices[index];
  }

  return inkogThemeChoices.find(theme => theme.selection === normalizedValue || theme.id === normalizedValue) ?? null;
}

export function applyInkogTheme(target, themeId) {
  target?.documentElement?.setAttribute?.("data-inkog-theme", themeId);
  target?.storage?.setItem?.(inkogThemeStorageKey, themeId);
}
