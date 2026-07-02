import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDirectionTwoMarkPattern,
  buildDirectionTwoPixelWord,
  createDirectionTwoAmbientPixels,
  directionTwoBrandLabels,
  directionTwoAmbientConfig,
  directionTwoAmbientAtmosphere,
  directionTwoMarkMotion,
  directionTwoMarkIcons,
  directionTwoMarkSlotCount,
  directionTwoMarkWords,
  getDirectionTwoScrambleFrame,
} from "./direction-two-intro.mjs";

test("returns the final text once scramble progress is complete", () => {
  assert.equal(getDirectionTwoScrambleFrame("anonymous rooms", 1), "anonymous rooms");
});

test("preserves spaces while scrambling unfinished characters", () => {
  const frame = getDirectionTwoScrambleFrame("go fast", 0.3);

  assert.equal(frame.length, 7);
  assert.equal(frame[2], " ");
  assert.notEqual(frame, "go fast");
});

test("exposes the rotating intro labels in the expected order", () => {
  assert.deepEqual(directionTwoBrandLabels, ["anonymous rooms", "temporary chat"]);
});

test("keeps the mark word stable", () => {
  assert.deepEqual(directionTwoMarkWords, ["inkog"]);
});

test("exposes same-size privacy icons for the mark", () => {
  assert.deepEqual(directionTwoMarkIcons.map(icon => icon.id), ["eye", "lock", "key"]);
  assert.ok(directionTwoMarkIcons.every(icon => icon.pattern.length === 7));
  assert.ok(directionTwoMarkIcons.every(icon => icon.pattern.every(row => row.length === 5)));
});

test("builds pixel patterns for the inkog mark", () => {
  const pattern = buildDirectionTwoPixelWord("inkog");

  assert.equal(pattern.length, 5);
  assert.equal(pattern[0][0], "11111");
  assert.deepEqual(pattern[4], ["01110", "10001", "10000", "10000", "10011", "10001", "01110"]);
});

test("keeps the inkog mark unpadded", () => {
  const pattern = buildDirectionTwoMarkPattern("inkog");

  assert.equal(directionTwoMarkSlotCount, 5);
  assert.equal(pattern.length, 5);
});

test("keeps direction two mark interactions quick and hover-gated", () => {
  assert.equal(directionTwoMarkMotion.iconFlipDelayMs, 1900);
  assert.equal(directionTwoMarkMotion.iconSwapDurationMs, 300);
  assert.equal(directionTwoMarkMotion.introShimmerIterationCount, 1);
  assert.equal(directionTwoMarkMotion.hoverShimmerIterationCount, 1);
  assert.ok(directionTwoMarkMotion.highlightHoverMaxDelayMs <= 60);
  assert.ok(directionTwoMarkMotion.highlightHoverShimmerMs < 500);
});

test("keeps direction two ambient gradient on the active style color", () => {
  assert.equal(directionTwoAmbientAtmosphere.background.includes("gradient"), true);
  assert.equal(directionTwoAmbientAtmosphere.background.includes("var(--color-signal"), true);
  assert.equal(directionTwoAmbientAtmosphere.mixBlendMode, "screen");
  assert.equal(directionTwoAmbientAtmosphere.signalColor, "var(--color-signal)");
  assert.equal(directionTwoAmbientAtmosphere.signalGlow, "var(--color-signal-glow)");
  assert.equal(directionTwoAmbientAtmosphere.background.includes("rgba(200, 255, 87"), false);
  assert.equal(JSON.stringify(directionTwoAmbientAtmosphere).includes("199, 146, 255"), false);
});

test("creates bounded ambient pixel data", () => {
  const values = [0.1, 0.2, 0.3, 0.4, 0.5];
  let index = 0;
  const pixels = createDirectionTwoAmbientPixels(() => values[index++ % values.length], { count: 2 });

  assert.equal(pixels.length, 2);
  assert.equal(pixels[0].id, "pixel-0");
  assert.equal(pixels[0].left % directionTwoAmbientConfig.gridStep, 0);
  assert.equal(pixels[0].top % directionTwoAmbientConfig.gridStep, 0);
  assert.ok([2, 3, 4].includes(pixels[0].size));
  assert.ok(pixels[0].driftX >= directionTwoAmbientConfig.driftXMin);
  assert.ok(pixels[0].driftX <= directionTwoAmbientConfig.driftXMax);
  assert.ok(pixels[0].driftY >= directionTwoAmbientConfig.driftYMin);
  assert.ok(pixels[0].driftY <= directionTwoAmbientConfig.driftYMax);
  assert.ok(pixels[0].opacity >= directionTwoAmbientConfig.minOpacity);
  assert.ok(pixels[0].opacity <= directionTwoAmbientConfig.maxOpacity);
  assert.ok(pixels[0].fieldDelay <= 0);
  assert.ok(pixels[0].glowDelay <= 0);
  assert.ok(pixels[0].fieldDuration >= directionTwoAmbientConfig.minDuration);
  assert.ok(pixels[0].fieldDuration <= directionTwoAmbientConfig.maxDuration);
  assert.equal("waveDelay" in pixels[0], false);
  assert.equal("sweepDuration" in pixels[0], false);
  assert.equal("shimmerDelay" in pixels[0], false);
});
