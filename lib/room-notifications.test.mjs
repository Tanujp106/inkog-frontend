import assert from "node:assert/strict";
import test from "node:test";

import { getRoomCountdownNotification } from "./room-notifications.mjs";

test("fires a five-minute room warning only when the countdown crosses the threshold", () => {
  assert.deepEqual(getRoomCountdownNotification(301, 300), {
    sound: "countdownWarning",
    message: "5 minutes left",
  });
  assert.equal(getRoomCountdownNotification(300, 299), null);
  assert.equal(getRoomCountdownNotification(450, 449), null);
  assert.equal(getRoomCountdownNotification(0, 0), null);
});
