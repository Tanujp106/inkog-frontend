import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import sharp from "sharp";

import { renderRoomOgGif } from "./room-og-image.mjs";

const ROOM_OG_WIDTH = 1208;
const ROOM_OG_HEIGHT = 630;

function countTitlePixels(buffer, frameIndex) {
  const frameTop = frameIndex * ROOM_OG_HEIGHT;
  let count = 0;

  for (let y = 492; y < 546; y += 1) {
    for (let x = 50; x < 520; x += 1) {
      const index = ((frameTop + y) * ROOM_OG_WIDTH + x) * 4;
      const red = buffer[index];
      const green = buffer[index + 1];
      const blue = buffer[index + 2];
      const alpha = buffer[index + 3];
      if (red > 180 && green > 220 && blue < 140 && alpha > 220) {
        count += 1;
      }
    }
  }

  return count;
}

function measureTitleBounds(buffer, frameIndex) {
  const frameTop = frameIndex * ROOM_OG_HEIGHT;
  let minX = ROOM_OG_WIDTH;
  let maxX = -1;

  for (let y = 492; y < 546; y += 1) {
    for (let x = 50; x < 620; x += 1) {
      const index = ((frameTop + y) * ROOM_OG_WIDTH + x) * 4;
      const red = buffer[index];
      const green = buffer[index + 1];
      const blue = buffer[index + 2];
      const alpha = buffer[index + 3];
      if (red > 180 && green > 220 && blue < 140 && alpha > 220) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
      }
    }
  }

  return maxX - minX + 1;
}

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
  assert.equal(metadata.width, ROOM_OG_WIDTH);
  assert.equal(metadata.pageHeight ?? metadata.height, ROOM_OG_HEIGHT);
  assert.ok((metadata.pages ?? 1) > 1);

  const firstFrame = await sharp(gifBuffer, { animated: false })
    .ensureAlpha()
    .raw()
    .toBuffer();
  const topLeftLogoPixelIndex = (70 * 1208 + 100) * 4;
  assert.ok(firstFrame[topLeftLogoPixelIndex] > 220);
  assert.ok(firstFrame[topLeftLogoPixelIndex + 1] > 220);
  assert.ok(firstFrame[topLeftLogoPixelIndex + 2] > 220);

  const animatedFrames = await sharp(gifBuffer, { animated: true })
    .ensureAlpha()
    .raw()
    .toBuffer();
  assert.ok(countTitlePixels(animatedFrames, 0) > 100);
  assert.ok(countTitlePixels(animatedFrames, 1) > 100);
  assert.ok(measureTitleBounds(animatedFrames, 0) >= 375);
  assert.ok(measureTitleBounds(animatedFrames, 0) <= 390);
});
