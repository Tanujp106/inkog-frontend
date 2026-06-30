import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_AGENTATION_ENDPOINT, getAgentationConfig } from "./agentation-config.mjs";

test("does not render agentation outside development", () => {
  assert.equal(
    getAgentationConfig({ isMounted: true, nodeEnv: "production", pathname: "/" }),
    null,
  );
});

test("does not render agentation before mount", () => {
  assert.equal(
    getAgentationConfig({ isMounted: false, nodeEnv: "development", pathname: "/" }),
    null,
  );
});

test("renders agentation in development with the default local endpoint", () => {
  assert.deepEqual(
    getAgentationConfig({ isMounted: true, nodeEnv: "development", pathname: "/" }),
    {
      className: "inkog-agentation-toolbar",
      endpoint: DEFAULT_AGENTATION_ENDPOINT,
    },
  );
});

test("adds the room-specific class inside room routes", () => {
  assert.deepEqual(
    getAgentationConfig({ isMounted: true, nodeEnv: "development", pathname: "/room/qui74e" }),
    {
      className: "inkog-agentation-toolbar inkog-agentation-toolbar-room",
      endpoint: DEFAULT_AGENTATION_ENDPOINT,
    },
  );
});

test("uses an explicit endpoint when provided", () => {
  assert.deepEqual(
    getAgentationConfig({
      endpoint: "http://127.0.0.1:9999",
      isMounted: true,
      nodeEnv: "development",
      pathname: "/room/qui74e",
    }),
    {
      className: "inkog-agentation-toolbar inkog-agentation-toolbar-room",
      endpoint: "http://127.0.0.1:9999",
    },
  );
});
