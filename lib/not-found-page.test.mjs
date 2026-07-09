import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("custom 404 page includes home recovery copy and broken socket illustration", async () => {
  const page = await readFile(new URL("../app/not-found.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(page, /href="\/"/);
  assert.match(page, /socket/i);
  assert.match(page, /wire/i);
  assert.match(page, /404/);
  assert.match(page, /not-found-pixel-socket/);

  assert.match(styles, /\.not-found-pixel-socket:hover/);
  assert.match(styles, /@keyframes not-found-wire-spark/);
  assert.match(styles, /@keyframes not-found-socket-hover/);
});
