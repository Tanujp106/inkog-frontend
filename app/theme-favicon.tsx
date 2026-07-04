"use client";

import { useEffect } from "react";

import { buildInkogFaviconHref, defaultInkogFaviconTheme } from "@/lib/inkog-favicon.mjs";

const faviconLinkId = "inkog-dynamic-favicon";
const faviconSelector = 'link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]';

function currentThemeId() {
  return document.documentElement.getAttribute("data-inkog-theme") ?? defaultInkogFaviconTheme;
}

function applyThemeFavicon() {
  const themeId = currentThemeId();
  const href = `${buildInkogFaviconHref(themeId)}#${themeId}`;
  const iconLinks = Array.from(document.querySelectorAll<HTMLLinkElement>(faviconSelector));
  let link = document.querySelector<HTMLLinkElement>(`#${faviconLinkId}`);

  if (!link) {
    link = iconLinks[0] ?? document.createElement("link");
    link.id = faviconLinkId;
    link.rel = "icon";
    if (!link.parentNode) {
      document.head.appendChild(link);
    }
  }

  [link, ...iconLinks.filter(iconLink => iconLink !== link)].forEach(iconLink => {
    iconLink.rel = "icon";
    iconLink.type = "image/svg+xml";
    iconLink.href = href;
    iconLink.removeAttribute("sizes");
  });
}

export function ThemeFavicon() {
  useEffect(() => {
    applyThemeFavicon();

    const observer = new MutationObserver(applyThemeFavicon);
    observer.observe(document.documentElement, {
      attributeFilter: ["data-inkog-theme"],
      attributes: true,
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
