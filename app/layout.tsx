import type { Metadata } from "next";
import { AgentationProvider } from "./agentation-provider";
import "./globals.css";
import { SystemSoundProvider } from "@/lib/system-sound-provider";

export const metadata: Metadata = {
  title: "Inkog — Honest Group Decisions",
  description: "Anonymous group chat for people who already know each other.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var theme=window.localStorage.getItem("inkog-theme");if(theme){document.documentElement.setAttribute("data-inkog-theme",theme);}}catch(_){}`,
          }}
        />
        <SystemSoundProvider>
          {children}
          <AgentationProvider />
        </SystemSoundProvider>
      </body>
    </html>
  );
}
