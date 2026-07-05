import assert from "node:assert/strict";
import test from "node:test";

import {
  createPendingRoomPollRequest,
  matchesPendingRoomPollRequest,
} from "./room-poll-request.mjs";

test("creates a normalized pending room poll request", () => {
  assert.deepEqual(
    createPendingRoomPollRequest(" Where should we go? ", [" Goa ", "Bali", "Sri Lanka "]),
    {
      question: "Where should we go?",
      options: ["Goa", "Bali", "Sri Lanka"],
    },
  );
});

test("matches a created poll against the pending room poll request", () => {
  const pending = createPendingRoomPollRequest("Dinner vote", ["Pizza", "Tacos"]);

  assert.equal(
    matchesPendingRoomPollRequest(pending, {
      question: "Dinner vote",
      options: ["Pizza", "Tacos"],
    }),
    true,
  );

  assert.equal(
    matchesPendingRoomPollRequest(pending, {
      question: "Dinner vote",
      options: ["Tacos", "Pizza"],
    }),
    false,
  );
});
