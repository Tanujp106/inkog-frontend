import assert from "node:assert/strict";
import test from "node:test";

import {
  formatSystemSoundStatus,
  parseSystemSoundCommand,
  readSystemSoundMuted,
  systemSoundStorageKey,
  writeSystemSoundMuted,
} from "./system-sound.mjs";
import {
  getSystemSoundPeakGain,
  systemSoundNames,
  systemSoundSpecs,
} from "./system-sound-profile.mjs";

test("parses supported sound commands", () => {
  assert.deepEqual(parseSystemSoundCommand("/sound on"), { type: "set", muted: false });
  assert.deepEqual(parseSystemSoundCommand("sound off"), { type: "set", muted: true });
  assert.deepEqual(parseSystemSoundCommand("/sound status"), { type: "status" });
  assert.deepEqual(parseSystemSoundCommand("/sound"), { type: "status" });
});

test("rejects unsupported sound commands", () => {
  assert.deepEqual(parseSystemSoundCommand("/sound loud"), {
    type: "invalid",
    message: "usage: /sound on, /sound off, or /sound status",
  });
});

test("formats terminal sound status", () => {
  assert.equal(formatSystemSoundStatus(false), "sound: on");
  assert.equal(formatSystemSoundStatus(true), "sound: off");
});

test("reads and writes the persisted mute preference", () => {
  const values = new Map();
  const storage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };

  assert.equal(readSystemSoundMuted(storage), false);
  writeSystemSoundMuted(storage, true);
  assert.equal(values.get(systemSoundStorageKey), "true");
  assert.equal(readSystemSoundMuted(storage), true);

  writeSystemSoundMuted(storage, false);
  assert.equal(values.get(systemSoundStorageKey), "false");
  assert.equal(readSystemSoundMuted(storage), false);
});

test("sound profile keeps short UI sounds above the audible floor", () => {
  assert.ok(!systemSoundNames.includes("enter"), "enter should not have a dedicated sound");
  assert.ok(systemSoundNames.includes("messageSent"), "sender messages should have their own sound");
  assert.ok(systemSoundNames.includes("messageReceived"), "receiver messages should have their own sound");

  for (const soundName of systemSoundNames) {
    assert.ok(
      getSystemSoundPeakGain(soundName) >= 0.24,
      `${soundName} peak gain should be audible`,
    );
  }

  for (const soundName of ["press", "success", "error", "close"]) {
    assert.ok(
      getSystemSoundPeakGain(soundName) >= 0.34,
      `${soundName} peak gain should cut through normal laptop volume`,
    );
  }
});

test("sender and receiver message sounds have distinct shapes", () => {
  const sent = systemSoundSpecs.messageSent;
  const received = systemSoundSpecs.messageReceived;

  assert.equal(sent.length, 1, "sent message should be a dry single packet tick");
  assert.ok(received.length >= 2, "received message should be a multi-step external ping");
  assert.ok(sent[0].frequency < received[0].frequency, "sent message should sit lower than received message");
  assert.notEqual(sent[0].type, received[0].type, "sent and received messages should not share the same leading timbre");
  assert.notEqual(getSystemSoundPeakGain("messageSent"), getSystemSoundPeakGain("messageReceived"));
});

test("sound profile avoids clipping or harsh peaks", () => {
  for (const soundName of systemSoundNames) {
    assert.ok(
      getSystemSoundPeakGain(soundName) <= 0.5,
      `${soundName} peak gain should stay controlled`,
    );
  }
});
