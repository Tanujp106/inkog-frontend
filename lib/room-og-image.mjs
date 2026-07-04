import { ImageResponse } from "next/og.js";
import React from "react";
import sharp from "sharp";

import { formatRoomOgPasswordLabel, ROOM_OG_HEIGHT, ROOM_OG_WIDTH } from "./room-og.mjs";

async function buildRoomOgTextFrame(room, fontBuffer) {
  if (!fontBuffer) {
    throw new Error("Departure Mono font data is required to render room OG text.");
  }

  const response = new ImageResponse(
    React.createElement(
      "div",
      {
        style: {
          width: `${ROOM_OG_WIDTH}px`,
          height: `${ROOM_OG_HEIGHT}px`,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          background: "transparent",
          padding: "0 0 34px 56px",
          fontFamily: "Departure Mono",
        },
      },
      React.createElement(
        "div",
        {
          style: {
            color: "#ffffff",
            fontSize: "32px",
            lineHeight: "32px",
            marginBottom: "31px",
          },
        },
        "join the honest chat",
      ),
      React.createElement(
        "div",
        {
          style: {
            color: "#ccff67",
            fontSize: "56px",
            lineHeight: "56px",
            marginBottom: "18px",
          },
        },
        String(room.topic),
      ),
      React.createElement(
        "div",
        {
          style: {
            color: "#8e8e8e",
            fontSize: "32px",
            lineHeight: "32px",
          },
        },
        formatRoomOgPasswordLabel(room.hasPassword),
      ),
    ),
    {
      width: ROOM_OG_WIDTH,
      height: ROOM_OG_HEIGHT,
      fonts: [
        {
          name: "Departure Mono",
          data: fontBuffer,
          weight: 400,
          style: "normal",
        },
      ],
    },
  );
  const textPng = Buffer.from(await response.arrayBuffer());

  return sharp(textPng)
    .ensureAlpha()
    .raw()
    .toBuffer();
}

function buildDynamicBackgroundSvg() {
  return Buffer.from(`
    <svg width="${ROOM_OG_WIDTH}" height="${ROOM_OG_HEIGHT}" viewBox="0 0 1280 630" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
      <rect x="0" y="0" width="100%" height="100%" fill="url(#dynamic-og-grad)"/>
      <defs>
        <radialGradient id="dynamic-og-grad" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="10" gradientTransform="matrix(3.8542e-15 70.3 -132.22 6.7143e-14 640 -427.5)">
          <stop stop-color="rgba(168,217,64,1)" offset="0"/>
          <stop stop-color="rgba(126,163,48,1)" offset="0.25"/>
          <stop stop-color="rgba(84,109,32,1)" offset="0.5"/>
          <stop stop-color="rgba(63,81,24,1)" offset="0.625"/>
          <stop stop-color="rgba(42,54,16,1)" offset="0.75"/>
          <stop stop-color="rgba(21,27,8,1)" offset="0.875"/>
          <stop stop-color="rgba(11,14,4,1)" offset="0.9375"/>
          <stop stop-color="rgba(0,0,0,1)" offset="1"/>
        </radialGradient>
      </defs>
    </svg>
  `);
}

async function buildRepeatedBackgroundRaw(frameCount) {
  const frame = await sharp(buildDynamicBackgroundSvg())
    .ensureAlpha()
    .raw()
    .toBuffer();
  const repeated = Buffer.alloc(frame.length * frameCount);
  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
    frame.copy(repeated, frame.length * frameIndex);
  }
  return repeated;
}

async function buildRepeatedTextRaw(room, fontBuffer, frameCount) {
  const frame = await buildRoomOgTextFrame(room, fontBuffer);
  const repeated = Buffer.alloc(frame.length * frameCount);
  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
    frame.copy(repeated, frame.length * frameIndex);
  }
  return repeated;
}

async function buildAnimatedLogoLayer(baseGif) {
  const logoSource = sharp(baseGif, { animated: true })
    .extract({ left: 150, top: 140, width: 900, height: 260 })
    .resize({ width: 492 });
  const { data: alphaMask, info: alphaMaskInfo } = await sharp(baseGif, { animated: true })
    .extract({ left: 150, top: 140, width: 900, height: 260 })
    .resize({ width: 492 })
    .greyscale()
    .threshold(150)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const rgbaMask = Buffer.alloc(alphaMask.length * 4);
  for (let index = 0; index < alphaMask.length; index += 1) {
    const rgbaIndex = index * 4;
    rgbaMask[rgbaIndex] = 255;
    rgbaMask[rgbaIndex + 1] = 255;
    rgbaMask[rgbaIndex + 2] = 255;
    rgbaMask[rgbaIndex + 3] = alphaMask[index];
  }

  const transparentLogo = await logoSource
    .ensureAlpha()
    .composite([
      {
        input: rgbaMask,
        raw: {
          width: alphaMaskInfo.width,
          height: alphaMaskInfo.height,
          channels: 4,
        },
        left: 0,
        top: 0,
        blend: "dest-in",
      },
    ])
    .gif({ loop: 0 })
    .toBuffer();

  return sharp(transparentLogo, { animated: true })
    .extend({
      top: 56,
      left: 56,
      right: ROOM_OG_WIDTH - 56 - 492,
      bottom: ROOM_OG_HEIGHT - 56 - 142,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .gif({ loop: 0 })
    .toBuffer();
}

export async function renderRoomOgGif(room, assets) {
  const logoLayer = await buildAnimatedLogoLayer(assets.baseGif);
  const logoMetadata = await sharp(logoLayer, { animated: true }).metadata();
  const frameCount = logoMetadata.pages ?? 1;
  const pageHeight = logoMetadata.pageHeight ?? ROOM_OG_HEIGHT;
  const background = await buildRepeatedBackgroundRaw(frameCount);
  const text = await buildRepeatedTextRaw(room, assets.departureMonoFont, frameCount);

  return sharp(logoLayer, { animated: true })
    .composite([
      {
        input: background,
        raw: {
          width: ROOM_OG_WIDTH,
          height: pageHeight * frameCount,
          channels: 4,
        },
        left: 0,
        top: 0,
        blend: "dest-over",
      },
      {
        input: text,
        raw: {
          width: ROOM_OG_WIDTH,
          height: pageHeight * frameCount,
          channels: 4,
        },
        left: 0,
        top: 0,
      },
    ])
    .gif({
      loop: 0,
      delay: logoMetadata.delay,
      pageHeight,
      reoptimise: true,
    })
    .toBuffer();
}
