import assert from "node:assert/strict";
import test from "node:test";

import {
  ambientShaderConfig,
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
