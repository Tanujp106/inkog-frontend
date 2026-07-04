import assert from "node:assert/strict";
import test from "node:test";

import {
  buildInkogFaviconHref,
  buildInkogFaviconSvg,
  inkogFaviconThemeColors,
  resolveInkogFaviconTheme,
} from "./inkog-favicon.mjs";

test("resolves known favicon themes and falls back to green", () => {
  assert.equal(resolveInkogFaviconTheme("orange"), "orange");
  assert.equal(resolveInkogFaviconTheme("blue"), "blue");
  assert.equal(resolveInkogFaviconTheme("green"), "green");
  assert.equal(resolveInkogFaviconTheme("purple"), "purple");
  assert.equal(resolveInkogFaviconTheme("unknown"), "green");
  assert.equal(resolveInkogFaviconTheme(null), "green");
});

test("builds a pixel chat favicon using the requested theme color", () => {
  const svg = buildInkogFaviconSvg("purple");

  assert.equal(svg.includes('shape-rendering="crispEdges"'), true);
  assert.equal(svg.includes(inkogFaviconThemeColors.purple), true);
  assert.equal(svg.includes('width="3" height="3"'), true);
  assert.equal(svg.includes("<rect"), true);
  assert.equal(svg.includes("<image"), false);
});

test("builds an encoded SVG favicon data URI", () => {
  const href = buildInkogFaviconHref("blue");

  assert.equal(href.startsWith("data:image/svg+xml,"), true);
  assert.equal(decodeURIComponent(href).includes(inkogFaviconThemeColors.blue), true);
});
