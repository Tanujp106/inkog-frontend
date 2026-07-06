import assert from "node:assert/strict";
import test from "node:test";

import {
  getDirectionTwoAutoScrollTop,
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
