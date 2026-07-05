export type RoomMessageRecord = {
  alias: string;
  content: string;
  createdAt: string;
  isSystem?: boolean;
};

export type RoomMessagePresentation =
  | { kind: "system"; align: "left"; tone: "muted"; prefix: "system:" }
  | { kind: "incoming"; align: "left"; tone: "accent"; prefix: string }
  | { kind: "outgoing"; align: "left"; tone: "muted"; prefix: string };

export const ROOM_PEER_COLORS: readonly string[];
export const ROOM_PEER_COLOR_THEMES: Readonly<Record<string, readonly string[]>>;

export function buildRoomPeerColorMap(aliases: string[], viewerAlias: string, themeId?: string): Record<string, string>;

export function classifyRoomMessage(message: RoomMessageRecord, viewerAlias: string): RoomMessagePresentation;

export function buildRoomGateTranscriptLines(input: {
  topic: string;
  state: "locked" | "unlocked";
}): string[];

export function buildRoomLoadingTranscriptLines(): string[];

export function resolveRoomStageAfterAuthenticatedJoin(): "joined";
