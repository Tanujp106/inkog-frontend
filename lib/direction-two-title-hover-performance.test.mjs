import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("sets the title hover state only once per pointer entry", () => {
  const shell = readFileSync(new URL("../components/direction-two-shell.tsx", import.meta.url), "utf8");
  const pointerMoveStart = shell.indexOf("function handleMarkPointerMove(");
  const pointerOutStart = shell.indexOf("function handleMarkPointerOut(", pointerMoveStart);
  const pointerMoveBlock = shell.slice(pointerMoveStart, pointerOutStart);

  assert.match(shell, /const magnetActiveRef = useRef<boolean>\(false\)/);
  assert.match(shell, /magnetActiveRef\.current = false;/);
  assert.match(
    pointerMoveBlock,
    /if \(!magnetActiveRef\.current\) \{\s*magnetActiveRef\.current = true;\s*markRef\.current\?\.setAttribute\("data-mark-magnet-active", "true"\);\s*\}/s,
  );
  assert.equal(
    pointerMoveBlock.match(/markRef\.current\?\.setAttribute\("data-mark-magnet-active", "true"\)/g)?.length,
    1,
  );
});
