export type RoomComposerStatusTone = "muted" | "accent" | "error";

export type RoomComposerStatus = { tone: RoomComposerStatusTone; message: string } | null;
export type RoomComposerPendingCommand = { type: "style" } | null;

export declare function getRoomComposerChrome(input: {
  composerStatus: RoomComposerStatus;
  pendingCommand: RoomComposerPendingCommand;
}): {
  expanded: boolean;
  statusMode: "inline" | "overlay" | "hidden";
};
