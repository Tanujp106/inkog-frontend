export const directionTwoBrandLabels = ["anonymous rooms", "temporary chat"];
export const directionTwoMarkWords = ["inkog"];
export const directionTwoMarkSlotCount = Math.max(...directionTwoMarkWords.map(word => word.length));
export const directionTwoMarkIcons = [
  {
    id: "eye",
    label: "private view",
    pattern: [
      "00000",
      "01110",
      "10001",
      "10101",
      "10001",
      "01110",
      "00000",
    ],
  },
  {
    id: "lock",
    label: "locked room",
    pattern: [
      "01110",
      "10001",
      "10001",
      "11111",
      "11011",
      "11011",
      "11111",
    ],
  },
  {
    id: "key",
    label: "temporary key",
    pattern: [
      "01100",
      "10010",
      "10010",
      "01100",
      "00111",
      "00010",
      "00011",
    ],
  },
];
export const directionTwoAmbientConfig = {
  count: 54,
  gridStep: 6,
  minSize: 2,
  maxSize: 4,
  minDelay: 0,
  maxDelay: 2.8,
  minDuration: 2.4,
  maxDuration: 4.8,
  minOpacity: 0.08,
  maxOpacity: 0.36,
  diagonalBoost: 1,
  driftXMin: 0,
  driftXMax: 0,
  driftYMin: 0,
  driftYMax: 0,
  sweepDuration: 0.92,
  shimmerSettleDelay: 0.72,
};

const scrambleAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const directionTwoPixelAlphabet = {
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  a: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  c: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  g: ["01110", "10001", "10000", "10000", "10011", "10001", "01110"],
  h: ["10000", "10000", "10000", "11110", "10001", "10001", "10001"],
  i: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  k: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  m: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  n: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  o: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  s: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  t: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  u: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
};

export function getDirectionTwoScrambleFrame(target, progress) {
  if (progress >= 1) return target;

  const safeProgress = Math.max(0, Math.min(1, progress));
  const revealIndex = Math.floor(target.length * safeProgress);
  const phaseOffset = Math.floor(safeProgress * scrambleAlphabet.length);

  return [...target].map((char, index) => {
    if (char === " ") return " ";
    if (index < revealIndex) return char;
    return scrambleAlphabet[(index + phaseOffset) % scrambleAlphabet.length];
  }).join("");
}

export function buildDirectionTwoPixelWord(word) {
  return [...word.toLowerCase()].map(char => directionTwoPixelAlphabet[char] ?? directionTwoPixelAlphabet[" "]);
}

export function buildDirectionTwoMarkPattern(word) {
  const letters = buildDirectionTwoPixelWord(word);
  const padding = Array.from({ length: Math.max(0, directionTwoMarkSlotCount - letters.length) }, () => directionTwoPixelAlphabet[" "]);
  return [...letters, ...padding];
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(min, max, value) {
  return min + (max - min) * value;
}

export function createDirectionTwoAmbientPixels(
  random = Math.random,
  options = directionTwoAmbientConfig,
) {
  const config = {
    ...directionTwoAmbientConfig,
    ...options,
  };
  const gridLimit = Math.floor(100 / config.gridStep) - 1;

  return Array.from({ length: config.count }, (_, index) => {
    const gridX = Math.floor(random() * (gridLimit + 1));
    const gridY = Math.floor(random() * (gridLimit + 1));
    const waveProgress = (gridX + gridY) / Math.max(1, gridLimit * 2);
    const diagonalWeight = 1 - Math.min(1, Math.abs(gridX - gridY) / gridLimit);
    const driftX = Math.round(lerp(config.driftXMin, config.driftXMax, random()));
    const driftY = Math.round(lerp(config.driftYMin, config.driftYMax, random()));
    const waveJitter = random() * 0.16;
    const waveDelay = lerp(config.minDelay, config.maxDelay, waveProgress) + waveJitter;
    const duration = lerp(config.minDuration, config.maxDuration, random());
    const intensity = clamp(
      config.minOpacity
        + diagonalWeight * config.diagonalBoost
        + random() * 0.16,
      config.minOpacity,
      config.maxOpacity,
    );

    return {
      id: `pixel-${index}`,
      left: gridX * config.gridStep,
      top: gridY * config.gridStep,
      size: Math.round(lerp(config.minSize, config.maxSize, random())),
      delay: Number(waveDelay.toFixed(2)),
      duration: Number(duration.toFixed(2)),
      opacity: Number(intensity.toFixed(2)),
      driftX,
      driftY,
      waveDelay: Number(waveDelay.toFixed(2)),
      sweepDuration: config.sweepDuration,
      shimmerDelay: Number((waveDelay + config.shimmerSettleDelay + random() * 0.7).toFixed(2)),
      shimmerPhase: Number((random() * 1.2).toFixed(2)),
    };
  });
}

export const createDirectionTwoAmbientDots = createDirectionTwoAmbientPixels;
