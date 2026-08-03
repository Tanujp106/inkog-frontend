import type { MetadataRoute } from "next";
import { indexablePathnames, siteUrl, toSiteUrl } from "@/lib/site-seo.mjs";

export default function sitemap(): MetadataRoute.Sitemap {
  if (!siteUrl) return [];
  return indexablePathnames.map(pathname => ({ url: toSiteUrl(pathname) }));
}
