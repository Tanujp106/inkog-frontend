import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const shellSource = readFileSync(new URL("../components/direction-two-shell.tsx", import.meta.url), "utf8");
const stylesSource = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

test("sets the title hover state only once per pointer entry", () => {
  const shell = shellSource;
  const pointerMoveStart = shell.indexOf("function handleMarkPointerMove(");
  const pointerOutStart = shell.indexOf("function handleMarkPointerOut(", pointerMoveStart);
  const pointerMoveBlock = shell.slice(pointerMoveStart, pointerOutStart);

  assert.match(shell, /const magnetActiveRef = useRef<boolean>\(false\)/);
  assert.match(shell, /magnetActiveRef\.current = false;/);
  assert.match(
    pointerMoveBlock,
    /if \(!magnetActiveRef\.current\) \{\s*magnetActiveRef\.current = true;\s*markRef\.current\?\.setAttribute\("data-mark-magnet-active", "true"\);\s*\}/s,
  );
  assert.equal(
    pointerMoveBlock.match(/markRef\.current\?\.setAttribute\("data-mark-magnet-active", "true"\)/g)?.length,
    1,
  );
});

test("limits title magnet work to the spatially indexed radius candidates", () => {
  const applyStart = shellSource.indexOf("function applyMarkMagnetism()");
  const pointerMoveStart = shellSource.indexOf("function handleMarkPointerMove(", applyStart);
  const applyBlock = shellSource.slice(applyStart, pointerMoveStart);

  assert.match(shellSource, /const markPixelGridRef = useRef<Map<string, MarkPixelRecord\[\]>>\(new Map\(\)\)/);
  assert.match(shellSource, /function getMarkMagnetCandidates\(/);
  assert.match(applyBlock, /const candidates = getMarkMagnetCandidates\(/);
  assert.match(applyBlock, /const distanceSquared = deltaX \* deltaX \+ deltaY \* deltaY;/);
  assert.match(applyBlock, /if \(distanceSquared >= radiusSquared\)/);
  assert.doesNotMatch(applyBlock, /for \(const record of markPixelCentersRef\.current\)/);
});

test("uses interruptible easing while the title follows the pointer", () => {
  const activeHoverStart = stylesSource.indexOf(
    '.direction-two-mark[data-mark-phase="interactive"][data-mark-magnet-active="true"]',
  );
  const activeHoverEnd = stylesSource.indexOf("}", activeHoverStart);
  const activeHoverBlock = stylesSource.slice(activeHoverStart, activeHoverEnd);

  assert.match(activeHoverBlock, /transition:\s*transform 72ms var\(--ease-out-strong\)/);
  assert.doesNotMatch(activeHoverBlock, /transition:\s*none/);
});

test("restores the title hover shine without filter or shadow paint", () => {
  const shineStart = stylesSource.indexOf("@keyframes direction-two-mark-hover-shimmer");
  const shineEnd = stylesSource.indexOf("@keyframes direction-two-highlight-soft-shimmer", shineStart);
  const shineBlock = stylesSource.slice(shineStart, shineEnd);

  assert.notEqual(shineStart, -1);
  assert.match(shineBlock, /background-color:/);
  assert.match(shineBlock, /opacity:/);
  assert.doesNotMatch(shineBlock, /filter:|box-shadow:/);
  assert.match(
    stylesSource,
    /\.direction-two-mark\[data-mark-phase="interactive"\]\[data-mark-magnet-active="true"\] \.direction-two-mark-pixel-active \{[\s\S]*direction-two-mark-hover-shimmer/,
  );
  assert.match(shellSource, /"--direction-two-title-hover-shimmer-duration":/);
  assert.match(shellSource, /"--mark-hover-delay":/);
});
