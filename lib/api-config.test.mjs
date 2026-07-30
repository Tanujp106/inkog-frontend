import test from "node:test";
import assert from "node:assert/strict";

import { getInkogApiBaseUrl } from "./api-config.mjs";

test("uses the local backend by default during development", () => {
  assert.equal(
    getInkogApiBaseUrl({ nodeEnv: "development" }),
    "http://127.0.0.1:3001/api",
  );
});

test("uses an explicitly configured backend URL in every environment", () => {
  assert.equal(
    getInkogApiBaseUrl({
      nodeEnv: "development",
      configuredUrl: "https://api.example.test/api/",
    }),
    "https://api.example.test/api",
  );
});

test("keeps the deployed backend as the production fallback", () => {
  assert.equal(
    getInkogApiBaseUrl({ nodeEnv: "production" }),
    "https://inkog-backend.onrender.com/api",
  );
});
