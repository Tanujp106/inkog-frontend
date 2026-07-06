"use client";

import { DialRoot } from "dialkit";
import { usePathname } from "next/navigation";

export function PlaygroundDialRoot() {
  const pathname = usePathname();

  if (pathname !== "/playground") return null;

  return <DialRoot />;
}
