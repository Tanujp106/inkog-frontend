export const ROOM_OG_WIDTH: 1200;
export const ROOM_OG_HEIGHT: 630;
export const ROOM_OG_DEFAULT_TOPIC: "Private room";

export type RoomOgData = {
  id: string;
  topic: string;
  hasPassword: boolean;
  secondsLeft: number;
};

export declare function normalizeRoomOgTopic(topic: unknown): string;
export declare function formatRoomOgPasswordLabel(hasPassword: boolean): string;
export declare function buildRoomOgTitle(topic: string): string;
export declare function buildRoomOgDescription(room: Pick<RoomOgData, "hasPassword" | "secondsLeft">): string;
export declare function buildRoomOgImagePath(roomId: string): string;
export declare function buildRoomOgFallback(roomId: string): RoomOgData;
export declare function fetchRoomOgData(
  roomId: string,
  apiBaseUrl: string,
  fetchImpl?: typeof fetch,
): Promise<RoomOgData>;
export declare function getRoomOgApiBaseUrl(): string;
