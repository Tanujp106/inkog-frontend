import type { Metadata } from "next";
import { AgentationProvider } from "./agentation-provider";
import "dialkit/styles.css";
import "./globals.css";
import { SystemSoundProvider } from "@/lib/system-sound-provider";
import { buildInkogFaviconHref } from "@/lib/inkog-favicon.mjs";
import { PlaygroundDialRoot } from "./playground-dial-root/index";
import { ThemeFavicon } from "./theme-favicon";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "Inkog — Honest Chats, Quick Votes",
  description: "Temporary rooms for honest chats, quick votes, and no identity trails.",
  icons: {
    icon: [
      {
        url: buildInkogFaviconHref("green"),
        type: "image/svg+xml",
      },
    ],
  },
  openGraph: {
    title: "Inkog — Honest Chats, Quick Votes",
    description: "Temporary rooms for honest chats, quick votes, and no identity trails.",
    images: [
      {
        url: "/og-image.gif",
        width: 1208,
        height: 630,
        alt: "Inkog pixel logo with shimmer animation",
        type: "image/gif",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Inkog — Honest Chats, Quick Votes",
    description: "Temporary rooms for honest chats, quick votes, and no identity trails.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var theme=window.localStorage.getItem("inkog-theme");if(theme){document.documentElement.setAttribute("data-inkog-theme",theme);}}catch(_){}`,
          }}
        />
        <SystemSoundProvider>
          <ThemeFavicon />
          {children}
          <AgentationProvider />
          <PlaygroundDialRoot />
        </SystemSoundProvider>
      </body>
    </html>
  );
}
