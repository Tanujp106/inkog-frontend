import type { Metadata } from "next";
import Script from "next/script";
import { DialRoot } from "dialkit";
import { RouteHandoffProvider } from "@/components/route-handoff-provider";
import { AgentationProvider } from "./agentation-provider";
import { InterfaceKit } from "./interface-kit-provider";
import "./globals.css";
import "dialkit/styles.css";
import { SystemSoundProvider } from "@/lib/system-sound-provider";
import { buildInkogFaviconHref } from "@/lib/inkog-favicon.mjs";
import {
  getSiteEntityJsonLd,
  SITE_DESCRIPTION,
  SITE_IMAGE_PATH,
  SITE_TITLE,
  siteUrl,
} from "@/lib/site-seo.mjs";
import { ThemeFavicon } from "./theme-favicon";

const googleAnalyticsId = "G-4BBHERXLJ5";

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: SITE_TITLE,
  applicationName: "inkog",
  description: SITE_DESCRIPTION,
  keywords: ["private anonymous chat", "temporary chat", "anonymous group chat", "quick polls"],
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: [
      {
        url: buildInkogFaviconHref("green"),
        type: "image/svg+xml",
      },
    ],
  },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
    siteName: "inkog",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: SITE_IMAGE_PATH,
        width: 1200,
        height: 630,
        alt: "inkog pixel wordmark with the tagline Honest chats. quick votes. no identity trails.",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [SITE_IMAGE_PATH],
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
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${googleAnalyticsId}');
          `}
        </Script>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var theme=window.localStorage.getItem("inkog-theme");if(theme==="crimson"){theme="green";}if(theme){document.documentElement.setAttribute("data-inkog-theme",theme);}}catch(_){}`,
          }}
        />
        <SystemSoundProvider>
          <ThemeFavicon />
          <RouteHandoffProvider>{children}</RouteHandoffProvider>
          {process.env.NODE_ENV === "development" && <DialRoot position="bottom-right" />}
          {process.env.NODE_ENV === "development" && <InterfaceKit />}
          <AgentationProvider />
        </SystemSoundProvider>
      </body>
    </html>
  );
}
