import assert from "node:assert/strict";
import test from "node:test";

import {
  getDirectionTwoAmbientLoopProgress,
  resolveDirectionTwoAmbientDpr,
  sampleDirectionTwoAmbientDrift,
  sampleDirectionTwoAmbientPresence,
} from "./direction-two-ambient-canvas.mjs";

test("samples ambient drift and presence on a continuous loop", () => {
  assert.equal(getDirectionTwoAmbientLoopProgress(1.5, 0, 1), 0.5);
  const midDrift = sampleDirectionTwoAmbientDrift(0.5, 10, 8);
  assert.equal(midDrift.x, 10);
  assert.equal(midDrift.y, 8);

  const peak = sampleDirectionTwoAmbientPresence(0.39, 0.2, 0.4);
  assert.ok(peak.opacity > 0.3);
  assert.ok(peak.scale > 1);
});

test("caps ambient canvas device pixel ratio", () => {
  assert.equal(resolveDirectionTwoAmbientDpr(1), 1);
  assert.equal(resolveDirectionTwoAmbientDpr(3), 1.5);
});
