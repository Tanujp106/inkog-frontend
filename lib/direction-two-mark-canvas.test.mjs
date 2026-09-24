import assert from "node:assert/strict";
import test from "node:test";

import { directionTwoTitleMotionDefaults } from "./direction-two-intro.mjs";
import {
  applyDirectionTwoMarkMagnetism,
  attachDirectionTwoMarkPixelCenters,
  buildDirectionTwoMarkLayout,
  createDensePixelPattern,
  directionTwoMarkDensity,
  getDirectionTwoMarkFormationOpacity,
  getDirectionTwoMarkMagnetCandidates,
  getDirectionTwoMarkShimmerMix,
  mixDirectionTwoMarkHighlightColor,
  parseCssRgbColor,
  resetDirectionTwoMarkMagnetism,
  resolveDirectionTwoMarkDpr,
} from "./direction-two-mark-canvas.mjs";

test("expands mark patterns with the shared density", () => {
  assert.equal(directionTwoMarkDensity, 2);
  assert.deepEqual(createDensePixelPattern(["10", "01"], 2), [
    "1100",
    "1100",
    "0011",
    "0011",
  ]);
});

test("builds a dense canvas layout for the inkog mark", () => {
  const layout = buildDirectionTwoMarkLayout("inkog", {
    cellSize: 6,
    gap: 2,
    letterGap: 8,
    motionSettings: directionTwoTitleMotionDefaults,
  });

  assert.ok(layout.width > 0);
  assert.ok(layout.height > 0);
  assert.ok(layout.pixels.length > 100);
  assert.ok(layout.pixels.some(pixel => pixel.active));
  assert.ok(layout.pixels.some(pixel => !pixel.active));
  assert.ok(layout.pixels.every(pixel => Number.isFinite(pixel.formationDelay)));
  assert.ok(layout.pixels.every(pixel => Number.isFinite(pixel.shimmerDelay)));
});

test("forms and shimmers with bounded opacity curves", () => {
  assert.equal(getDirectionTwoMarkFormationOpacity(-10, 520), 0);
  assert.equal(getDirectionTwoMarkFormationOpacity(520, 520), 1);
  assert.ok(getDirectionTwoMarkFormationOpacity(100, 520) > 0);
  assert.ok(getDirectionTwoMarkFormationOpacity(100, 520) < 1);

  assert.equal(getDirectionTwoMarkShimmerMix(-10, 560), 0);
  assert.equal(getDirectionTwoMarkShimmerMix(560, 560), 0);
  assert.ok(getDirectionTwoMarkShimmerMix(280, 560) > 0.5);
});

test("mixes highlight colors without relying on CSS filter brightness", () => {
  const mixed = mixDirectionTwoMarkHighlightColor(
    { r: 240, g: 240, b: 240 },
    { r: 47, g: 125, b: 80 },
    66,
    1.35,
  );

  assert.ok(mixed.r > 100);
  assert.ok(mixed.g > 100);
  assert.ok(mixed.b > 50);
  assert.deepEqual(parseCssRgbColor("#f0f0f0"), { r: 240, g: 240, b: 240 });
  assert.deepEqual(parseCssRgbColor("rgb(47, 125, 80)"), { r: 47, g: 125, b: 80 });
});

test("indexes magnet candidates spatially and resets cleanly", () => {
  const layout = buildDirectionTwoMarkLayout("inkog", {
    cellSize: 6,
    gap: 1,
    letterGap: 4,
    motionSettings: directionTwoTitleMotionDefaults,
  });
  const { records, grid } = attachDirectionTwoMarkPixelCenters(layout, 100, 200);
  const target = records[Math.floor(records.length / 2)];
  assert.ok(target);

  const candidates = getDirectionTwoMarkMagnetCandidates(
    grid,
    target.x,
    target.y,
    directionTwoTitleMotionDefaults.magnetRadius,
  );
  assert.ok(candidates.includes(target));
  assert.ok(candidates.length < records.length);

  const changed = applyDirectionTwoMarkMagnetism(records, grid, { x: target.x + 8, y: target.y }, directionTwoTitleMotionDefaults);
  assert.equal(changed, true);
  assert.ok(records.some(record => record.pixel.highlighted));

  assert.equal(resetDirectionTwoMarkMagnetism(layout), true);
  assert.ok(layout.pixels.every(pixel => !pixel.highlighted && pixel.offsetX === 0 && pixel.offsetY === 0));
});

test("caps mark canvas device pixel ratio for weak GPUs", () => {
  assert.equal(resolveDirectionTwoMarkDpr(1), 1);
  assert.equal(resolveDirectionTwoMarkDpr(3), 2);
});
