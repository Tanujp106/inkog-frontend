import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("keeps the Direction 2 command row pinned below a scrollable transcript", async () => {
  const source = await readFile(new URL("../components/direction-two-shell.tsx", import.meta.url), "utf8");

  assert.match(source, /h-\[100dvh\].*overflow-hidden/);
  assert.match(source, /direction-two-mobile-terminal[^`]*flex min-h-0 flex-1 flex-col/);
  assert.match(source, /className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto" aria-label="Terminal output"/);
  assert.match(source, /bottom-full left-0 z-20 mb-2/);
});
