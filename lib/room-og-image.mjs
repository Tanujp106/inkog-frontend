import sharp from "sharp";

import { formatRoomOgPasswordLabel, ROOM_OG_HEIGHT, ROOM_OG_WIDTH } from "./room-og.mjs";

function escapeSvgText(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildFontFace(fontBuffer) {
  if (!fontBuffer) return "";
  return `
    @font-face {
      font-family: "Departure Mono";
      src: url("data:font/otf;base64,${Buffer.from(fontBuffer).toString("base64")}") format("opentype");
      font-weight: 400;
      font-style: normal;
    }
  `;
}

function buildRoomOgOverlaySvg(room, fontBuffer) {
  const topic = escapeSvgText(room.topic);
  const passwordLabel = escapeSvgText(formatRoomOgPasswordLabel(room.hasPassword));

  return Buffer.from(`
    <svg width="${ROOM_OG_WIDTH}" height="${ROOM_OG_HEIGHT}" viewBox="0 0 ${ROOM_OG_WIDTH} ${ROOM_OG_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <style>
        ${buildFontFace(fontBuffer)}
        .mono { font-family: "Departure Mono", monospace; }
      </style>
      <defs>
        <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#000000" stop-opacity="0.12"/>
          <stop offset="0.54" stop-color="#000000" stop-opacity="0"/>
          <stop offset="1" stop-color="#000000" stop-opacity="0.72"/>
        </linearGradient>
      </defs>
      <rect width="1208" height="630" fill="url(#fade)"/>
      <text class="mono" x="56" y="468" fill="#ffffff" font-size="32">join the honest chat</text>
      <text class="mono" x="56" y="536" fill="#ccff67" font-size="56">${topic}</text>
      <text class="mono" x="56" y="590" fill="#8e8e8e" font-size="32">${passwordLabel}</text>
    </svg>
  `);
}

export async function renderRoomOgGif(room, assets) {
  const overlay = buildRoomOgOverlaySvg(room, assets.departureMonoFont);

  return sharp(assets.baseGif, { animated: true })
    .resize(ROOM_OG_WIDTH, ROOM_OG_HEIGHT, { fit: "cover" })
    .composite([{ input: overlay, left: 0, top: 0 }])
    .gif({ reoptimise: true })
    .toBuffer();
}
