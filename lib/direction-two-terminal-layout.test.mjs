import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("keeps Direction 2 transcript in the page scroll instead of an inner terminal scroll", async () => {
  const source = await readFile(new URL("../components/direction-two-shell.tsx", import.meta.url), "utf8");

  assert.match(source, /min-h-\[100dvh\].*overflow-visible/);
  assert.match(source, /direction-two-mobile-terminal[^`]*hidden min-h-0 flex-1 flex-col/);
  assert.match(source, /className="flex min-h-0 flex-1 flex-col gap-2" aria-label="Terminal output"/);
  assert.match(source, /className="direction-two-floating-composer"/);
  assert.match(source, /style=\{\{ \.\.\.composerStyle, \.\.\.getLandingPartStyle\("composer"\), \.\.\.composerMotionStyle \}\}/);
  assert.doesNotMatch(source, /lines\.length > 0 \? "mt-2 "/);
  assert.match(source, /composerReserveHeight/);
  assert.match(source, /direction-two-terminal-frame[\s\S]*direction-two-slash-menu[\s\S]*direction-two-terminal-input-row/);
  assert.match(source, /hidden flex-col gap-4 pb-5 pt-5 sm:flex sm:pt-6/);
  assert.match(source, /space-y-\[20px\] pt-8 text-\[12px\] leading-\[18px\]/);
});

test("routes room-server failures into the terminal transcript", async () => {
  const source = await readFile(new URL("../components/direction-two-shell.tsx", import.meta.url), "utf8");

  assert.match(source, /const rejectInputToTerminal = \(message: string\) =>/);
  assert.match(source, /rejectInputToTerminal\(data\.message \|\| "Room creation failed\."\)/);
  assert.match(source, /rejectInputToTerminal\("Could not reach room server\."\)/);
  assert.match(source, /appendLines\(line\("error", message\)\)/);
});

test("keeps the Direction 2 prompt as a bare terminal field", async () => {
  const source = await readFile(new URL("../components/direction-two-shell.tsx", import.meta.url), "utf8");

  assert.match(source, /direction-two-terminal-frame/);
  assert.match(source, /padding: "var\(--route-composer-frame-padding\)"/);
  assert.match(source, /background: "var\(--color-panel\)"/);
  assert.match(source, /input[^>]*className="absolute inset-0 h-\[24px\] w-full appearance-none pt-\[0px\] pr-\[0px\] pb-\[0px\] pl-\[0px\]/);
  assert.match(source, /inputMirrorRef} className="flex min-h-\[24px\] min-w-0 items-center overflow-hidden pl-\[4px\]/);
  assert.match(source, /direction-two-terminal-input-row flex min-w-0 items-center gap-0 pl-\[0px\]/);
  assert.match(source, /direction-two-terminal-frame[^`]*flex min-w-0 flex-col gap-0 pl-\[12px\] pr-\[12px\]/);
  assert.match(source, /paddingLeft: "12px"/);
  assert.match(source, /paddingRight: "12px"/);
  assert.match(source, /className="direction-two-floating-composer"/);
  assert.match(source, /style=\{\{ \.\.\.composerStyle, \.\.\.getLandingPartStyle\("composer"\), \.\.\.composerMotionStyle \}\}/);
  assert.match(source, /border: "1px solid color-mix\(in srgb, var\(--accent\) 24%, var\(--background\) 76%\)"/);
});

test("runs the landing composer entrance and soft border breath once after the intro reveal", async () => {
  const [source, styles] = await Promise.all([
    readFile(new URL("../components/direction-two-shell.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  const glowRule = styles.match(/\.direction-two-composer-glow\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";

  assert.match(source, /direction-two-composer-entry/);
  assert.match(source, /direction-two-composer-glow/);
  assert.match(source, /startOpacity: \[0, 0, 1\]/);
  assert.match(source, /opacity: composerMotionActive \|\| prefersReducedMotion \? 1 : 0/);
  assert.match(source, /direction-two-mobile-terminal[^`]*transition-opacity/);
  assert.doesNotMatch(source, /direction-two-mobile-terminal[^`]*translate-y-3/);
  assert.doesNotMatch(source, /direction-two-composer-glow__segment/);
  assert.match(styles, /@keyframes direction-two-composer-enter/);
  assert.match(styles, /@keyframes direction-two-composer-glow-breathe/);
  assert.doesNotMatch(styles, /@keyframes direction-two-composer-glow-(bottom|sides|top)/);
  assert.match(glowRule, /border: 1px solid var\(--color-signal\);/);
  assert.match(glowRule, /box-shadow:/);
  assert.match(glowRule, /will-change: opacity;/);
  assert.match(styles, /animation: direction-two-composer-enter var\(--direction-two-composer-entry-duration/);
  assert.match(styles, /animation: direction-two-composer-glow-breathe var\(--direction-two-composer-glow-duration/);
  assert.match(styles, /transform: translate3d\(0, var\(--direction-two-composer-entry-distance/);
  assert.doesNotMatch(styles, /\.direction-two-terminal-frame::before/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*\.direction-two-composer-entry[\s\S]*animation: none;/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*\.direction-two-composer-glow[\s\S]*animation: none;/);
});

test("aligns the floating composer with mobile and desktop page gutters", async () => {
  const [source, styles] = await Promise.all([
    readFile(new URL("../lib/route-handoff.mjs", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(source, /width: "min\(calc\(100vw - var\(--route-composer-inline-gutter, 5rem\)\), 1200px\)"/);
  assert.match(styles, /\.direction-two-floating-composer\s*\{[\s\S]*--route-composer-inline-gutter: 3rem;/);
  assert.match(styles, /@media \(min-width: 640px\)\s*\{[\s\S]*\.direction-two-floating-composer\s*\{[\s\S]*--route-composer-inline-gutter: 5rem;/);
});

test("keeps the Direction 2 slash menu compact without a divider", async () => {
  const source = await readFile(new URL("../components/direction-two-shell.tsx", import.meta.url), "utf8");

  assert.match(source, /direction-two-slash-menu mb-2 flex w-full flex-col gap-1 pb-2/);
  assert.doesNotMatch(source, /direction-two-slash-menu[^`]*border-b/);
  assert.ok(source.includes('items-center gap-[9px] rounded-[3px] pl-[12px] pr-[12px] py-1'));
  assert.match(source, /<span className="pl-\[12px\] text-base text-\[var\(--color-signal\)\]">\$<\/span>/);
});
