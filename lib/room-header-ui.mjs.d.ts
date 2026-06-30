export type RoomRosterItem = {
  alias: string;
  initials: string;
};

export type RoomRoster = {
  visible: RoomRosterItem[];
  overflow: number;
};

export declare function formatRoomCountdown(seconds: number): string;
export declare function getRoomRoster(roomUsers: string[]): RoomRoster;
