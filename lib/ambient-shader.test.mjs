import assert from "node:assert/strict";
import test from "node:test";

import {
  ambientShaderColorTransitionMs,
  ambientShaderConfig,
  easeAmbientShaderColorTransition,
  mixAmbientShaderColor,
  mixAmbientShaderColors,
  parseAmbientShaderColor,
  resolveAmbientShaderLayerOpacity,
  resolveAmbientShaderColors,
} from "./ambient-shader.mjs";

test("uses the app theme colors for the ambient shader", () => {
  assert.deepEqual(ambientShaderConfig.colors, ["var(--color-signal-glow)"]);
  assert.equal(ambientShaderConfig.colorBack, "var(--color-black)");
  assert.equal(JSON.stringify(ambientShaderConfig).includes("#7cc7ff2e"), false);
  assert.equal(JSON.stringify(ambientShaderConfig).includes("#ff99145e"), false);
  assert.equal(JSON.stringify(ambientShaderConfig).includes("#000000"), false);
});

test("resolves shader colors from the current CSS variables", () => {
  const style = {
    getPropertyValue(name) {
      return {
        "--color-signal-glow": "rgba(124, 199, 255, 0.18)",
        "--color-black": "#050505",
      }[name] ?? "";
    },
  };

  assert.deepEqual(resolveAmbientShaderColors(style), {
    colors: ["rgba(124, 199, 255, 0.18)"],
    colorBack: "#050505",
  });
});

test("updates shader colors when the app theme variables change", () => {
  const blueStyle = {
    getPropertyValue(name) {
      return {
        "--color-signal-glow": "rgba(124, 199, 255, 0.18)",
        "--color-black": "#050505",
      }[name] ?? "";
    },
  };
  const orangeStyle = {
    getPropertyValue(name) {
      return {
        "--color-signal-glow": "rgba(255, 177, 92, 0.16)",
        "--color-black": "#050505",
      }[name] ?? "";
    },
  };

  assert.deepEqual(resolveAmbientShaderColors(blueStyle).colors, ["rgba(124, 199, 255, 0.18)"]);
  assert.deepEqual(resolveAmbientShaderColors(orangeStyle).colors, ["rgba(255, 177, 92, 0.16)"]);
});

test("uses a smooth transition duration for shader theme changes", () => {
  assert.ok(ambientShaderColorTransitionMs >= 2000);
  assert.ok(ambientShaderColorTransitionMs <= 2400);
});

test("parses shader colors from hex and rgba values", () => {
  assert.deepEqual(parseAmbientShaderColor("#7cc7ff2e"), {
    r: 124,
    g: 199,
    b: 255,
    a: 46 / 255,
  });
  assert.deepEqual(parseAmbientShaderColor("rgba(255, 177, 92, 0.16)"), {
    r: 255,
    g: 177,
    b: 92,
    a: 0.16,
  });
});

test("eases shader color changes between app themes", () => {
  assert.equal(easeAmbientShaderColorTransition(0), 0);
  assert.equal(easeAmbientShaderColorTransition(1), 1);
  assert.equal(mixAmbientShaderColor("rgba(124, 199, 255, 0.18)", "rgba(255, 177, 92, 0.16)", 0), "rgba(124, 199, 255, 0.18)");
  assert.equal(mixAmbientShaderColor("rgba(124, 199, 255, 0.18)", "rgba(255, 177, 92, 0.16)", 1), "rgba(255, 177, 92, 0.16)");
  assert.equal(mixAmbientShaderColor("rgba(124, 199, 255, 0.18)", "rgba(255, 177, 92, 0.16)", 0.5), "rgba(190, 188, 174, 0.17)");
});

test("mixes the full shader color payload during theme changes", () => {
  assert.deepEqual(
    mixAmbientShaderColors(
      { colors: ["rgba(124, 199, 255, 0.18)"], colorBack: "#050505" },
      { colors: ["rgba(255, 177, 92, 0.16)"], colorBack: "#050505" },
      0.5,
    ),
    { colors: ["rgba(190, 188, 174, 0.17)"], colorBack: "rgba(5, 5, 5, 1)" },
  );
});

test("eases shader layer opacity for real crossfade transitions", () => {
  assert.equal(resolveAmbientShaderLayerOpacity(0), 0);
  assert.equal(resolveAmbientShaderLayerOpacity(1), 1);
  assert.equal(resolveAmbientShaderLayerOpacity(0.5), 0.5);
});

test("keeps the requested GrainGradient wave settings with gentle motion", () => {
  assert.equal(ambientShaderConfig.width, 1280);
  assert.equal(ambientShaderConfig.height, 720);
  assert.equal(ambientShaderConfig.softness, 0.39);
  assert.equal(ambientShaderConfig.intensity, 0);
  assert.equal(ambientShaderConfig.noise, 0.08);
  assert.equal(ambientShaderConfig.shape, "wave");
  assert.equal(ambientShaderConfig.speed, 0.5);
  assert.equal(ambientShaderConfig.scale, 2.6);
  assert.equal(ambientShaderConfig.rotation, 180);
  assert.equal(ambientShaderConfig.offsetX, -0.78);
  assert.equal(ambientShaderConfig.offsetY, 0.26);
});

test("balances shader sharpness with a bounded render budget", () => {
  assert.equal(ambientShaderConfig.minPixelRatio, 1.5);
  assert.ok(ambientShaderConfig.maxPixelCount > 2073600);
  assert.ok(ambientShaderConfig.maxPixelCount <= 3600000);
});
