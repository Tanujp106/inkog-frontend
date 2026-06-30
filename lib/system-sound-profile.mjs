export const systemSoundMasterVolume = 1;

export const systemSoundNames = [
  "press",
  "hover",
  "messageSent",
  "messageReceived",
  "success",
  "error",
  "close",
  "incoming",
  "notify",
];

export const systemSoundSpecs = {
  hover: [
    { frequency: 920, gain: 0.26, type: "triangle", duration: 0.055 },
  ],
  press: [
    { frequency: 420, gain: 0.38, type: "square", duration: 0.075 },
    { frequency: 210, gain: 0.22, type: "sine", duration: 0.09 },
  ],
  messageSent: [
    { frequency: 190, gain: 0.4, type: "square", duration: 0.065 },
  ],
  messageReceived: [
    { frequency: 760, gain: 0.32, type: "sine", duration: 0.095 },
    { frequency: 1080, gain: 0.25, type: "triangle", duration: 0.13, delay: 0.06 },
  ],
  success: [
    { frequency: 520, gain: 0.36, type: "sine", duration: 0.09 },
    { frequency: 780, gain: 0.32, type: "triangle", duration: 0.12, delay: 0.045 },
  ],
  error: [
    { frequency: 140, gain: 0.46, type: "sawtooth", duration: 0.16 },
    { frequency: 92, gain: 0.24, type: "sine", duration: 0.17, delay: 0.018 },
  ],
  close: [
    { frequency: 260, gain: 0.38, type: "triangle", duration: 0.1 },
    { frequency: 130, gain: 0.26, type: "sine", duration: 0.14, delay: 0.035 },
  ],
  incoming: [
    { frequency: 680, gain: 0.34, type: "sine", duration: 0.1 },
    { frequency: 940, gain: 0.24, type: "triangle", duration: 0.12, delay: 0.05 },
  ],
  notify: [
    { frequency: 600, gain: 0.32, type: "triangle", duration: 0.085 },
    { frequency: 450, gain: 0.24, type: "sine", duration: 0.11, delay: 0.035 },
  ],
};

export function getSystemSoundPeakGain(soundName) {
  const specs = systemSoundSpecs[soundName] ?? [];
  return specs.reduce((peak, spec) => Math.max(peak, spec.gain * systemSoundMasterVolume), 0);
}
