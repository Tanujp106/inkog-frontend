export type RoomMessageRecord = {
  alias: string;
  content: string;
  createdAt: string;
  isSystem?: boolean;
};

export type RoomMessagePresentation =
  | { kind: "system"; align: "left"; tone: "muted"; prefix: "system:" }
  | { kind: "incoming"; align: "left"; tone: "accent"; prefix: string }
  | { kind: "outgoing"; align: "left"; tone: "muted"; prefix: "$" };

export function classifyRoomMessage(message: RoomMessageRecord, viewerAlias: string): RoomMessagePresentation;
