import type { Metadata } from "next";
import {
  buildRoomOgDescription,
  buildRoomOgImagePath,
  buildRoomOgTitle,
  fetchRoomOgData,
  getRoomOgApiBaseUrl,
  ROOM_OG_HEIGHT,
  ROOM_OG_WIDTH,
} from "@/lib/room-og.mjs";

type RoomLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Pick<RoomLayoutProps, "params">): Promise<Metadata> {
  const { id } = await params;
  const room = await fetchRoomOgData(id, getRoomOgApiBaseUrl());
  const title = buildRoomOgTitle(room.topic);
  const description = buildRoomOgDescription(room);
  const imageUrl = buildRoomOgImagePath(id);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: [
        {
          url: imageUrl,
          width: ROOM_OG_WIDTH,
          height: ROOM_OG_HEIGHT,
          alt: `${room.topic} Inkog room invite`,
          type: "image/gif",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default function RoomLayout({ children }: RoomLayoutProps) {
  return children;
}
