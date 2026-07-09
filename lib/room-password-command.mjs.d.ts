export type RoomPasswordCommandResult =
  | { ok: true; password: string; hint: string }
  | { ok: false; message: string };

export declare function getStoredRoomPassword(roomId: string, storage?: Storage): string | null;

export declare function setStoredRoomPassword(roomId: string, password: string, storage?: Storage): void;

export declare function resolveRoomPasswordCommand(input: {
  isCreator: boolean;
  password: string | null;
}): RoomPasswordCommandResult;
