import type { SystemSoundName } from "./system-sound-provider";

export declare function getRoomCountdownNotification(
  previousSecondsLeft: number,
  nextSecondsLeft: number,
):
  | {
      sound: SystemSoundName;
      message: string;
    }
  | null;
