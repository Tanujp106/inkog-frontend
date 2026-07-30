import type { Metadata } from "next";
import {
  buildRoomOgDescription,
  buildRoomOgImagePath,
  buildRoomOgTitle,
  ROOM_OG_HEIGHT,
  ROOM_OG_WIDTH,
} from "@/lib/room-og.mjs";

type RoomLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Pick<RoomLayoutProps, "params">): Promise<Metadata> {
  const { id } = await params;
  const title = buildRoomOgTitle();
  const description = buildRoomOgDescription();
  const imageUrl = buildRoomOgImagePath();

  return {
    title,
    description,
    alternates: {
      canonical: `/room/${encodeURIComponent(id)}`,
    },
    robots: {
      index: false,
      follow: false,
    },
    openGraph: {
      title,
      description,
      type: "website",
      images: [
        {
          url: imageUrl,
          width: ROOM_OG_WIDTH,
          height: ROOM_OG_HEIGHT,
          alt: "Inkog room invite",
          type: "image/png",
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
