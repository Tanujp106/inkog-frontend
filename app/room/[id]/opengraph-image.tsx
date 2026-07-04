import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import {
  fetchRoomOgData,
  formatRoomOgPasswordLabel,
  getRoomOgApiBaseUrl,
  ROOM_OG_HEIGHT,
  ROOM_OG_WIDTH,
} from "@/lib/room-og.mjs";

export const runtime = "nodejs";
export const alt = "Inkog room invite";
export const contentType = "image/png";
export const size = {
  width: ROOM_OG_WIDTH,
  height: ROOM_OG_HEIGHT,
};

type RoomOgImageProps = {
  params: Promise<{ id: string }>;
};

const ogTextFont = readFile(path.join(process.cwd(), "public/fonts/DepartureMono-Regular.otf"));
const existingOgImage = readFile(path.join(process.cwd(), "public/og-image.png"));

function bufferToDataUrl(buffer: Buffer, mimeType: string) {
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

export default async function RoomOgImage({ params }: RoomOgImageProps) {
  const { id } = await params;
  const [fontBuffer, ogImageBuffer, room] = await Promise.all([
    ogTextFont,
    existingOgImage,
    fetchRoomOgData(id, getRoomOgApiBaseUrl()),
  ]);
  const existingOgImageUrl = bufferToDataUrl(ogImageBuffer, "image/png");
  const passwordLabel = formatRoomOgPasswordLabel(room.hasPassword);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 56px 54px",
          background:
            "radial-gradient(ellipse 70% 48% at 50% -34%, #a8d940 0%, #7ea330 24%, #546d20 48%, #3f5118 61%, #2a3610 74%, #151b08 86%, #0b0e04 93%, #000000 100%)",
          color: "#ffffff",
          fontFamily: "Departure Mono",
        }}
      >
        <div
          style={{
            position: "relative",
            width: 492,
            height: 164,
            overflow: "hidden",
            display: "flex",
          }}
        >
          <img
            src={existingOgImageUrl}
            alt=""
            width="690"
            height="360"
            style={{
              position: "absolute",
              width: 690,
              height: 360,
              left: -100,
              top: -94,
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            maxWidth: 1096,
            whiteSpace: "nowrap",
          }}
        >
          <div style={{ fontSize: 32, lineHeight: 1, color: "#ffffff" }}>join the honest chat</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div
              style={{
                fontSize: 56,
                lineHeight: 1,
                color: "#ccff67",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: 1096,
              }}
            >
              {room.topic}
            </div>
            <div style={{ fontSize: 32, lineHeight: 1, color: "#8e8e8e" }}>{passwordLabel}</div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Departure Mono",
          data: fontBuffer,
          style: "normal",
          weight: 400,
        },
      ],
    },
  );
}
