"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { getAgentationConfig } from "@/lib/agentation-config.mjs";

const Agentation = dynamic(
  () => import("agentation").then(module => module.Agentation),
  { ssr: false },
);

export function AgentationProvider() {
  const [isMounted, setIsMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const config = getAgentationConfig({
    enabled: process.env.NEXT_PUBLIC_ENABLE_AGENTATION === "true",
    endpoint: process.env.NEXT_PUBLIC_AGENTATION_ENDPOINT || undefined,
    isMounted,
    nodeEnv: process.env.NODE_ENV,
    pathname,
  });

  if (!config) {
    return null;
  }

  return <Agentation className={config.className} endpoint={config.endpoint} />;
}
