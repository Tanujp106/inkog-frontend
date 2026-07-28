import assert from "node:assert/strict";
import test from "node:test";

import {
  buildInkogFaviconHref,
  buildInkogFaviconSvg,
  inkogFaviconThemeColors,
  resolveInkogFaviconTheme,
} from "./inkog-favicon.mjs";

test("resolves known favicon themes and falls back to crimson", () => {
  assert.equal(resolveInkogFaviconTheme("orange"), "orange");
  assert.equal(resolveInkogFaviconTheme("blue"), "blue");
  assert.equal(resolveInkogFaviconTheme("crimson"), "crimson");
  assert.equal(resolveInkogFaviconTheme("purple"), "purple");
  assert.equal(resolveInkogFaviconTheme("unknown"), "crimson");
  assert.equal(resolveInkogFaviconTheme(null), "crimson");
});

test("builds a pixel chat favicon using the requested theme color", () => {
  const svg = buildInkogFaviconSvg("purple");

  assert.equal(svg.includes('shape-rendering="crispEdges"'), true);
  assert.equal(svg.includes(inkogFaviconThemeColors.purple), true);
  assert.equal(svg.includes("#ff3b30"), false);
  assert.equal(svg.includes("#050505"), false);
  assert.equal(svg.includes('width="4" height="4"'), true);
  assert.equal(svg.includes("<rect"), true);
  assert.equal(svg.includes("<image"), false);
});

test("theme choices produce different favicon colors", () => {
  const crimsonSvg = buildInkogFaviconSvg("crimson");
  const orangeSvg = buildInkogFaviconSvg("orange");

  assert.notEqual(crimsonSvg, orangeSvg);
  assert.equal(crimsonSvg.includes(inkogFaviconThemeColors.crimson), true);
  assert.equal(orangeSvg.includes(inkogFaviconThemeColors.orange), true);
});

test("builds an encoded SVG favicon data URI", () => {
  const href = buildInkogFaviconHref("blue");

  assert.equal(href.startsWith("data:image/svg+xml,"), true);
  assert.equal(decodeURIComponent(href).includes(inkogFaviconThemeColors.blue), true);
});
