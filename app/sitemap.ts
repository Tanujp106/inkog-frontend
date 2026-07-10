import type { MetadataRoute } from "next";
import { indexablePathnames, toSiteUrl } from "@/lib/site-seo.mjs";

export default function sitemap(): MetadataRoute.Sitemap {
  return indexablePathnames.map(pathname => ({ url: toSiteUrl(pathname) }));
}
