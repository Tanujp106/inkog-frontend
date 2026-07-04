import type { RoomOgData } from "./room-og.mjs";

export type RoomOgImageAssets = {
  baseGif: Buffer;
  departureMonoFont: Buffer;
};

export declare function renderRoomOgGif(room: RoomOgData, assets: RoomOgImageAssets): Promise<Buffer>;
