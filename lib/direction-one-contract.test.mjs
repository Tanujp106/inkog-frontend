import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const cwd = process.cwd();

test("direction 1 preserves the original live home UI contract", async () => {
  const [playgroundPage, homePage, globalsCss] = await Promise.all([
    readFile(path.join(cwd, "app/playground/page.tsx"), "utf8"),
    readFile(path.join(cwd, "app/page.tsx"), "utf8"),
    readFile(path.join(cwd, "app/globals.css"), "utf8"),
  ]);

  assert.match(playgroundPage, /<iframe[\s\S]*src="\/"/);
  assert.match(playgroundPage, /fontFamily: "Syne, sans-serif"/);
  assert.match(playgroundPage, /fontFamily: "DM Mono, monospace"/);
  assert.doesNotMatch(homePage, /AmbientShaderBackground/);
  assert.match(homePage, /fontFamily: "Syne, sans-serif"/);
  assert.match(homePage, /fontFamily: "DM Mono, monospace"/);
  assert.doesNotMatch(homePage, /fontFamily: "var\(--font-mono\)"/);
  assert.match(globalsCss, /--font-mono: "IBM Plex Mono", "DM Mono"/);
  assert.match(globalsCss, /--font-sans: Inter, Syne,/);
  assert.match(globalsCss, /--font-serif: "Instrument Serif", Georgia, serif;/);
  assert.match(globalsCss, /\.btn-accent \{[\s\S]*font-family: 'Syne', sans-serif;/);
  assert.match(globalsCss, /\.btn-ghost \{[\s\S]*font-family: 'DM Mono', monospace;/);
  assert.match(globalsCss, /input, textarea \{[\s\S]*font-family: 'DM Mono', monospace;/);
});
