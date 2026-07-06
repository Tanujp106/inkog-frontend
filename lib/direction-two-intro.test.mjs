import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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

test("keeps same-size privacy icon patterns available for reuse", () => {
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

test("keeps direction two mark hover smooth and distinct from small icon shimmer", () => {
  assert.equal(directionTwoMarkMotion.iconFlipDelayMs, 0);
  assert.equal(directionTwoMarkMotion.iconSwapDurationMs, 300);
  assert.equal(directionTwoMarkMotion.introShimmerIterationCount, 0);
  assert.equal(directionTwoMarkMotion.hoverShimmerIterationCount, 1);
  assert.ok(directionTwoMarkMotion.hoverShimmerMs > directionTwoMarkMotion.highlightHoverShimmerMs);
  assert.ok(directionTwoMarkMotion.hoverShimmerMs >= 900);
  assert.ok(directionTwoMarkMotion.markHoverMaxDelayMs <= 120);
  assert.ok(directionTwoMarkMotion.highlightHoverShimmerMs >= 900);
  assert.ok(directionTwoMarkMotion.highlightHoverMaxDelayMs <= 48);
});

test("uses gentle shimmer keyframes for mark and highlight hover", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  const shell = readFileSync(new URL("../components/direction-two-shell.tsx", import.meta.url), "utf8");

  assert.match(css, /@keyframes direction-two-mark-hover-shimmer/);
  assert.match(
    css,
    /@keyframes direction-two-mark-hover-shimmer \{\s*0% \{\s*background-color: var\(--foreground\);/s,
  );
  assert.match(
    css,
    /28% \{\s*background-color: color-mix\(in srgb, var\(--foreground\) 82%, var\(--color-signal\) 18%\);/s,
  );
  assert.match(
    css,
    /54% \{\s*background-color: color-mix\(in srgb, var\(--foreground\) 58%, var\(--color-signal\) 42%\);/s,
  );
  assert.match(css, /@keyframes direction-two-highlight-soft-shimmer/);
  assert.match(css, /@keyframes direction-two-title-shimmer/);
  assert.match(
    css,
    /@keyframes direction-two-highlight-soft-shimmer \{\s*0% \{[\s\S]*50% \{[\s\S]*100% \{/s,
  );
  assert.match(
    css,
    /@keyframes direction-two-title-shimmer \{\s*0% \{[\s\S]*46% \{[\s\S]*78% \{[\s\S]*100% \{/s,
  );
  assert.doesNotMatch(css, /@keyframes direction-two-highlight-soft-shimmer \{[\s\S]*42% \{/);
  assert.doesNotMatch(css, /@keyframes direction-two-highlight-soft-shimmer \{[\s\S]*68% \{/);
  assert.match(
    css,
    /\.direction-two-intro-row:hover \.direction-two-highlight-pixel-active \{\s*animation: direction-two-highlight-soft-shimmer/s,
  );
  assert.match(
    css,
    /\.direction-two-mark-shimmering \.direction-two-mark-word \.direction-two-mark-pixel-active \{\s*animation: direction-two-title-shimmer/s,
  );
  assert.doesNotMatch(shell, /direction-two-mark-icon/);
  assert.doesNotMatch(shell, /InkPatternIconLayer/);
  assert.doesNotMatch(css, /direction-two-mark-symbol/);
  assert.match(
    css,
    /\.direction-two-mark-word\.direction-two-mark-layer-entering \.direction-two-mark-pixel-active \{\s*animation:\s*direction-two-mark-pixel-resolve/s,
  );
  assert.doesNotMatch(css, /direction-two-mark-word\.direction-two-mark-layer-entering[\s\S]*direction-two-mark-soft-shimmer/);
  assert.doesNotMatch(css, /\.direction-two-intro-row:hover \.direction-two-highlight-pixel-active \{\s*animation: direction-two-mark-shimmer/s);
});

test("keeps desktop direction two intro spacing aligned with feedback", () => {
  const shell = readFileSync(new URL("../components/direction-two-shell.tsx", import.meta.url), "utf8");

  assert.match(shell, /<p className="direction-two-intro-copy pt-2">/);
  assert.match(shell, /<p className="direction-two-intro-copy pt-5">/);
  assert.match(shell, /<div className="space-y-6 pt-8 text-\[12px\] leading-\[18px\]/);
});

test("scrambles direction two USP text with the same arrival treatment as the intro copy", () => {
  const shell = readFileSync(new URL("../components/direction-two-shell.tsx", import.meta.url), "utf8");

  assert.match(shell, /function DirectionTwoIntroRow\(/);
  assert.match(shell, /const displayText = useDirectionTwoScrambleText\(text,/);
  assert.match(shell, /durationMs: introScrambleDurationMs/);
  assert.match(shell, /startDelayMs,/);
  assert.match(shell, /disabled: reducedMotion/);
  assert.match(shell, /<span>\{displayText\}<\/span>/);
  assert.match(shell, /text=\{item\.mobileText\}/);
  assert.match(shell, /text=\{item\.text\}/);
});

test("keeps Direction 2 shimmer static without DialKit on the landing page", () => {
  const packageJson = readFileSync(new URL("../package.json", import.meta.url), "utf8");
  const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
  const shell = readFileSync(new URL("../components/direction-two-shell.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.doesNotMatch(packageJson, /"dialkit"/);
  assert.doesNotMatch(layout, /dialkit/);
  assert.doesNotMatch(layout, /PlaygroundDialRoot/);
  assert.doesNotMatch(shell, /useDialKit/);
  assert.doesNotMatch(shell, /directionTwoShimmerDialConfig/);
  assert.doesNotMatch(shell, /shimmerDials/);
  assert.match(shell, /defaultDirectionTwoShimmerSettings/);
  assert.match(shell, /durationMs: 1040/);
  assert.match(shell, /delayMaxMs: 120/);
  assert.match(shell, /transitionMs: 360/);
  assert.match(shell, /burstTailMs: 120/);
  assert.match(shell, /titleDurationMs: 660/);
  assert.match(shell, /titleDelayMaxMs: 280/);
  assert.match(shell, /titleBurstTailMs: 130/);
  assert.match(shell, /colorMixPercent: 38/);
  assert.match(shell, /titleColorMixPercent: 62/);
  assert.match(shell, /"--direction-two-shimmer-peak-opacity"/);
  assert.match(shell, /"--direction-two-shimmer-halo-radius"/);
  assert.match(shell, /"--direction-two-shimmer-color-mix"/);
  assert.match(shell, /"--direction-two-title-shimmer-duration"/);
  assert.match(shell, /"--direction-two-title-shimmer-color-mix"/);
  assert.match(shell, /shimmerDelayMaxMs/);
  assert.match(css, /var\(--direction-two-shimmer-peak-opacity/);
  assert.match(css, /var\(--direction-two-shimmer-halo-opacity/);
  assert.match(css, /var\(--direction-two-shimmer-color-mix/);
  assert.match(css, /var\(--direction-two-title-shimmer-color-mix/);
});

test("keeps direction two shimmer intense without scale or lift motion", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  const shell = readFileSync(new URL("../components/direction-two-shell.tsx", import.meta.url), "utf8");
  const shimmerStart = css.indexOf("@keyframes direction-two-highlight-soft-shimmer");
  const shimmerEnd = css.indexOf("@keyframes direction-two-input-stagger", shimmerStart);
  const shimmerBlock = css.slice(shimmerStart, shimmerEnd);
  const iconHoverStart = css.indexOf(".direction-two-intro-row:hover .direction-two-highlight-icon");
  const iconHoverEnd = css.indexOf("}", iconHoverStart);
  const iconHoverBlock = css.slice(iconHoverStart, iconHoverEnd);

  assert.ok(directionTwoMarkMotion.markHoverMaxDelayMs >= 120);
  assert.ok(directionTwoMarkMotion.highlightHoverMaxDelayMs >= 48);
  assert.match(shell, /peakBrightness: 1\.16/);
  assert.match(shell, /signalRadius: 4/);
  assert.match(shell, /haloRadius: 11/);
  assert.match(shell, /signalOpacity: 38/);
  assert.match(shell, /haloOpacity: 46/);
  assert.match(shell, /titlePeakBrightness: 1\.34/);
  assert.match(shell, /titleSignalRadius: 6/);
  assert.match(shell, /titleHaloRadius: 16/);
  assert.match(shell, /titleSignalOpacity: 58/);
  assert.match(shell, /titleHaloOpacity: 64/);
  assert.doesNotMatch(shell, /peakScale/);
  assert.doesNotMatch(shimmerBlock, /transform:\s*scale/);
  assert.doesNotMatch(iconHoverBlock, /transform:/);
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

test("keeps the ambient pixel field lightweight", () => {
  assert.equal(directionTwoAmbientConfig.count, 28);
  assert.ok(directionTwoAmbientConfig.minDuration >= 12);
  assert.ok(directionTwoAmbientConfig.maxOpacity <= 0.18);
});

test("does not animate expensive ambient pixel paint properties", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  const ambientPixelGlowMatch = css.match(/@keyframes direction-two-ambient-pixel-glow \{([\s\S]*?)\n\}/);
  const ambientCoreMatch = css.match(/\.direction-two-ambient-pixel-core \{([\s\S]*?)\n\}/);

  assert.equal(ambientPixelGlowMatch, null);
  assert.ok(ambientCoreMatch);
  assert.equal(ambientCoreMatch[1].includes("filter:"), false);
  assert.equal(ambientCoreMatch[1].includes("box-shadow"), false);
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
