import assert from "node:assert/strict";
import test from "node:test";

import {
  applyInkogTheme,
  inkogThemeChoices,
  resolveInkogThemeChoice,
} from "./inkog-theme.mjs";

test("exposes the supported global theme choices", () => {
  assert.deepEqual(inkogThemeChoices.map(theme => theme.id), ["orange", "blue", "green", "purple"]);
});

test("resolves numbered and named theme choices", () => {
  assert.equal(resolveInkogThemeChoice("1")?.id, "orange");
  assert.equal(resolveInkogThemeChoice("2")?.id, "blue");
  assert.equal(resolveInkogThemeChoice("green")?.id, "green");
  assert.equal(resolveInkogThemeChoice("purple")?.id, "purple");
});

test("resolves surprise choices through the provided random function", () => {
  assert.equal(resolveInkogThemeChoice("surprise", () => 0.5)?.id, "green");
});

test("applies the theme to the document element and storage", () => {
  const attributes = new Map();
  const storageWrites = new Map();

  applyInkogTheme({
    documentElement: {
      setAttribute(name, value) {
        attributes.set(name, value);
      },
    },
    storage: {
      setItem(name, value) {
        storageWrites.set(name, value);
      },
    },
  }, "blue");

  assert.equal(attributes.get("data-inkog-theme"), "blue");
  assert.equal(storageWrites.get("inkog-theme"), "blue");
});
