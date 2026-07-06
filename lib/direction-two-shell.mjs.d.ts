export type DirectionTwoTheme = {
  id: "orange" | "blue" | "green" | "purple";
  label: string;
  selection: "1" | "2" | "3" | "4";
};
export type DirectionTwoStyleGhostChoice =
  | DirectionTwoTheme
  | {
      id: "surprise";
      label: "surprise me";
      selection: "5";
    };

export type DirectionTwoCreateDraft = {
  topic: string;
  expiry: number;
  roomLimit: number;
  password: string;
};

export type DirectionTwoCreateStep = "topic" | "expiry" | "limit" | "password-choice" | "password";
export type DirectionTwoCreatePromptIcon = "room" | "time" | "people" | "lock" | "key" | "help" | "style" | "sound" | "list" | "enter";
export type DirectionTwoCreatePromptTone = "accent" | "muted";
export type DirectionTwoCreateVisualSegmentTone = "normal" | "topic";

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
export declare const directionTwoCommandReferenceLines: string[];
export declare const directionTwoThemes: DirectionTwoTheme[];
export declare function completeDirectionTwoCommand(value: string): string | null;
export declare function getDirectionTwoSlashCommandSuggestions(value: string): Array<{
  id: string;
  command: string;
  label: string;
}>;
export declare function completeDirectionTwoCreateField(value: string): string | null;
export declare function getDirectionTwoCreateAnswerError(
  step: DirectionTwoCreateStep,
  rawAnswer: string,
): string | null;
export declare function getDirectionTwoCreateGhostText(value: string): string | null;
export declare function getDirectionTwoCreateHint(value: string): string | null;
export declare function getDirectionTwoInlineFeedbackMessage(message: string): string;
export declare function getDirectionTwoInlineGhostText(value: string): string | null;
export declare function getDirectionTwoInlineHint(value: string): string | null;
export declare function getDirectionTwoCreateEditingStep(value: string): DirectionTwoCreateStep | null;
export declare function getDirectionTwoCreatePromptPresentation(value: string): {
  icon: DirectionTwoCreatePromptIcon;
  pattern: string[];
  tone: DirectionTwoCreatePromptTone;
} | null;
export declare function getDirectionTwoInlinePromptPresentation(value: string): {
  icon: DirectionTwoCreatePromptIcon;
  pattern: string[];
  tone: DirectionTwoCreatePromptTone;
} | null;
export declare function getDirectionTwoStyleGhostChoices(value: string): DirectionTwoStyleGhostChoice[] | null;
export declare function getDirectionTwoCreateTimeArrowValue(value: string, direction: "up" | "down"): string | null;
export declare function getDirectionTwoCreateInlineInputError(value: string): string | null;
export declare function getDirectionTwoCreateVisualSegments(value: string): Array<{
  text: string;
  tone: DirectionTwoCreateVisualSegmentTone;
}> | null;
export declare function isDirectionTwoCreateTimeInputValid(value: string): boolean;
export declare function parseDirectionTwoInlineCommand(value: string): {
  command: "create" | "help" | "join" | "style" | "sound" | "command" | "commands" | "clear";
  argument: string;
  usesSlash: boolean;
} | null;
export declare function parseDirectionTwoCreateCommand(value: string): DirectionTwoCreateCommand;
export declare function resolveDirectionTwoEnterAction(value: string):
  | {
      type: "continue-inline";
      value: string;
      hint: string;
    }
  | {
      type: "hold-inline";
      hint: string;
    }
  | null;
export declare function resolveDirectionTwoThemeChoice(
  value: string,
  random?: () => number,
): DirectionTwoTheme | null;
