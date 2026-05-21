import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Inkog — Honest Group Decisions",
  description: "Anonymous group chat for people who already know each other.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
