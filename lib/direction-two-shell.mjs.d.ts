export type DirectionTwoTheme = {
  id: "orange" | "blue" | "green" | "purple";
  label: string;
  selection: "1" | "2" | "3" | "4";
};

export type DirectionTwoCreateDraft = {
  topic: string;
  expiry: number;
  roomLimit: number;
  password: string;
};

export type DirectionTwoCreateStep = "topic" | "expiry" | "limit" | "password-choice";

export type DirectionTwoCreateCommand =
  | { status: "not-create" }
  | {
      status: "partial";
      nextStep: DirectionTwoCreateStep;
      draft: DirectionTwoCreateDraft;
    }
  | {
      status: "ready";
      draft: DirectionTwoCreateDraft;
    }
  | {
      status: "invalid";
      message: string;
    };

export declare const commands: string[];
export declare const directionTwoThemes: DirectionTwoTheme[];
export declare function completeDirectionTwoCommand(value: string): string | null;
export declare function getDirectionTwoCreateHint(value: string): string | null;
export declare function parseDirectionTwoCreateCommand(value: string): DirectionTwoCreateCommand;
export declare function resolveDirectionTwoThemeChoice(
  value: string,
  random?: () => number,
): DirectionTwoTheme | null;
