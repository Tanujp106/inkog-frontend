import assert from "node:assert/strict";
import test from "node:test";

import {
  directionTwoAutoScrollAnimationDurationMs,
  getDirectionTwoAutoScrollTop,
  getDirectionTwoScrollAnimationTop,
  getDirectionTwoScrollReserveHeight,
} from "./direction-two-scroll.mjs";

test("keeps the page still while the prompt is above the anchor line", () => {
  assert.equal(
    getDirectionTwoAutoScrollTop({
      currentScrollY: 160,
      promptTop: 720,
      viewportHeight: 900,
    }),
    160,
  );
});

test("can return a lower target when reverse prompt anchoring is enabled", () => {
  assert.equal(
    getDirectionTwoAutoScrollTop({
      allowReverse: true,
      currentScrollY: 160,
      promptTop: 720,
      viewportHeight: 900,
    }),
    115,
  );
});

test("scrolls the page once the prompt falls below the lower terminal anchor", () => {
  assert.equal(
    getDirectionTwoAutoScrollTop({
      currentScrollY: 160,
      promptTop: 820,
      viewportHeight: 900,
    }),
    215,
  );
});

test("scrolls smoothly once the slash dropdown reaches the 80vh anchor", () => {
  assert.equal(
    getDirectionTwoAutoScrollTop({
      currentScrollY: 160,
      promptTop: 620,
      viewportHeight: 900,
      floatingHeight: 140,
      anchorRatio: 0.8,
    }),
    200,
  );
});

test("scrolls enough to reveal the full slash dropdown when its bottom clips", () => {
  assert.equal(
    getDirectionTwoAutoScrollTop({
      currentScrollY: 160,
      floatingBottom: 860,
      floatingHeight: 300,
      promptTop: 300,
      viewportHeight: 814,
      viewportPadding: 24,
      anchorRatio: 0.8,
    }),
    230,
  );
});

test("eases Direction 2 auto-scroll instead of jumping straight to the target", () => {
  assert.equal(directionTwoAutoScrollAnimationDurationMs, 520);
  assert.equal(
    getDirectionTwoScrollAnimationTop({
      startScrollY: 120,
      targetScrollY: 240,
      elapsedMs: 0,
    }),
    120,
  );
  assert.equal(
    getDirectionTwoScrollAnimationTop({
      startScrollY: 120,
      targetScrollY: 240,
      elapsedMs: directionTwoAutoScrollAnimationDurationMs / 2,
    }),
    180,
  );
  assert.equal(
    getDirectionTwoScrollAnimationTop({
      startScrollY: 120,
      targetScrollY: 240,
      elapsedMs: directionTwoAutoScrollAnimationDurationMs,
    }),
    240,
  );
});

test("eases Direction 2 auto-scroll upward with the same timing curve", () => {
  assert.equal(
    getDirectionTwoScrollAnimationTop({
      startScrollY: 240,
      targetScrollY: 120,
      elapsedMs: directionTwoAutoScrollAnimationDurationMs / 2,
    }),
    180,
  );
});

test("keeps invalid Direction 2 animation inputs from producing bad scroll positions", () => {
  assert.equal(
    getDirectionTwoScrollAnimationTop({
      startScrollY: Number.NaN,
      targetScrollY: 240,
      elapsedMs: 120,
    }),
    240,
  );
});

test("adds just enough reserve space to let the prompt stay near the bottom", () => {
  assert.equal(
    getDirectionTwoScrollReserveHeight({
      viewportHeight: 900,
      promptHeight: 24,
    }),
    111,
  );
});

test("reserves enough scroll space for an open slash dropdown", () => {
  assert.equal(
    getDirectionTwoScrollReserveHeight({
      viewportHeight: 900,
      promptHeight: 24,
      floatingHeight: 220,
      anchorRatio: 0.8,
    }),
    220,
  );
});
