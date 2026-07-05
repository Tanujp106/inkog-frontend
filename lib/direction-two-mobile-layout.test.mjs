import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const cwd = process.cwd();

test("direction two exposes a separate mobile landing presentation", async () => {
  const source = await readFile(path.join(cwd, "components/direction-two-shell.tsx"), "utf8");

  assert.match(source, /direction-two-mobile-landing/);
  assert.match(source, /className="[^"]*sm:hidden[^"]*direction-two-mobile-landing/);
  assert.match(source, /className="hidden[^"]*sm:flex/);
  assert.match(source, /direction-two-mobile-terminal/);
});

test("mobile ghost suggestions are tappable while desktop input remains keyboard-first", async () => {
  const source = await readFile(path.join(cwd, "components/direction-two-shell.tsx"), "utf8");

  assert.match(source, /handleGhostSuggestionTap/);
  assert.match(source, /onPointerDown=\{handleGhostSuggestionTap\}/);
  assert.match(source, /aria-label="Autocomplete suggestion"/);
});

test("mobile direction two uses requested spacing without changing desktop breakpoints", async () => {
  const source = await readFile(path.join(cwd, "components/direction-two-shell.tsx"), "utf8");

  assert.match(source, /className="[^"]*px-6 py-5[^"]*sm:px-10 sm:py-10/);
  assert.match(source, /max-w-\[360px\] space-y-6/);
  assert.match(source, /direction-two-mobile-terminal[^"]*pt-11[^"]*sm:pt-12/);
});

test("mobile direction two shortens copy and scales the mark for phone width", async () => {
  const source = await readFile(path.join(cwd, "components/direction-two-shell.tsx"), "utf8");

  assert.match(source, /mobileIntroHeadline = "Create a temporary room for honest chats, quick votes, and no identity trail\."/);
  assert.match(source, /mobileText: "private rooms for known people"/);
  assert.match(source, /mobileText: "temporary spaces that expire"/);
  assert.match(source, /mobileText: "quick prompts for decisions"/);
  assert.match(source, /\[--cell:clamp\(3\.2px,0\.84vw,3\.6px\)\]/);
});

test("mobile direction two lowers shader intensity on small screens", async () => {
  const source = await readFile(path.join(cwd, "components/direction-two-shell.tsx"), "utf8");

  assert.match(source, /isMobileViewport \? 0\.34 : 0\.43/);
});

test("terminal input mirror follows native input scroll for long commands", async () => {
  const source = await readFile(path.join(cwd, "components/direction-two-shell.tsx"), "utf8");

  assert.match(source, /const inputMirrorRef = useRef<HTMLDivElement \| null>\(null\)/);
  assert.match(source, /const syncInputMirrorScroll = \(\) =>/);
  assert.match(source, /inputMirror\.scrollLeft = input\.scrollLeft/);
  assert.match(source, /ref=\{inputMirrorRef\}/);
  assert.match(source, /onScroll=\{syncInputMirrorScroll\}/);
  assert.match(source, /onKeyUp=\{syncInputMirrorScroll\}/);
});
