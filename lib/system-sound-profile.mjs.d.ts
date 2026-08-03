import type { SystemSoundName } from "./system-sound-provider";

export type SystemSoundSpec = {
  frequency: number;
  gain: number;
  type?: OscillatorType;
  duration: number;
  delay?: number;
};

export declare const systemSoundMasterVolume: number;
export declare const systemSoundNames: SystemSoundName[];
export declare const systemSoundSpecs: Record<SystemSoundName, SystemSoundSpec[]>;
export declare function getSystemSoundPeakGain(soundName: SystemSoundName): number;
