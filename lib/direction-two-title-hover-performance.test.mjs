import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const shellSource = readFileSync(new URL("../components/direction-two-shell.tsx", import.meta.url), "utf8");
const stylesSource = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const introSource = readFileSync(new URL("../lib/direction-two-intro.mjs", import.meta.url), "utf8");
const markCanvasSource = readFileSync(new URL("../lib/direction-two-mark-canvas.mjs", import.meta.url), "utf8");
const ambientSource = readFileSync(new URL("../components/direction-two-ambient-background.tsx", import.meta.url), "utf8");

test("sets the title hover state only once per pointer entry", () => {
  const pointerMoveStart = shellSource.indexOf("function handleMarkPointerMove(");
  const pointerOutStart = shellSource.indexOf("function handleMarkPointerOut(", pointerMoveStart);
  const pointerMoveBlock = shellSource.slice(pointerMoveStart, pointerOutStart);

  assert.match(shellSource, /const magnetActiveRef = useRef\(false\)/);
  assert.match(shellSource, /magnetActiveRef\.current = false;/);
  assert.match(
    pointerMoveBlock,
    /if \(!magnetActiveRef\.current\) \{\s*magnetActiveRef\.current = true;[\s\S]*mark\.setAttribute\("data-mark-magnet-active", "true"\);/s,
  );
  assert.equal(
    pointerMoveBlock.match(/setAttribute\("data-mark-magnet-active", "true"\)/g)?.length,
    1,
  );
});

test("mounts only the active viewport landing header after sync", () => {
  assert.match(shellSource, /const showMobileLanding = !hasViewportSync \|\| isMobileViewport/);
  assert.match(shellSource, /const showDesktopLanding = !hasViewportSync \|\| !isMobileViewport/);
  assert.match(shellSource, /\{showMobileLanding \? \(/);
  assert.match(shellSource, /\{showDesktopLanding \? \(/);
});

test("keeps the document keydown listener mounted once", () => {
  const keydownStart = shellSource.indexOf("const handleDocumentKeyDown = ");
  const keydownEffectEnd = shellSource.indexOf("}, []);", keydownStart);
  const keydownBlock = shellSource.slice(keydownStart, keydownEffectEnd + "}, []);".length);

  assert.match(keydownBlock, /cancelFlowRef\.current\(\)/);
  assert.match(keydownBlock, /focusInputRef\.current\(\)/);
  assert.match(keydownBlock, /\}, \[\]\);/);
});

test("renders the inkog mark on a single canvas surface", () => {
  assert.match(shellSource, /data-mark-canvas=""/);
  assert.match(shellSource, /drawDirectionTwoMark\(/);
  assert.match(shellSource, /buildDirectionTwoMarkLayout\(/);
  assert.match(shellSource, /<canvas[\s\S]*className="direction-two-mark-canvas/);
  assert.doesNotMatch(shellSource, /direction-two-mark-pixel-active/);
  assert.match(markCanvasSource, /mixDirectionTwoMarkHighlightColor\(/);
  assert.match(markCanvasSource, /shadowBlur/);
  assert.doesNotMatch(markCanvasSource, /createRadialGradient\(/);
});

test("limits title magnet work to the spatially indexed radius candidates", () => {
  assert.match(shellSource, /applyDirectionTwoMarkMagnetism\(/);
  assert.match(shellSource, /attachDirectionTwoMarkPixelCenters\(/);
  assert.match(markCanvasSource, /getDirectionTwoMarkMagnetCandidates\(/);
  assert.match(markCanvasSource, /distanceSquared >= radiusSquared/);
  assert.doesNotMatch(markCanvasSource, /querySelectorAll/);
});

test("follows the pointer directly while returning with a spring on leave", () => {
  const activeHoverStart = stylesSource.indexOf(
    '.direction-two-mark[data-mark-phase="interactive"][data-mark-magnet-active="true"]',
  );
  const activeHoverEnd = stylesSource.indexOf("}", activeHoverStart);
  const activeHoverBlock = stylesSource.slice(activeHoverStart, activeHoverEnd);

  assert.match(activeHoverBlock, /transition:\s*none/);
  assert.match(shellSource, /returnStartedAtRef/);
  assert.match(shellSource, /magnetSpringMs/);
});

test("uses a bright static highlight instead of a hover shimmer animation", () => {
  assert.doesNotMatch(stylesSource, /@keyframes direction-two-mark-hover-shimmer/);
  assert.match(markCanvasSource, /hoverHighlightColorMixPercent/);
  assert.match(markCanvasSource, /hoverHighlightBrightness/);
  assert.match(markCanvasSource, /hoverHighlightGlowRadius/);
  assert.match(shellSource, /"--direction-two-title-hover-highlight-duration":/);
  assert.match(shellSource, /"--direction-two-title-hover-highlight-delay":/);
});

test("exposes every title animation control through the development DialKit panels", () => {
  const animationConfigStart = shellSource.indexOf("const directionTwoTitleAnimationDialConfig");
  const hoverConfigStart = shellSource.indexOf("const directionTwoTitleHoverDialConfig");
  const configEnd = shellSource.indexOf("function percent", hoverConfigStart);
  const animationConfig = shellSource.slice(animationConfigStart, hoverConfigStart);
  const hoverConfig = shellSource.slice(hoverConfigStart, configEnd);

  for (const key of [
    "formationDurationMs",
    "formationSpreadMs",
    "shimmerDurationMs",
    "shimmerSpreadMs",
    "shimmerAmplitudeMs",
    "shimmerFrequency",
    "shimmerColorMixPercent",
    "shimmerPeakOpacity",
  ]) {
    assert.match(animationConfig, new RegExp(`${key}: \\[directionTwoTitleMotionDefaults\\.${key},`));
  }

  for (const key of [
    "radius",
    "strength",
    "maxDisplacement",
    "returnDurationMs",
    "colorMixPercent",
    "brightness",
    "glowRadius",
    "glowOpacity",
    "hoverShimmerDurationMs",
    "hoverShimmerMaxDelayMs",
    "easingX1",
    "easingY1",
    "easingX2",
    "easingY2",
  ]) {
    assert.match(hoverConfig, new RegExp(`${key}: \\[directionTwoTitleMotionDefaults\\.`));
  }
});

test("wires title hover duration, delay, and easing dials into the live style pipeline", () => {
  assert.match(shellSource, /hoverShimmerDurationMs: titleHoverSettings\.hoverShimmerDurationMs/);
  assert.match(shellSource, /hoverShimmerMaxDelayMs: titleHoverSettings\.hoverShimmerMaxDelayMs/);
  assert.match(shellSource, /hoverEasingX1: titleHoverSettings\.easingX1/);
  assert.match(shellSource, /hoverEasingY1: titleHoverSettings\.easingY1/);
  assert.match(shellSource, /hoverEasingX2: titleHoverSettings\.easingX2/);
  assert.match(shellSource, /hoverEasingY2: titleHoverSettings\.easingY2/);
  assert.match(shellSource, /"--direction-two-title-hover-easing": `cubic-bezier\(/);
  assert.match(shellSource, /titleMotionSettings\.hoverShimmerMaxDelayMs/);
});

test("uses the requested title hover DialKit defaults", () => {
  assert.match(introSource, /magnetRadius: 56/);
  assert.match(introSource, /magnetStrength: 0\.75/);
  assert.match(introSource, /magnetMaxDisplacement: 7/);
  assert.match(introSource, /magnetSpringMs: 260/);
  assert.match(introSource, /hoverHighlightColorMixPercent: 66/);
  assert.match(introSource, /hoverHighlightBrightness: 1\.35/);
  assert.match(introSource, /hoverHighlightGlowRadius: 10/);
  assert.match(introSource, /hoverHighlightGlowOpacity: 42/);
  assert.match(introSource, /hoverShimmerDurationMs: 240/);
  assert.match(introSource, /hoverShimmerMaxDelayMs: 0/);
  assert.match(introSource, /hoverEasingX1: 0\.23/);
  assert.match(introSource, /hoverEasingY1: 1/);
  assert.match(introSource, /hoverEasingX2: 0\.32/);
  assert.match(introSource, /hoverEasingY2: 1/);
  assert.match(shellSource, /radius: \[directionTwoTitleMotionDefaults\.magnetRadius, 24, 180, 2\]/);
  assert.match(shellSource, /hoverShimmerDurationMs: \[directionTwoTitleMotionDefaults\.hoverShimmerDurationMs, 240, 1800, 10\]/);
  assert.match(shellSource, /easingX2: \[directionTwoTitleMotionDefaults\.hoverEasingX2, 0, 1, 0\.01\]/);
});

test("draws the ambient pixel field on one canvas", () => {
  assert.match(ambientSource, /data-direction-two-ambient-canvas/);
  assert.match(ambientSource, /drawDirectionTwoAmbientPixels\(/);
  assert.doesNotMatch(ambientSource, /direction-two-ambient-pixel absolute/);
});
