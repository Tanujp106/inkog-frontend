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

test("adds just enough reserve space to let the prompt stay near the bottom", () => {
  assert.equal(
    getDirectionTwoScrollReserveHeight({
      viewportHeight: 900,
      promptHeight: 24,
    }),
    111,
  );
});
