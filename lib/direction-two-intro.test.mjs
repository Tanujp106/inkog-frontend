import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildDirectionTwoMarkPattern,
  buildDirectionTwoPixelWord,
  createDirectionTwoAmbientPixels,
  createDirectionTwoAmbientRandom,
  directionTwoBrandLabels,
  directionTwoAmbientConfig,
  directionTwoAmbientAtmosphere,
  directionTwoMarkMotion,
  directionTwoTitleMotionDefaults,
  directionTwoMarkIcons,
  directionTwoMarkSlotCount,
  directionTwoMarkWords,
  getDirectionTwoFormationDelay,
  getDirectionTwoMagnetOffset,
  getDirectionTwoScrambleFrame,
  getDirectionTwoSineShimmerDelay,
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

test("forms every title row with the same strict left-to-right column timing", () => {
  assert.deepEqual(
    [0, 1, 2, 3].map(column => getDirectionTwoFormationDelay(column, 4, 300)),
    [0, 100, 200, 300],
  );
  assert.equal(getDirectionTwoFormationDelay(2, 1, 300), 0);
});

test("derives a deterministic sine crest from global title coordinates", () => {
  assert.equal(getDirectionTwoSineShimmerDelay(0, 0, 5, 5, 400, 40, 1), 20);
  assert.equal(getDirectionTwoSineShimmerDelay(2, 1, 5, 5, 400, 40, 1), 210);

});

test("keeps magnetic attraction local and caps its displacement", () => {
  assert.deepEqual(
    getDirectionTwoMagnetOffset(50, 50, 60, 50, 40, 1, 6),
    { x: 6, y: 0 },
  );
  assert.deepEqual(
    getDirectionTwoMagnetOffset(0, 0, 100, 100, 40, 1, 6),
    { x: 0, y: 0 },
  );
  assert.deepEqual(
    getDirectionTwoMagnetOffset(50, 50, 50, 50, 40, 1, 6),
    { x: 0, y: 0 },
  );
});

test("provides stable defaults for the title motion pipeline", () => {
  assert.deepEqual(directionTwoTitleMotionDefaults, {
    formationDurationMs: 730,
    formationSpreadMs: 420,
    formationPeakBrightness: 1.55,
    shimmerDurationMs: 780,
    shimmerSpreadMs: 520,
    shimmerAmplitudeMs: 72,
    shimmerFrequency: 1,
    shimmerColorMixPercent: 46,
    shimmerPeakBrightness: 1.65,
    shimmerGlowRadius: 14,
    shimmerGlowOpacity: 46,
    magnetRadius: 48,
    magnetStrength: 1,
    magnetMaxDisplacement: 7.5,
    magnetSpringMs: 190,
  });
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
  const shell = readFileSync(new URL("../components/direction-two-shell.tsx", import.meta.url), "utf8");

  assert.equal(directionTwoMarkSlotCount, 5);
  assert.equal(pattern.length, 5);
  assert.match(shell, /\[--cell:clamp\(3\.2px,0\.84vw,3\.6px\)\] \[--gap:1px\] \[--letter-gap:4px\]/);
  assert.match(shell, /\[--cell:clamp\(4\.4px,0\.62vw,7\.8px\)\] \[--gap:clamp\(1px,0\.14vw,2\.2px\)\] \[--letter-gap:clamp\(5\.5px,0\.5vw,10px\)\]/);
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

test("keeps the small highlight hover on its gentle shimmer", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(css, /@keyframes direction-two-highlight-soft-shimmer/);
  assert.match(
    css,
    /@keyframes direction-two-highlight-soft-shimmer \{\s*0% \{[\s\S]*50% \{[\s\S]*100% \{/s,
  );
  assert.doesNotMatch(css, /@keyframes direction-two-highlight-soft-shimmer \{[\s\S]*42% \{/);
  assert.doesNotMatch(css, /@keyframes direction-two-highlight-soft-shimmer \{[\s\S]*68% \{/);
  assert.match(
    css,
    /\.direction-two-intro-row:hover \.direction-two-highlight-pixel-active \{\s*animation: direction-two-highlight-soft-shimmer/s,
  );
  assert.doesNotMatch(css, /\.direction-two-intro-row:hover \.direction-two-highlight-pixel-active \{\s*animation: direction-two-mark-shimmer/s);
});

test("separates strict title formation from the one-shot sine shimmer", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  const shell = readFileSync(new URL("../components/direction-two-shell.tsx", import.meta.url), "utf8");
  const formStart = css.indexOf("@keyframes direction-two-mark-form");
  const formEnd = css.indexOf("@keyframes direction-two-mark-sine-shimmer", formStart);
  const shimmerEnd = css.indexOf("@keyframes direction-two-input-stagger", formEnd);
  const formBlock = css.slice(formStart, formEnd);
  const shimmerBlock = css.slice(formEnd, shimmerEnd);

  assert.match(shell, /type DirectionTwoTitlePhase = "forming" \| "shimmering" \| "interactive"/);
  assert.match(shell, /data-mark-phase=\{phase\}/);
  assert.match(shell, /getDirectionTwoFormationDelay\(/);
  assert.match(shell, /getDirectionTwoSineShimmerDelay\(/);
  assert.match(css, /@keyframes direction-two-mark-form/);
  assert.match(css, /@keyframes direction-two-mark-sine-shimmer/);
  assert.match(css, /\[data-mark-phase="forming"\][\s\S]*direction-two-mark-form/);
  assert.match(css, /\[data-mark-phase="shimmering"\][\s\S]*direction-two-mark-sine-shimmer/);
  assert.doesNotMatch(formBlock, /transform:|blur\(|box-shadow:/);
  assert.doesNotMatch(shimmerBlock, /transform:/);
  assert.doesNotMatch(css, /direction-two-mark-layer-enter|direction-two-mark-pixel-resolve/);
  assert.doesNotMatch(shell, /direction-two-mark-shimmering|triggerMarkShimmer/);
});

test("updates local title magnetism in one pointer animation frame", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  const shell = readFileSync(new URL("../components/direction-two-shell.tsx", import.meta.url), "utf8");

  assert.match(shell, /const markRef = useRef<HTMLDivElement \| null>\(null\)/);
  assert.match(shell, /const magnetFrameRef = useRef<number \| null>\(null\)/);
  assert.match(shell, /if \(event\.pointerType === "touch"/);
  assert.match(shell, /data-mark-magnet-active/);
  assert.match(shell, /window\.requestAnimationFrame\(applyMarkMagnetism\)/);
  assert.match(shell, /getDirectionTwoMagnetOffset\(/);
  assert.match(shell, /style\.setProperty\("--mark-magnet-x"/);
  assert.match(shell, /style\.setProperty\("--mark-magnet-y"/);
  assert.match(shell, /onPointerMove=\{handleMarkPointerMove\}/);
  assert.match(shell, /onPointerLeave=\{resetMarkMagnetism\}/);
  assert.match(shell, /onPointerOut=\{handleMarkPointerOut\}/);
  assert.match(shell, /event\.currentTarget\.contains\(event\.relatedTarget as Node\)/);
  assert.match(css, /\.direction-two-mark\[data-mark-phase="interactive"\][\s\S]*translate3d\(/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.direction-two-mark-pixel-active/);
});

test("keeps desktop direction two intro spacing aligned with feedback", () => {
  const shell = readFileSync(new URL("../components/direction-two-shell.tsx", import.meta.url), "utf8");

  assert.match(shell, /<p className="direction-two-intro-copy pt-2">/);
  assert.match(shell, /<p className="direction-two-intro-copy pt-5">/);
  assert.match(shell, /<div className="space-y-\[20px\] pt-8 text-\[12px\] leading-\[18px\]/);
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

test("mounts one development-only DialKit panel on the title motion defaults", () => {
  const packageJson = readFileSync(new URL("../package.json", import.meta.url), "utf8");
  const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
  const shell = readFileSync(new URL("../components/direction-two-shell.tsx", import.meta.url), "utf8");

  assert.match(packageJson, /"dialkit": "\^1\.4\.3"/);
  assert.match(layout, /import \{ DialRoot \} from "dialkit"/);
  assert.match(layout, /import "dialkit\/styles\.css"/);
  assert.match(
    layout,
    /\{process\.env\.NODE_ENV === "development" && <DialRoot \/>\}/,
  );
  assert.match(shell, /import \{ useDialKit, type DialConfig \} from "dialkit"/);
  assert.match(shell, /const directionTwoTitleDialConfig = \{/);
  assert.match(shell, /formation: \{/);
  assert.match(shell, /shimmer: \{/);
  assert.match(shell, /magnet: \{/);
  assert.match(shell, /\} satisfies DialConfig/);
  assert.match(shell, /useDialKit\(\s*"INKOG title motion"/);
  assert.match(shell, /id: "inkog-title-motion"/);
  assert.match(shell, /titleMotionSettings=\{titleMotionSettings\}/);
  assert.match(shell, /const defaultDirectionTwoShimmerSettings/);
  assert.match(shell, /durationMs: 380/);
  assert.match(shell, /delayMaxMs: 350/);
  assert.match(shell, /transitionMs: 880/);
  assert.match(shell, /burstTailMs: 420/);
});

test("keeps the small highlight shimmer intense without scale or lift motion", () => {
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
  assert.match(shell, /signalRadius: 21/);
  assert.match(shell, /haloRadius: 11/);
  assert.match(shell, /signalOpacity: 38/);
  assert.match(shell, /haloOpacity: 46/);
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

test("creates the same ambient pixel sequence for the same seed", () => {
  const first = createDirectionTwoAmbientPixels(createDirectionTwoAmbientRandom(42), { count: 3 });
  const second = createDirectionTwoAmbientPixels(createDirectionTwoAmbientRandom(42), { count: 3 });

  assert.deepEqual(second, first);
});
