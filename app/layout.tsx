import type { Metadata } from "next";
import { DialRoot } from "dialkit";
import { RouteHandoffProvider } from "@/components/route-handoff-provider";
import { AgentationProvider } from "./agentation-provider";
import { InterfaceKit } from "./interface-kit-provider";
import "dialkit/styles.css";
import "./globals.css";
import { SystemSoundProvider } from "@/lib/system-sound-provider";
import { buildInkogFaviconHref } from "@/lib/inkog-favicon.mjs";
import { getSiteEntityJsonLd, siteUrl } from "@/lib/site-seo.mjs";
import { ThemeFavicon } from "./theme-favicon";

export const metadata: Metadata = {
  ...(siteUrl ? { metadataBase: siteUrl } : {}),
  title: "inkog | Private Anonymous Chat",
  description: "Create a time-bound room for anonymous group chat, optional passwords, and quick polls. No profiles required.",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      {
        url: buildInkogFaviconHref("crimson"),
        type: "image/svg+xml",
      },
    ],
  },
  openGraph: {
    title: "inkog | Private Anonymous Chat",
    description: "Create a time-bound room for anonymous group chat, optional passwords, and quick polls. No profiles required.",
    url: "/",
    type: "website",
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
    title: "inkog | Private Anonymous Chat",
    description: "Create a time-bound room for anonymous group chat, optional passwords, and quick polls. No profiles required.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(getSiteEntityJsonLd()) }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var theme=window.localStorage.getItem("inkog-theme");if(theme==="green"){theme="crimson";}if(theme){document.documentElement.setAttribute("data-inkog-theme",theme);}}catch(_){}`,
          }}
        />
        <SystemSoundProvider>
          <ThemeFavicon />
          <RouteHandoffProvider>{children}</RouteHandoffProvider>
          {process.env.NODE_ENV === "development" && <InterfaceKit />}
          {process.env.NODE_ENV === "development" && <DialRoot />}
          <AgentationProvider />
        </SystemSoundProvider>
      </body>
    </html>
  );
}
