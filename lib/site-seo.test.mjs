import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  aboutFaqs,
  getAboutJsonLd,
  getSiteEntityJsonLd,
  indexablePathnames,
  siteUrl,
  toSiteUrl,
} from "./site-seo.mjs";

test("uses the current production URL when one is not configured", () => {
  assert.equal(siteUrl.toString(), "https://inkog-chat.vercel.app/");
  assert.deepEqual(indexablePathnames, ["/", "/about"]);
  assert.equal(toSiteUrl("/about"), "https://inkog-chat.vercel.app/about");
});

test("builds factual site and application schema", () => {
  const graph = getSiteEntityJsonLd()["@graph"];

  assert.deepEqual(graph.map(entry => entry["@type"]), ["Organization", "WebSite"]);
  assert.deepEqual(
    getAboutJsonLd()["@graph"].map(entry => entry["@type"]),
    ["SoftwareApplication", "FAQPage"],
  );
  assert.equal(aboutFaqs[0].question, "Does inkog require an account?");
});

test("publishes only approved URLs and a crawler policy that protects the API", () => {
  const robotsSource = fs.readFileSync(new URL("../app/robots.ts", import.meta.url), "utf8");
  const sitemapSource = fs.readFileSync(new URL("../app/sitemap.ts", import.meta.url), "utf8");

  assert.match(robotsSource, /disallow: \["\/api\/"\]/);
  assert.match(robotsSource, /userAgent: "OAI-SearchBot"/);
  assert.doesNotMatch(robotsSource, /disallow:\s*\[[^\]]*["']\/room\//);
  assert.match(sitemapSource, /indexablePathnames/);

  for (const crawler of ["OAI-SearchBot", "GPTBot", "PerplexityBot", "ClaudeBot", "Google-Extended"]) {
    const groupStart = robotsSource.indexOf(`userAgent: "${crawler}"`);
    const nextGroupStart = robotsSource.indexOf("userAgent:", groupStart + 1);
    const groupSource = robotsSource.slice(groupStart, nextGroupStart === -1 ? undefined : nextGroupStart);

    assert.notEqual(groupStart, -1);
    assert.match(
      groupSource,
      /disallow:\s*\["\/api\/"\]/,
    );
  }
});

test("keeps rooms out of search while retaining the public about reference", () => {
  const rootLayout = fs.readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
  const roomLayout = fs.readFileSync(new URL("../app/room/[id]/layout.tsx", import.meta.url), "utf8");
  const aboutPage = fs.readFileSync(new URL("../app/about/page.tsx", import.meta.url), "utf8");
  assert.match(rootLayout, /getSiteEntityJsonLd/);
  assert.match(roomLayout, /robots:\s*\{\s*index:\s*false,\s*follow:\s*false,\s*\}/);
  assert.match(aboutPage, /Private, anonymous chat for temporary conversations/);
  assert.match(aboutPage, /aboutFaqs/);
});
