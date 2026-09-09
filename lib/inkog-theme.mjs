export const inkogThemeStorageKey = "inkog-theme";

export const inkogThemeColors = {
  orange: "#ffb15c",
  blue: "#7cc7ff",
  green: "#2f7d50",
  purple: "#c792ff",
  rose: "#ff7f9f",
  amber: "#f3c969",
  cyan: "#61dde6",
  teal: "#65d6b3",
  red: "#ff6b6b",
  pink: "#f08ad4",
  indigo: "#9aa7ff",
  lime: "#b7e36b",
};

export const inkogThemeChoices = [
  { id: "orange", label: "orange", selection: "1" },
  { id: "blue", label: "blue", selection: "2" },
  { id: "green", label: "green", selection: "3" },
  { id: "purple", label: "purple", selection: "4" },
  { id: "rose", label: "rose", selection: "rose" },
  { id: "amber", label: "amber", selection: "amber" },
  { id: "cyan", label: "cyan", selection: "cyan" },
  { id: "teal", label: "teal", selection: "teal" },
  { id: "red", label: "red", selection: "red" },
  { id: "pink", label: "pink", selection: "pink" },
  { id: "indigo", label: "indigo", selection: "indigo" },
  { id: "lime", label: "lime", selection: "lime" },
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
