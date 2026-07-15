import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("keeps Direction 2 transcript in the page scroll instead of an inner terminal scroll", async () => {
  const source = await readFile(new URL("../components/direction-two-shell.tsx", import.meta.url), "utf8");

  assert.doesNotMatch(source, /h-\[100dvh\].*overflow-hidden/);
  assert.match(source, /min-h-\[calc\(100dvh-40px\)\]/);
  assert.match(source, /direction-two-mobile-terminal[^`]*flex flex-col/);
  assert.match(source, /direction-two-mobile-terminal[^`]*sticky bottom-0 mt-auto/);
  assert.match(source, /className="flex flex-col gap-2" aria-label="Terminal output"/);
  assert.doesNotMatch(source, /Terminal output"[^>]*overflow-y-auto/);
  assert.match(source, /direction-two-terminal-frame[\s\S]*direction-two-slash-menu[\s\S]*direction-two-terminal-input-row/);
  assert.match(source, /hidden flex-col gap-4 pb-5 pt-5 sm:flex sm:pt-6/);
  assert.match(source, /space-y-\[20px\] pt-8 text-\[12px\] leading-\[18px\]/);
});

test("keeps the Direction 2 prompt as a bare terminal field", async () => {
  const source = await readFile(new URL("../components/direction-two-shell.tsx", import.meta.url), "utf8");

  assert.match(source, /direction-two-terminal-frame/);
  assert.match(source, /padding: "var\(--route-composer-frame-padding\)"/);
  assert.match(source, /background: "transparent"/);
  assert.match(source, /input[^>]*className="absolute inset-0 h-\[24px\] w-full appearance-none pt-\[0px\] pr-\[0px\] pb-\[0px\] pl-\[4px\]/);
  assert.match(source, /inputMirrorRef} className="flex min-h-\[24px\] min-w-0 items-center overflow-hidden pl-\[4px\]/);
  assert.match(source, /className="relative w-full shrink-0"/);
  assert.match(source, /border: "1px solid color-mix\(in srgb, var\(--border-light\) 92%, var\(--accent\) 8%\)"/);
});

test("removes terminal frame comparison controls", async () => {
  const source = await readFile(new URL("../components/direction-two-shell.tsx", import.meta.url), "utf8");

  assert.doesNotMatch(source, /terminalFrameOptions/);
  assert.doesNotMatch(source, /Terminal frame style/);
  assert.doesNotMatch(source, /data-terminal-frame/);
  assert.match(source, /direction-two-visual-caret[^\n]*w-\[3px\]/);
});

test("keeps the Direction 2 slash menu compact without a divider", async () => {
  const source = await readFile(new URL("../components/direction-two-shell.tsx", import.meta.url), "utf8");

  assert.match(source, /direction-two-slash-menu mb-2 flex w-full flex-col gap-1 pb-2/);
  assert.doesNotMatch(source, /direction-two-slash-menu[^`]*border-b/);
  assert.match(source, /group flex min-h-7 w-full items-center gap-2/);
});
