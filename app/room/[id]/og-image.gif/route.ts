import { readFile } from "node:fs/promises";
import path from "node:path";
import { fetchRoomOgData, getRoomOgApiBaseUrl } from "@/lib/room-og.mjs";
import { renderRoomOgGif } from "@/lib/room-og-image.mjs";

export const runtime = "nodejs";

type RoomOgGifRouteContext = {
  params: Promise<{ id: string }>;
};

const baseGif = readFile(path.join(process.cwd(), "public/og-image.gif"));
const departureMonoFont = readFile(path.join(process.cwd(), "public/fonts/DepartureMono-Regular.otf"));

export async function GET(_request: Request, { params }: RoomOgGifRouteContext) {
  const { id } = await params;
  const [room, baseGifBuffer, departureMonoFontBuffer] = await Promise.all([
    fetchRoomOgData(id, getRoomOgApiBaseUrl()),
    baseGif,
    departureMonoFont,
  ]);
  const gif = await renderRoomOgGif(room, {
    baseGif: baseGifBuffer,
    departureMonoFont: departureMonoFontBuffer,
  });

  return new Response(new Uint8Array(gif), {
    headers: {
      "Cache-Control": "public, max-age=0, s-maxage=15, stale-while-revalidate=60",
      "Content-Type": "image/gif",
    },
  });
}
