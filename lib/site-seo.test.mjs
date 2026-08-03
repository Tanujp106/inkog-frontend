import assert from "node:assert/strict";
import fs from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import sharp from "sharp";

import * as siteSeo from "./site-seo.mjs";

const {
  aboutFaqs,
  getAboutJsonLd,
  getSiteEntityJsonLd,
  indexablePathnames,
  siteUrl,
  toSiteUrl,
} = siteSeo;

test("uses the current production URL when one is not configured", () => {
  assert.equal(siteUrl.toString(), "https://inkog.chat/");
  assert.deepEqual(indexablePathnames, ["/", "/about"]);
  assert.equal(toSiteUrl("/about"), "https://inkog.chat/about");
});

test("uses the approved homepage and About metadata copy", () => {
  assert.equal(siteSeo.SITE_TITLE, "Inkog | Private & Anonymous Temporary Chat");
  assert.equal(
    siteSeo.SITE_DESCRIPTION,
    "Create a private, time-bound room for anonymous group chat, quick polls, and honest conversations. No sign in required.",
  );
  assert.equal(siteSeo.ABOUT_TITLE, "About Inkog");
  assert.equal(
    siteSeo.ABOUT_DESCRIPTION,
    "Create a private, time-bound room for anonymous group chat, quick polls, and honest conversations. No sign in required.",
  );
});

test("builds factual site and application schema", () => {
  const graph = getSiteEntityJsonLd()["@graph"];

  assert.deepEqual(graph.map(entry => entry["@type"]), ["Organization", "WebSite"]);
  assert.equal(graph[0].description, siteSeo.SITE_DESCRIPTION);
  assert.equal(graph[1].publisher["@id"], "https://inkog.chat/#organization");
  assert.equal(typeof siteSeo.getHomeJsonLd, "function");
  assert.equal(siteSeo.getHomeJsonLd()["@type"], "WebPage");
  assert.equal(siteSeo.getHomeJsonLd().url, "https://inkog.chat/");
  assert.deepEqual(
    getAboutJsonLd()["@graph"].map(entry => entry["@type"]),
    ["WebPage", "SoftwareApplication", "FAQPage"],
  );
  assert.equal(getAboutJsonLd()["@graph"][0].url, "https://inkog.chat/about");
  assert.equal(aboutFaqs[0].question, "Does inkog require an account?");
});

test("publishes only approved URLs and a crawler policy that protects the API", () => {
  const robotsSource = fs.readFileSync(new URL("../app/robots.ts", import.meta.url), "utf8");
  const sitemapSource = fs.readFileSync(new URL("../app/sitemap.ts", import.meta.url), "utf8");

  assert.match(robotsSource, /disallow: \["\/api\/"\]/);
  assert.doesNotMatch(robotsSource, /disallow:\s*\[[^\]]*["']\/room\//);
  assert.match(sitemapSource, /indexablePathnames/);

  for (const crawler of [
    "OAI-SearchBot",
    "ChatGPT-User",
    "GPTBot",
    "PerplexityBot",
    "ClaudeBot",
    "anthropic-ai",
    "Google-Extended",
    "Bingbot",
  ]) {
    const groupStart = robotsSource.indexOf(`userAgent: "${crawler}"`);
    const nextGroupStart = robotsSource.indexOf("userAgent:", groupStart + 1);
    const groupSource = robotsSource.slice(groupStart, nextGroupStart === -1 ? undefined : nextGroupStart);

    assert.notEqual(groupStart, -1);
    assert.match(
      groupSource,
      /disallow:\s*\["\/api\/"\]/,
    );
  }

  assert.match(robotsSource, /toSiteUrl\("\/sitemap\.xml"\)/);
});

test("keeps rooms out of search while retaining the public about reference", () => {
  const rootLayout = fs.readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
  const roomLayout = fs.readFileSync(new URL("../app/room/[id]/layout.tsx", import.meta.url), "utf8");
  const aboutPage = fs.readFileSync(new URL("../app/about/page.tsx", import.meta.url), "utf8");
  const homePage = fs.readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  const homeShell = fs.readFileSync(new URL("../components/direction-two-shell.tsx", import.meta.url), "utf8");
  assert.match(rootLayout, /getSiteEntityJsonLd/);
  assert.match(rootLayout, /SITE_IMAGE_PATH/);
  assert.match(homePage, /getHomeJsonLd/);
  assert.match(roomLayout, /robots:\s*\{\s*index:\s*false,\s*follow:\s*false,\s*\}/);
  assert.match(aboutPage, /Private, anonymous chat for temporary conversations/);
  assert.match(aboutPage, /aboutFaqs/);
  assert.match(homeShell, /<h1[^>]*>\s*Private anonymous chat rooms for temporary conversations/);
});

test("uses a crawlable static 1200 by 630 social image", async () => {
  const rootLayout = fs.readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
  const aboutPage = fs.readFileSync(new URL("../app/about/page.tsx", import.meta.url), "utf8");
  const image = await sharp(await readFile(path.join(process.cwd(), "public", siteSeo.SITE_IMAGE_PATH.slice(1)))).metadata();

  assert.equal(image.width, 1200);
  assert.equal(image.height, 630);
  assert.match(rootLayout, /url: SITE_IMAGE_PATH/);
  assert.match(rootLayout, /width: 1200/);
  assert.match(rootLayout, /height: 630/);
  assert.doesNotMatch(rootLayout, /og-image\.gif/);
  assert.match(aboutPage, /url: SITE_IMAGE_PATH/);
  assert.doesNotMatch(aboutPage, /og-image\.gif/);
});

test("keeps the agent context file absolute and factual", async () => {
  const llms = await readFile(path.join(process.cwd(), "public", "llms.txt"), "utf8");

  assert.match(llms, /^# inkog/m);
  assert.match(llms, /https:\/\/inkog\.chat\//);
  assert.match(llms, /https:\/\/inkog\.chat\/about/);
  assert.match(llms, /Room URLs are private/);
  assert.doesNotMatch(llms, /inkog-chat\.vercel\.app/);
});

test("loads the requested Google Analytics tag after hydration", () => {
  const rootLayout = fs.readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");

  assert.match(rootLayout, /googletagmanager\.com\/gtag\/js\?id=/);
  assert.match(rootLayout, /G-4BBHERXLJ5/);
  assert.match(rootLayout, /gtag\(['"]config['"],\s*['"]\$\{googleAnalyticsId\}['"]\)/);
  assert.match(rootLayout, /strategy="afterInteractive"/);
});
