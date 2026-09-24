export type InkogThemeChoice = {
  id: "orange" | "blue" | "green" | "purple" | "rose" | "amber" | "cyan" | "teal" | "red" | "pink" | "indigo" | "lime";
  label: string;
  selection: string;
};

export declare const inkogThemeStorageKey = "inkog-theme";
export declare const inkogThemeColors: Record<InkogThemeChoice["id"], string>;
export declare const inkogThemeChoices: InkogThemeChoice[];
export declare function resolveInkogThemeChoice(value: string, random?: () => number): InkogThemeChoice | null;
export declare function applyInkogTheme(
  target: {
    documentElement?: { setAttribute?: (name: string, value: string) => void };
    storage?: { setItem?: (name: string, value: string) => void };
  } | null | undefined,
  themeId: InkogThemeChoice["id"],
): void;
