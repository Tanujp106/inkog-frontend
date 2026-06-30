export type DirectionTwoTheme = {
  id: "orange" | "blue" | "green" | "purple";
  label: string;
  selection: "1" | "2" | "3" | "4";
};

export declare const commands: string[];
export declare const directionTwoThemes: DirectionTwoTheme[];
export declare function completeDirectionTwoCommand(value: string): string | null;
export declare function resolveDirectionTwoThemeChoice(
  value: string,
  random?: () => number,
): DirectionTwoTheme | null;
