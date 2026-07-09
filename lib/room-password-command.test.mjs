import assert from "node:assert/strict";
import test from "node:test";

import {
  getStoredRoomPassword,
  resolveRoomPasswordCommand,
  setStoredRoomPassword,
} from "./room-password-command.mjs";

function createStorage() {
  const values = new Map();

  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
  };
}

test("stores and reads a creator room password by room id", () => {
  const storage = createStorage();

  setStoredRoomPassword("abc123", " mango ");

  assert.equal(getStoredRoomPassword("abc123", storage), null);

  setStoredRoomPassword("abc123", " mango ", storage);

  assert.equal(getStoredRoomPassword("abc123", storage), "mango");
});

test("reveals the stored room password only to the creator", () => {
  assert.deepEqual(resolveRoomPasswordCommand({ isCreator: true, password: "mango" }), {
    ok: true,
    password: "mango",
    hint: "type c to copy",
  });

  assert.deepEqual(resolveRoomPasswordCommand({ isCreator: false, password: "mango" }), {
    ok: false,
    message: "only the creator can view this room password",
  });
});

test("explains when the creator password is not available locally", () => {
  assert.deepEqual(resolveRoomPasswordCommand({ isCreator: true, password: "" }), {
    ok: false,
    message: "room password is not stored in this browser",
  });
});
