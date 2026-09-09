import assert from "node:assert/strict";
import test from "node:test";

import { isExpiredRoomPreview } from "./room-preview.mjs";

test("enables the expired-room preview only in development", () => {
  assert.equal(isExpiredRoomPreview({ nodeEnv: "development", search: "?preview=expired" }), true);
  assert.equal(isExpiredRoomPreview({ nodeEnv: "production", search: "?preview=expired" }), false);
  assert.equal(isExpiredRoomPreview({ nodeEnv: "development", search: "?preview=joined" }), false);
});
