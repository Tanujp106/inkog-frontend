export type SystemSoundCommand =
  | { type: "set"; muted: boolean }
  | { type: "status" }
  | { type: "invalid"; message: string };

export declare const systemSoundStorageKey: string;
export declare function parseSystemSoundCommand(rawCommand: string): SystemSoundCommand;
export declare function formatSystemSoundStatus(muted: boolean): string;
export declare function readSystemSoundMuted(storage?: Storage | null): boolean;
export declare function writeSystemSoundMuted(storage: Storage | undefined | null, muted: boolean): void;
