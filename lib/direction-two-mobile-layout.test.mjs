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
  assert.match(source, /rowClassName="flex items-center gap-5"/);
  assert.match(source, /direction-two-mobile-terminal/);
});

test("mobile ghost suggestions are tappable while desktop input remains keyboard-first", async () => {
  const source = await readFile(path.join(cwd, "components/direction-two-shell.tsx"), "utf8");

  assert.match(source, /handleGhostSuggestionTap/);
  assert.match(source, /onPointerDown=\{handleGhostSuggestionTap\}/);
  assert.match(source, /aria-label="Autocomplete suggestion"/);
});

test("landing terminal shows slash-command suggestions and teaches slash entry", async () => {
  const source = await readFile(path.join(cwd, "components/direction-two-shell.tsx"), "utf8");

  assert.match(source, /getDirectionTwoSlashCommandSuggestions\(inputValue\)/);
  assert.match(source, /direction-two-slash-menu/);
  assert.match(source, /handleSlashCommandSuggestionTap/);
  assert.match(source, /write '\/' to start/);
  assert.doesNotMatch(source, /write '\/' to create or join/);
});

test("landing terminal colors the root prompt marker with the accent color", async () => {
  const source = await readFile(path.join(cwd, "components/direction-two-shell.tsx"), "utf8");

  assert.match(source, /activePrompt === "\$" \? \([\s\S]*?<span className="[^"]*text-\[var\(--color-signal\)\][^"]*">\$<\/span>/);
});

test("landing slash menu is larger and keyboard selectable", async () => {
  const source = await readFile(path.join(cwd, "components/direction-two-shell.tsx"), "utf8");

  assert.match(source, /const \[slashSuggestionIndex, setSlashSuggestionIndex\] = useState\(0\)/);
  assert.match(source, /event\.key === "ArrowDown"[\s\S]*slashCommandSuggestions\.length/);
  assert.match(source, /event\.key === "ArrowUp"[\s\S]*slashCommandSuggestions\.length/);
  assert.match(source, /event\.key === "ArrowDown"[\s\S]*sound\.play\("hover"\)/);
  assert.match(source, /setInputValue\(nextCommandValue\)/);
  assert.match(source, /direction-two-slash-menu[^"]*text-\[14px\][^"]*leading-\[24px\]/);
});

test("landing slash menu expands inside the terminal frame above the prompt row", async () => {
  const source = await readFile(path.join(cwd, "components/direction-two-shell.tsx"), "utf8");

  assert.match(source, /className="direction-two-floating-composer"/);
  assert.match(source, /style=\{composerStyle\}/);
  assert.match(source, /direction-two-terminal-frame[\s\S]*direction-two-slash-menu[\s\S]*direction-two-terminal-input-row/);
  assert.doesNotMatch(source, /direction-two-slash-menu[^"]*border-b/);
  assert.doesNotMatch(source, /direction-two-slash-menu[^"]*absolute/);
});

test("landing slash menu and composer frame animate with a transparent surface", async () => {
  const source = await readFile(path.join(cwd, "components/direction-two-shell.tsx"), "utf8");

  assert.match(source, /transition-\[max-height,opacity\]/);
  assert.match(source, /maxHeight: slashCommandSuggestions\.length > 0 \? "240px" : "0px"/);
  assert.match(source, /background: "transparent"/);
});

test("landing transcript scrolls to the newest output while the slash menu stays within the composer", async () => {
  const source = await readFile(path.join(cwd, "components/direction-two-shell.tsx"), "utf8");

  assert.match(source, /const slashMenuRef = useRef<HTMLDivElement \| null>\(null\)/);
  assert.match(source, /const terminalOutputRef = useRef<HTMLDivElement \| null>\(null\)/);
  assert.match(source, /const keepLatestLineAboveComposer = \(\) =>/);
  assert.match(source, /window\.scrollBy\(\{ top: overlap, behavior: "auto" \}\)/);
  assert.match(source, /const composerRef = useRef<HTMLDivElement \| null>\(null\)/);
  assert.match(source, /ref=\{slashMenuRef\}/);
  assert.match(source, /ref=\{terminalOutputRef\}/);
  assert.match(source, /direction-two-terminal-input-row/);
});

test("landing slash menu highlights the keyboard-selected row", async () => {
  const source = await readFile(path.join(cwd, "components/direction-two-shell.tsx"), "utf8");

  assert.match(source, /selected \? "bg-\[color-mix\(in_srgb,var\(--color-signal\)_10%,transparent\)\] text-\[var\(--color-signal\)\]"/);
  assert.match(source, /aria-selected=\{selected\}/);
});

test("landing slash menu disables pointer hover styling during keyboard selection", async () => {
  const source = await readFile(path.join(cwd, "components/direction-two-shell.tsx"), "utf8");

  assert.match(source, /const \[slashSelectionMode, setSlashSelectionMode\] = useState<"pointer" \| "keyboard">\("pointer"\)/);
  assert.match(source, /setSlashSelectionMode\("keyboard"\)[\s\S]*setSlashSuggestionIndex/);
  assert.match(source, /const slashCommandHoverClass = slashSelectionMode === "pointer"/);
  assert.match(source, /setSlashSelectionMode\("pointer"\)[\s\S]*setSlashSuggestionIndex\(index\)/);
});

test("landing slash menu selection immediately applies command continuation", async () => {
  const source = await readFile(path.join(cwd, "components/direction-two-shell.tsx"), "utf8");

  assert.match(source, /const enterAction = resolveDirectionTwoEnterAction\(command\)/);
  assert.match(source, /enterAction\?\.type === "continue-inline"/);
  assert.match(source, /setInputValue\(nextCommandValue\)/);
  assert.match(source, /setKeyboardStatus\(enterAction\?\.hint \?\? `\$\{command\} selected\.`\)/);
});

test("landing terminal Tab completion includes known command options", async () => {
  const source = await readFile(path.join(cwd, "components/direction-two-shell.tsx"), "utf8");

  assert.match(source, /completeDirectionTwoCommandArgument/);
  assert.match(source, /const commandOptionCompletion = completeDirectionTwoCommandArgument\(inputValue\)/);
  assert.match(source, /if \(commandOptionCompletion\)/);
});

test("landing slash menu selection immediately executes action commands", async () => {
  const source = await readFile(path.join(cwd, "components/direction-two-shell.tsx"), "utf8");

  assert.match(source, /slashMenuImmediateCommands = new Set\(\["\/clear"\]\)/);
  assert.match(source, /slashMenuImmediateCommands\.has\(command\)/);
  assert.match(source, /executeCommand\(command\)/);
});

test("mobile direction two uses requested spacing without changing desktop breakpoints", async () => {
  const source = await readFile(path.join(cwd, "components/direction-two-shell.tsx"), "utf8");

  assert.match(source, /className="[^"]*px-6 py-5[^"]*sm:px-10 sm:py-10/);
  assert.match(source, /max-w-\[360px\] space-y-6/);
  assert.match(source, /direction-two-mobile-terminal[^"]*pb-3[^"]*pt-11[^"]*sm:pt-12/);
});

test("mobile direction two shortens copy and scales the mark for phone width", async () => {
  const source = await readFile(path.join(cwd, "components/direction-two-shell.tsx"), "utf8");

  assert.match(source, /mobileIntroHeadline = "Create a temporary room for honest chats, quick votes, and no identity trail\."/);
  assert.match(source, /mobileText: "private rooms for known people"/);
  assert.match(source, /mobileText: "temporary spaces that expire"/);
  assert.match(source, /mobileText: "quick prompts for decisions"/);
  assert.match(source, /\[--cell:clamp\(3\.2px,0\.84vw,3\.6px\)\]/);
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

test("native terminal input text stays hidden behind the visual mirror", async () => {
  const source = await readFile(path.join(cwd, "components/direction-two-shell.tsx"), "utf8");

  assert.match(source, /WebkitTextFillColor: "transparent"/);
  assert.match(source, /color: "transparent"/);
});

test("terminal caret is rendered by the visual mirror instead of native input metrics", async () => {
  const source = await readFile(path.join(cwd, "components/direction-two-shell.tsx"), "utf8");

  assert.match(source, /direction-two-visual-caret/);
  assert.match(source, /caret-transparent/);
  assert.match(source, /aria-hidden="true"\s+className="direction-two-visual-caret/);
});
