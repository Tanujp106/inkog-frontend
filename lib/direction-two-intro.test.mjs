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
    formationDurationMs: 520,
    formationSpreadMs: 550,
    shimmerDurationMs: 560,
    shimmerSpreadMs: 490,
    shimmerAmplitudeMs: 72,
    shimmerFrequency: 1,
    shimmerColorMixPercent: 60,
    shimmerPeakOpacity: 1,
    hoverHighlightColorMixPercent: 66,
    hoverHighlightBrightness: 1.35,
    hoverHighlightGlowRadius: 10,
    hoverHighlightGlowOpacity: 42,
    magnetRadius: 56,
    magnetStrength: 0.75,
    magnetMaxDisplacement: 7,
    magnetSpringMs: 260,
    hoverShimmerDurationMs: 240,
    hoverShimmerMaxDelayMs: 0,
    hoverEasingX1: 0.23,
    hoverEasingY1: 1,
    hoverEasingX2: 0.32,
    hoverEasingY2: 1,
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
  assert.match(shell, /\[--cell:clamp\(3\.8px,1vw,4\.3px\)\] \[--gap:1px\] \[--letter-gap:4px\]/);
  assert.match(shell, /\[--cell:clamp\(4\.4px,0\.62vw,7\.8px\)\] \[--gap:clamp\(1px,0\.14vw,2\.2px\)\] \[--letter-gap:clamp\(5\.5px,0\.5vw,10px\)\]/);
});

test("keeps direction two mark hover as a bright static magnetic highlight", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  const shell = readFileSync(new URL("../components/direction-two-shell.tsx", import.meta.url), "utf8");
  const markCanvas = readFileSync(new URL("../lib/direction-two-mark-canvas.mjs", import.meta.url), "utf8");

  assert.equal(directionTwoMarkMotion.iconFlipDelayMs, 0);
  assert.equal(directionTwoMarkMotion.iconSwapDurationMs, 300);
  assert.equal(directionTwoMarkMotion.introShimmerIterationCount, 0);
  assert.equal(directionTwoTitleMotionDefaults.hoverShimmerDurationMs, 240);
  assert.equal(directionTwoTitleMotionDefaults.hoverShimmerMaxDelayMs, 0);
  assert.doesNotMatch(css, /@keyframes direction-two-mark-hover-shimmer/);
  assert.match(markCanvas, /mixDirectionTwoMarkHighlightColor\(/);
  assert.match(markCanvas, /hoverHighlightBrightness/);
  assert.match(markCanvas, /shadowBlur/);
  assert.doesNotMatch(markCanvas, /createRadialGradient\(/);
  assert.match(shell, /data-mark-magnet-active/);
  assert.match(shell, /data-mark-canvas/);
  assert.match(shell, /data-mark-metric-probe/);
  assert.match(shell, /measure\("var\(--cell\)"/);
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
  const shell = readFileSync(new URL("../components/direction-two-shell.tsx", import.meta.url), "utf8");
  const markCanvas = readFileSync(new URL("../lib/direction-two-mark-canvas.mjs", import.meta.url), "utf8");

  assert.match(shell, /type DirectionTwoTitlePhase = "forming" \| "shimmering" \| "interactive"/);
  assert.match(shell, /data-mark-phase=\{phase\}/);
  assert.match(markCanvas, /getDirectionTwoFormationDelay\(/);
  assert.match(markCanvas, /getDirectionTwoSineShimmerDelay\(/);
  assert.match(markCanvas, /getDirectionTwoMarkFormationOpacity\(/);
  assert.match(markCanvas, /getDirectionTwoMarkShimmerMix\(/);
  assert.match(markCanvas, /phase === "forming"/);
  assert.match(markCanvas, /phase === "shimmering"/);
  assert.doesNotMatch(shell, /direction-two-mark-shimmering|triggerMarkShimmer/);
});

test("updates local title magnetism in one pointer animation frame", () => {
  const shell = readFileSync(new URL("../components/direction-two-shell.tsx", import.meta.url), "utf8");
  const markCanvas = readFileSync(new URL("../lib/direction-two-mark-canvas.mjs", import.meta.url), "utf8");

  assert.match(shell, /const markRef = useRef<HTMLDivElement \| null>\(null\)/);
  assert.match(shell, /const magnetFrameRef = useRef<number \| null>\(null\)/);
  assert.match(shell, /if \(event\.pointerType === "touch"/);
  assert.match(shell, /data-mark-magnet-active/);
  assert.match(shell, /window\.requestAnimationFrame\(applyMarkMagnetism\)/);
  assert.match(markCanvas, /getDirectionTwoMagnetOffset\(/);
  assert.match(shell, /applyDirectionTwoMarkMagnetism\(/);
  assert.match(shell, /onPointerMove=\{handleMarkPointerMove\}/);
  assert.match(shell, /onPointerLeave=\{resetMarkMagnetism\}/);
  assert.match(shell, /onPointerOut=\{handleMarkPointerOut\}/);
  assert.match(shell, /event\.currentTarget\.contains\(event\.relatedTarget as Node\)/);
  assert.match(shell, /drawDirectionTwoMark\(/);
});

test("keeps mark magnetism from rereading layout and repainting every hover frame", () => {
  const shell = readFileSync(new URL("../components/direction-two-shell.tsx", import.meta.url), "utf8");
  const markCanvas = readFileSync(new URL("../lib/direction-two-mark-canvas.mjs", import.meta.url), "utf8");

  assert.match(shell, /attachDirectionTwoMarkPixelCenters\(/);
  assert.match(shell, /magnetRecordsRef/);
  assert.match(shell, /magnetGridRef/);
  assert.match(markCanvas, /getDirectionTwoMarkMagnetCandidates\(/);
  assert.doesNotMatch(shell, /querySelectorAll/);
  assert.doesNotMatch(markCanvas, /getBoundingClientRect/);
  assert.match(markCanvas, /mixDirectionTwoMarkHighlightColor\(/);
});

test("keeps desktop direction two intro spacing aligned with feedback", () => {
  const shell = readFileSync(new URL("../components/direction-two-shell.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(shell, /<p[\s\S]*className="direction-two-intro-copy pt-2 text-\[12px\] leading-\[18px\]"/);
  assert.match(shell, /const introCopyRevealDelayMs = 500;/);
  assert.match(shell, /const introHighlightsRevealDelayMs = 600;/);
  assert.match(shell, /const introHighlightsStaggerMs = 100;/);
  assert.match(shell, /animationDelay: `\$\{prefersReducedMotion \? 0 : introCopyRevealDelayMs\}ms`/);
  assert.match(shell, /startDelayMs=\{introHighlightsRevealDelayMs \+ index \* introHighlightsStaggerMs\}/);
  assert.match(shell, /<p[\s\S]*className="direction-two-intro-copy pt-5"/);
  assert.match(shell, /<div className="space-y-\[20px\] pt-8 text-\[12px\] leading-\[18px\]/);
  assert.match(css, /@keyframes direction-two-copy-reveal[\s\S]*from \{[\s\S]*transform: translateY\(4px\)/);
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

test("exposes DialKit controls for the development-only composer motion", () => {
  const packageJson = readFileSync(new URL("../package.json", import.meta.url), "utf8");
  const lockfile = readFileSync(new URL("../package-lock.json", import.meta.url), "utf8");
  const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
  const shell = readFileSync(new URL("../components/direction-two-shell.tsx", import.meta.url), "utf8");

  assert.match(packageJson, /"dialkit": "\^1\.4\.3"/);
  assert.match(lockfile, /node_modules\/dialkit/);
  assert.match(layout, /import \{ DialRoot \} from "dialkit"/);
  assert.match(layout, /import "dialkit\/styles\.css"/);
  assert.match(layout, /process\.env\.NODE_ENV === "development" && <DialRoot/);
  assert.match(shell, /useDialKit/);
  assert.match(shell, /id: "inkog-composer-entrance"/);
  assert.match(shell, /id: "inkog-composer-glow"/);
  assert.match(shell, /distancePx: \[8, 0, 24\]/);
  assert.match(shell, /delayMs: \[250, 0, 900\]/);
  assert.match(shell, /durationMs: \[830, 250, 1200\]/);
  assert.match(shell, /opacity: \[0\.3, 0, 0\.9\]/);
  assert.match(shell, /blurPx: \[8, 0, 24\]/);
  assert.match(shell, /easingX1: \[0\.22, 0, 1\]/);
  assert.match(shell, /easingY1: \[1, 0, 1\]/);
  assert.match(shell, /easingX2: \[0\.36, 0, 1\]/);
  assert.match(shell, /easingY2: \[1, 0, 1\]/);
  assert.match(shell, /--direction-two-composer-entry-distance/);
  assert.match(shell, /--direction-two-composer-glow-duration/);
  assert.match(shell, /direction-two-composer-entry/);
  assert.match(shell, /direction-two-composer-glow/);
  assert.match(shell, /titleMotionSettings=\{titleMotionSettings\}/);
  assert.match(shell, /const defaultDirectionTwoShimmerSettings/);
  assert.match(shell, /durationMs: 380/);
  assert.match(shell, /delayMaxMs: 350/);
  assert.match(shell, /transitionMs: 880/);
  assert.match(shell, /burstTailMs: 420/);
});

test("exposes DialKit controls for title animation and hover", () => {
  const shell = readFileSync(new URL("../components/direction-two-shell.tsx", import.meta.url), "utf8");

  assert.match(shell, /id: "inkog-title-animation"/);
  assert.match(shell, /id: "inkog-title-hover"/);
  assert.match(shell, /formationDurationMs: \[directionTwoTitleMotionDefaults\.formationDurationMs, 120, 900, 10\]/);
  assert.match(shell, /formationSpreadMs: \[directionTwoTitleMotionDefaults\.formationSpreadMs, 120, 1200, 10\]/);
  assert.match(shell, /shimmerDurationMs: \[directionTwoTitleMotionDefaults\.shimmerDurationMs, 240, 1600, 10\]/);
  assert.match(shell, /shimmerSpreadMs: \[directionTwoTitleMotionDefaults\.shimmerSpreadMs, 120, 1400, 10\]/);
  assert.match(shell, /shimmerAmplitudeMs: \[directionTwoTitleMotionDefaults\.shimmerAmplitudeMs, 0, 240, 2\]/);
  assert.match(shell, /shimmerFrequency: \[directionTwoTitleMotionDefaults\.shimmerFrequency, 0\.25, 3, 0\.05\]/);
  assert.match(shell, /shimmerColorMixPercent: \[directionTwoTitleMotionDefaults\.shimmerColorMixPercent, 0, 100, 1\]/);
  assert.match(shell, /shimmerPeakOpacity: \[directionTwoTitleMotionDefaults\.shimmerPeakOpacity, 0, 1, 0\.05\]/);
  assert.match(shell, /radius: \[directionTwoTitleMotionDefaults\.magnetRadius, 24, 180, 2\]/);
  assert.match(shell, /strength: \[directionTwoTitleMotionDefaults\.magnetStrength, 0\.1, 2, 0\.05\]/);
  assert.match(shell, /maxDisplacement: \[directionTwoTitleMotionDefaults\.magnetMaxDisplacement, 0, 16, 0\.5\]/);
  assert.match(shell, /returnDurationMs: \[directionTwoTitleMotionDefaults\.magnetSpringMs, 60, 500, 10\]/);
  assert.match(shell, /colorMixPercent: \[directionTwoTitleMotionDefaults\.hoverHighlightColorMixPercent, 0, 100, 1\]/);
  assert.match(shell, /--direction-two-title-shimmer-peak-opacity/);
  assert.match(shell, /--direction-two-title-hover-highlight-color-mix/);
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

  assert.equal(directionTwoTitleMotionDefaults.hoverShimmerMaxDelayMs, 0);
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
  const ambientCanvas = readFileSync(new URL("../lib/direction-two-ambient-canvas.mjs", import.meta.url), "utf8");
  const ambient = readFileSync(new URL("../components/direction-two-ambient-background.tsx", import.meta.url), "utf8");

  assert.match(ambient, /drawDirectionTwoAmbientPixels\(/);
  assert.match(ambientCanvas, /fillRect\(/);
  assert.equal(ambientCanvas.includes("filter:"), false);
  assert.equal(ambientCanvas.includes("box-shadow"), false);
  assert.equal(ambientCanvas.includes("will-change:"), false);
});

test("pauses ambient field motion while the document is hidden", () => {
  const ambient = readFileSync(new URL("../components/direction-two-ambient-background.tsx", import.meta.url), "utf8");

  assert.match(ambient, /data-ambient-paused=\{isAmbientPaused \|\| undefined\}/);
  assert.match(ambient, /visibilitychange/);
  assert.match(ambient, /isAmbientPaused/);
  assert.match(ambient, /drawDirectionTwoAmbientPixels\(/);
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
