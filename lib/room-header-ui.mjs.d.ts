export type RoomRosterItem = {
  alias: string;
  initials: string;
};

export type RoomRoster = {
  visible: RoomRosterItem[];
  overflow: number;
};

export type RoomTtlMeter = {
  label: "ttl";
  time: string;
  percent: number;
  warning: boolean;
  marker: string;
};

export declare function formatRoomCountdown(seconds: number): string;
export declare function getRoomTtlMeter(input: {
  secondsLeft: number;
  totalSeconds: number;
}): RoomTtlMeter;
export declare function getRoomRoster(roomUsers: string[]): RoomRoster;
