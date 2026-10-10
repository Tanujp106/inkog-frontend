"use client";

import { useLayoutEffect, type RefObject } from "react";

/** Keep an expanding wrapper matched to its content instead of a fixed max-height. */
export function useMeasuredExpansion(
  open: boolean,
  wrapperRef: RefObject<HTMLDivElement | null>,
  contentRef: RefObject<HTMLDivElement | null>,
) {
  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    const content = contentRef.current;
    if (!wrapper || !content) return;

    const syncHeight = () => {
      wrapper.style.height = `${open ? Math.ceil(content.getBoundingClientRect().height) : 0}px`;
    };

    syncHeight();
    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(syncHeight);
    observer.observe(content);
    return () => observer.disconnect();
  }, [open, wrapperRef, contentRef]);
}
