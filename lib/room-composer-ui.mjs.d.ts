export type RoomComposerStatusTone = "muted" | "accent" | "error";

export type RoomComposerStatus = { tone: RoomComposerStatusTone; message: string } | null;
export type RoomComposerPendingCommand =
  | { type: "style" }
  | { type: "poll"; step: "question" | "option"; draft: { question: string; options: string[] } }
  | null;

export declare function getRoomComposerChrome(input: {
  composerStatus: RoomComposerStatus;
  pendingCommand: RoomComposerPendingCommand;
}): {
  expanded: boolean;
  statusMode: "inline" | "hidden";
};

export type RoomSlashCommandSuggestion = {
  id: "password" | "poll" | "style" | "sound" | "share" | "help" | "leave" | "close";
  command: string;
  label: string;
};

export declare function getRoomSlashCommandSuggestions(input: {
  isCreator: boolean;
  query: string;
}): RoomSlashCommandSuggestion[];
