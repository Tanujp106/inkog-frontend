import assert from "node:assert/strict";
import test from "node:test";

import { playgroundDirections } from "./playground-directions.mjs";

test("playground exposes only the two supported directions", () => {
  assert.deepEqual(
    playgroundDirections.map(direction => ({
      id: direction.id,
      label: direction.label,
    })),
    [
      { id: 1, label: "Direction 1" },
      { id: 2, label: "Direction 2" },
    ],
  );
});
