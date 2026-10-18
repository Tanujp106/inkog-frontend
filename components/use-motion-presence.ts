"use client";

import { useEffect, useState } from "react";

/** Retain a closing surface long enough to reverse its CSS transition. */
export function useMotionPresence(open: boolean, exitMs: number) {
  const [present, setPresent] = useState(open);
  const [visible, setVisible] = useState(open);

  useEffect(() => {
    if (open) {
      setPresent(true);
      const frame = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(frame);
    }

    setVisible(false);
    if (!present) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => setPresent(false), reduced ? 110 : exitMs);
    return () => window.clearTimeout(timer);
  }, [open, present, exitMs]);

  return { present: open || present, visible: open && visible };
}
