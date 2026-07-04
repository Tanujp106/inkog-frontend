import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import sharp from "sharp";

import { renderRoomOgGif } from "./room-og-image.mjs";

test("renders dynamic room OG as an animated gif using the existing gif base", async () => {
  const cwd = process.cwd();
  const gifBuffer = await renderRoomOgGif(
    {
      id: "abc123",
      topic: "Dinner vote",
      hasPassword: true,
      secondsLeft: 600,
    },
    {
      baseGif: await readFile(path.join(cwd, "public/og-image.gif")),
      departureMonoFont: await readFile(path.join(cwd, "public/fonts/DepartureMono-Regular.otf")),
    },
  );

  assert.equal(gifBuffer.subarray(0, 3).toString("ascii"), "GIF");

  const metadata = await sharp(gifBuffer, { animated: true }).metadata();
  assert.equal(metadata.format, "gif");
  assert.equal(metadata.width, 1208);
  assert.equal(metadata.pageHeight ?? metadata.height, 630);
  assert.ok((metadata.pages ?? 1) > 1);
});
