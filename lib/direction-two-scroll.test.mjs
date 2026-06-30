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
      promptTop: 320,
      viewportHeight: 900,
    }),
    160,
  );
});

test("scrolls the page once the prompt falls below the anchor line", () => {
  assert.equal(
    getDirectionTwoAutoScrollTop({
      currentScrollY: 160,
      promptTop: 620,
      viewportHeight: 900,
    }),
    330,
  );
});

test("adds enough reserve space to let the prompt stay near mid-screen", () => {
  assert.equal(
    getDirectionTwoScrollReserveHeight({
      viewportHeight: 900,
      promptHeight: 24,
    }),
    426,
  );
});
