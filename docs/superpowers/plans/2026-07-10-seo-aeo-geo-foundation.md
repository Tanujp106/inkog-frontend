# Inkog SEO, AEO, and GEO Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `https://inkog.chat` discoverable and understandable to search and AI answer engines without exposing temporary room content or creating a second designed product surface.

**Architecture:** Keep the existing homepage as the only designed entry experience. Add one plain, unlinked, server-rendered `/about` reference page, plus Next.js metadata routes for crawl discovery. Put the canonical site URL and public-route inventory in a small pure helper so metadata, schema, sitemap, and tests cannot drift apart.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, static JSON-LD, Node's built-in test runner.

## Global Constraints

- Canonical production URL: `https://inkog.chat`; production `NEXT_PUBLIC_SITE_URL` must equal this URL.
- Indexable URLs are only `/` and `/about`; `/about` is unlinked from the homepage and has no route-specific visual design.
- Every `/room/[id]` remains shareable with its current Open Graph image but emits `noindex, nofollow` and is excluded from the sitemap.
- Public pages allow traditional and AI search/training crawlers. `robots.txt` must disallow `/api/`, but must not disallow `/room/`; compliant crawlers need to fetch room pages to see their noindex directive.
- Public copy may say anonymous, private, time-bound, password-optional, profile-free, and poll-capable. Do not claim automatic deletion, message retention rules, end-to-end encryption, IP anonymity, or legal/privacy guarantees not established in the product source of truth.
- Preserve the homepage's current visual composition and all existing room behavior. Accessibility changes are semantic only: no redesign and no new dependencies.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `lib/site-seo.mjs` | Canonical URL, indexable-path inventory, and JSON-LD data factories. |
| `lib/site-seo.test.mjs` | Unit coverage for URLs, sitemap inventory, and schema facts. |
| `app/layout.tsx` | Root metadata, canonical homepage metadata, and site/entity JSON-LD. |
| `app/robots.ts` | Generated crawler policy at `/robots.txt`. |
| `app/sitemap.ts` | Generated canonical URL list at `/sitemap.xml`. |
| `app/about/page.tsx` | Plain, semantic, unlinked product reference page and visible FAQ. |
| `public/llms.txt` | Concise, agent-readable index of only public material. |
| `app/room/[id]/layout.tsx` | Retain social previews while adding a room-level noindex directive. |
| `app/page.tsx`, `app/room/[id]/page.tsx` | Targeted labels, landmarks, and polite status announcements. |

### Task 1: Create the canonical SEO model

**Files:**
- Create: `inkog-frontend/lib/site-seo.mjs`
- Create: `inkog-frontend/lib/site-seo.test.mjs`

**Interfaces:**
- Produces `siteUrl: URL`, `indexablePathnames: readonly ["/", "/about"]`, `aboutFaqs`, `toSiteUrl(pathname)`, `getSiteEntityJsonLd()`, and `getAboutJsonLd()`.
- Consumers: root layout, metadata routes, and `/about`.

- [ ] **Step 1: Write the failing unit tests.**

```js
import assert from "node:assert/strict";
import test from "node:test";
import {
  getAboutJsonLd,
  getSiteEntityJsonLd,
  aboutFaqs,
  indexablePathnames,
  siteUrl,
  toSiteUrl,
} from "./site-seo.mjs";

test("uses inkog.chat and only the approved public URLs", () => {
  assert.equal(siteUrl.toString(), "https://inkog.chat/");
  assert.deepEqual(indexablePathnames, ["/", "/about"]);
  assert.equal(toSiteUrl("/about"), "https://inkog.chat/about");
});

test("builds factual site and application schema", () => {
  const graph = getSiteEntityJsonLd()["@graph"];
  assert.deepEqual(graph.map(entry => entry["@type"]), ["Organization", "WebSite"]);
  assert.deepEqual(getAboutJsonLd()["@graph"].map(entry => entry["@type"]), ["SoftwareApplication", "FAQPage"]);
  assert.equal(aboutFaqs[0].question, "Does inkog require an account?");
});
```

- [ ] **Step 2: Run the test and confirm it fails.**

Run: `cd /Users/tanuj/Desktop/Incog/inkog-frontend && node --test lib/site-seo.test.mjs`

Expected: failure because `site-seo.mjs` does not exist.

- [ ] **Step 3: Implement the single source of truth.**

```js
export const siteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://inkog.chat");
export const indexablePathnames = Object.freeze(["/", "/about"]);
export const aboutFaqs = Object.freeze([
  { question: "Does inkog require an account?", answer: "No. inkog is built for anonymous participation without profiles." },
  { question: "Are rooms permanent?", answer: "No. Rooms are time-bound and focused on the current conversation." },
  { question: "Can a room use a password?", answer: "Yes. Room creators can choose an optional password." },
  { question: "Can groups make polls?", answer: "Yes. Active rooms can create polls with a question and at least two options." },
]);

export function toSiteUrl(pathname) {
  return new URL(pathname, siteUrl).toString();
}

export function getSiteEntityJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", name: "inkog", url: siteUrl.toString() },
      { "@type": "WebSite", name: "inkog", url: siteUrl.toString() },
    ],
  };
}

export function getAboutJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: "inkog",
        applicationCategory: "CommunicationApplication",
        operatingSystem: "Web",
        url: toSiteUrl("/"),
        description: "Private, anonymous chat for temporary conversations without profiles.",
      },
      {
        "@type": "FAQPage",
        mainEntity: aboutFaqs.map(({ question, answer }) => ({
          "@type": "Question",
          name: question,
          acceptedAnswer: { "@type": "Answer", text: answer },
        })),
      },
    ],
  };
}
```

Keep the implementation static and factual. Do not add social profiles, ratings, offers, founder data, or claims the product has not published.

- [ ] **Step 4: Run the unit test and confirm it passes.**

Run: `cd /Users/tanuj/Desktop/Incog/inkog-frontend && node --test lib/site-seo.test.mjs`

Expected: two passing tests.

- [ ] **Step 5: Commit the isolated foundation.**

```bash
git add lib/site-seo.mjs lib/site-seo.test.mjs
git commit -m "feat: define inkog public search metadata"
```

### Task 2: Implement crawl discovery and AI-readable context

**Files:**
- Create: `inkog-frontend/app/robots.ts`
- Create: `inkog-frontend/app/sitemap.ts`
- Create: `inkog-frontend/public/llms.txt`
- Modify: `inkog-frontend/lib/site-seo.test.mjs`

**Interfaces:**
- `robots()` returns Next `MetadataRoute.Robots` for `/robots.txt`.
- `sitemap()` returns Next `MetadataRoute.Sitemap` for `/sitemap.xml`.
- `llms.txt` links only to `/` and `/about` and never names a room URL.

- [ ] **Step 1: Extend the test with the crawl inventory contract.**

```js
import fs from "node:fs";

test("publishes only approved URLs and a crawler policy that protects the API", () => {
  const robotsSource = fs.readFileSync(new URL("../app/robots.ts", import.meta.url), "utf8");
  const sitemapSource = fs.readFileSync(new URL("../app/sitemap.ts", import.meta.url), "utf8");
  assert.match(robotsSource, /disallow: \["\/api\/"\]/);
  assert.match(robotsSource, /userAgent: "OAI-SearchBot"/);
  assert.doesNotMatch(robotsSource, /disallow:\s*\[[^\]]*["']\/room\//);
  assert.match(sitemapSource, /indexablePathnames/);
});
```

- [ ] **Step 2: Run the focused test.**

Run: `cd /Users/tanuj/Desktop/Incog/inkog-frontend && node --test lib/site-seo.test.mjs`

Expected: failure because `app/robots.ts` and `app/sitemap.ts` do not exist.

- [ ] **Step 3: Add generated robots and sitemap routes.**

```ts
// app/robots.ts
import type { MetadataRoute } from "next";
import { toSiteUrl } from "@/lib/site-seo.mjs";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/api/"] },
      { userAgent: "OAI-SearchBot", allow: "/" },
      { userAgent: "GPTBot", allow: "/" },
      { userAgent: "PerplexityBot", allow: "/" },
      { userAgent: "ClaudeBot", allow: "/" },
      { userAgent: "Google-Extended", allow: "/" },
    ],
    sitemap: toSiteUrl("/sitemap.xml"),
  };
}

// app/sitemap.ts
import type { MetadataRoute } from "next";
import { indexablePathnames, toSiteUrl } from "@/lib/site-seo.mjs";

export default function sitemap(): MetadataRoute.Sitemap {
  return indexablePathnames.map(pathname => ({ url: toSiteUrl(pathname) }));
}
```

Do not add `Disallow: /room/`: room metadata supplies noindex. Do not include dynamic rooms, playground, APIs, or an auto-changing `lastModified` timestamp in the sitemap.

- [ ] **Step 4: Add minimal AI context.**

```text
# inkog

inkog is private, anonymous chat for temporary conversations. Create a room, share its link, talk without profiles, and use quick polls when a group needs a decision.

## Public pages
- [Home](https://inkog.chat/): Start or join a temporary room.
- [About inkog](https://inkog.chat/about): Product facts, privacy boundaries, and frequently asked questions.

## Boundaries
- Room URLs are private, temporary conversation spaces and are not part of this public knowledge index.
- Do not infer guarantees about encryption, deletion, or data retention beyond the public pages.
```

- [ ] **Step 5: Run focused tests and build.**

Run: `cd /Users/tanuj/Desktop/Incog/inkog-frontend && node --test lib/site-seo.test.mjs && npm run build`

Expected: tests pass and Next emits `/robots.txt` and `/sitemap.xml` without type errors.

- [ ] **Step 6: Commit crawl foundations.**

```bash
git add app/robots.ts app/sitemap.ts public/llms.txt lib/site-seo.test.mjs
git commit -m "feat: add inkog crawl and AI discovery files"
```

### Task 3: Add metadata, schema, and the plain `/about` reference page

**Files:**
- Modify: `inkog-frontend/app/layout.tsx`
- Modify: `inkog-frontend/app/room/[id]/layout.tsx`
- Create: `inkog-frontend/app/about/page.tsx`
- Modify: `inkog-frontend/lib/site-seo.test.mjs`

**Interfaces:**
- Root metadata describes the homepage and establishes `https://inkog.chat/` as canonical.
- `/about` overrides its canonical URL with `https://inkog.chat/about`.
- Room metadata preserves the existing dynamic social preview and adds `robots: { index: false, follow: false }`.

- [ ] **Step 1: Write checks for the about schema and room privacy directive.**

```js
import fs from "node:fs";

test("keeps room links out of search results while retaining a public about route", () => {
  const roomLayout = fs.readFileSync(new URL("../app/room/[id]/layout.tsx", import.meta.url), "utf8");
  const aboutPage = fs.readFileSync(new URL("../app/about/page.tsx", import.meta.url), "utf8");
  assert.match(roomLayout, /robots:\s*\{\s*index:\s*false,\s*follow:\s*false\s*\}/);
  assert.match(aboutPage, /Private, anonymous chat for temporary conversations/);
});
```

- [ ] **Step 2: Run the test and confirm it fails.**

Run: `cd /Users/tanuj/Desktop/Incog/inkog-frontend && node --test lib/site-seo.test.mjs`

Expected: failure because the room robots directive and about page do not exist.

- [ ] **Step 3: Update root and room metadata.**

Use `siteUrl` and `getSiteEntityJsonLd()` in `app/layout.tsx`. Set `metadataBase` to `siteUrl`, set the root canonical to `/`, preserve the existing icon and share-image values, and render the schema using a static `application/ld+json` script. Add this to the object returned by `generateMetadata` in `app/room/[id]/layout.tsx`:

```ts
robots: {
  index: false,
  follow: false,
},
```

Keep the existing room title, description, Open Graph image, and Twitter card intact. Do not place room URLs in root schema or in the sitemap.

- [ ] **Step 4: Add the unlinked `/about` page.**

Implement a server component with only semantic HTML: `<main>`, `<article>`, one `<h1>`, descriptive `<h2>` sections, a visible definition paragraph, an ordered "how it works" list, and a visible FAQ. Do not add route-specific CSS, navigation, a footer, decorative media, or a call-to-action.

```tsx
import type { Metadata } from "next";
import { aboutFaqs, getAboutJsonLd } from "@/lib/site-seo.mjs";

export const metadata: Metadata = {
  title: "About inkog",
  description: "How inkog supports private, anonymous, time-bound group conversations.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <main>
      <article>
        <h1>Private, anonymous chat for temporary conversations</h1>
        <p>inkog lets a group create a time-bound room, share a link, and talk under anonymous aliases instead of profiles.</p>
        <h2>How inkog works</h2>
        <ol>
          <li>Create a room and choose its duration, participant limit, and optional password.</li>
          <li>Share the room link with the people who should join.</li>
          <li>Chat or run a poll while the room is active.</li>
        </ol>
        <h2>Questions about inkog</h2>
        {aboutFaqs.map(({ question, answer }) => <section key={question}><h3>{question}</h3><p>{answer}</p></section>)}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(getAboutJsonLd()) }} />
      </article>
    </main>
  );
}
```

Add the existing Open Graph and Twitter defaults to the `/about` metadata only if the inherited root values do not remain present after the route override. The visible `aboutFaqs` array and `FAQPage` JSON-LD must remain the same source of truth.

- [ ] **Step 5: Run the unit test and production build.**

Run: `cd /Users/tanuj/Desktop/Incog/inkog-frontend && node --test lib/site-seo.test.mjs lib/room-og.test.mjs && npm run build`

Expected: all tests pass and the production build completes.

- [ ] **Step 6: Commit public search surfaces.**

```bash
git add app/layout.tsx 'app/room/[id]/layout.tsx' app/about/page.tsx lib/site-seo.test.mjs
git commit -m "feat: add inkog public metadata and about page"
```

### Task 4: Improve accessibility without changing the experience

**Files:**
- Modify: `inkog-frontend/app/page.tsx`
- Modify: `inkog-frontend/app/room/[id]/page.tsx`
- Modify: `inkog-frontend/lib/direction-one-contract.test.mjs`

**Interfaces:**
- Visible control text remains the accessible name for normal buttons.
- Icon-only close controls receive explicit names.
- Help and room composer status changes use a polite live region; transcript messages are not converted into a noisy live region.

- [ ] **Step 1: Add source-level regression expectations.**

```js
assert.match(homePage, /aria-label="Close new room form"/);
assert.match(homePage, /aria-label="Close join room form"/);
assert.match(homePage, /role="status" aria-live="polite"/);
assert.match(roomPage, /aria-describedby="room-composer-status"/);
```

Read `app/page.tsx` and `app/room/[id]/page.tsx` in the test before making these assertions, following the existing source-contract test pattern.

- [ ] **Step 2: Run the focused contract test and confirm it fails.**

Run: `cd /Users/tanuj/Desktop/Incog/inkog-frontend && node --test lib/direction-one-contract.test.mjs`

Expected: failure until the required labels and live regions exist.

- [ ] **Step 3: Apply targeted semantic fixes.**

In `app/page.tsx`, mark the decorative logo dot `aria-hidden`, give each close `X` button its specific `aria-label`, put help-answer output in `role="status" aria-live="polite"`, and expose loading with `aria-busy={helpLoading}` on the help surface.

In `app/room/[id]/page.tsx`, retain the existing `<label htmlFor="room-terminal-input">`, associate the input with its visible inline status using `aria-describedby`, and make that status a polite live region. Retain the existing labels for transcript, room meter, roster, polls, and command suggestions. Do not add ARIA labels to controls whose visible text or associated label already supplies an accurate accessible name.

```tsx
<button aria-label="Close new room form" type="button">✕</button>
<button aria-label="Close join room form" type="button">✕</button>
<p role="status" aria-live="polite">{helpAnswer}</p>

<input
  aria-describedby="room-composer-status"
  // Preserve the existing value, handlers, and visual styles.
/>
<p id="room-composer-status" role="status" aria-live="polite">
  {composerChrome.statusMode === "inline" ? (composerStatus?.message ?? "") : ""}
</p>
```

- [ ] **Step 4: Run accessibility regressions and build.**

Run: `cd /Users/tanuj/Desktop/Incog/inkog-frontend && node --test lib/direction-one-contract.test.mjs && npm run build`

Expected: tests pass; build passes with no new dependencies.

- [ ] **Step 5: Commit the semantic improvements.**

```bash
git add app/page.tsx 'app/room/[id]/page.tsx' lib/direction-one-contract.test.mjs
git commit -m "feat: improve inkog accessibility semantics"
```

### Task 5: Verify the live public contract and complete launch setup

**Files:**
- Modify: deployment environment configuration outside the repository: set `NEXT_PUBLIC_SITE_URL=https://inkog.chat`

**Interfaces:**
- Deployed routes: `/`, `/about`, `/robots.txt`, `/sitemap.xml`, and `/llms.txt`.
- Deployed rooms: retain share previews while returning an HTML `noindex, nofollow` robots directive.

- [ ] **Step 1: Run the full local regression set.**

Run: `cd /Users/tanuj/Desktop/Incog/inkog-frontend && node --test lib/*.test.mjs && npm run build`

Expected: all existing Node tests and the production build pass.

- [ ] **Step 2: Verify the running local app on its existing port.**

Use the existing `http://127.0.0.1:3000` listener. Check:

```bash
curl -s http://127.0.0.1:3000/robots.txt
curl -s http://127.0.0.1:3000/sitemap.xml
curl -s http://127.0.0.1:3000/llms.txt
curl -s http://127.0.0.1:3000/about
```

Expected: robots permits public crawlers and disallows `/api/`; sitemap lists only `/` and `/about`; `llms.txt` has no room URL; about has one logical heading hierarchy and visible FAQ text.

- [ ] **Step 3: Inspect rendered accessibility and robots metadata.**

In the browser accessibility tree, confirm named close buttons, a labelled landing help input, a polite help answer status, and the room composer's existing label plus its linked status description. Create or open a test room through the app, inspect its page source, and confirm the room's social image metadata remains while `<meta name="robots" content="noindex, nofollow">` is present.

- [ ] **Step 4: Validate the deployed domain.**

After deployment, verify `https://inkog.chat/robots.txt`, `/sitemap.xml`, `/llms.txt`, and `/about`; validate JSON-LD with the [Schema.org Validator](https://validator.schema.org/); verify the domain in Google Search Console and Bing Webmaster Tools; submit `https://inkog.chat/sitemap.xml` to both.

- [ ] **Step 5: Confirm the final change scope.**

Run: `cd /Users/tanuj/Desktop/Incog/inkog-frontend && git status --short`

Expected: only the files named by Tasks 1-4 are staged or modified for this feature. Task 5 itself changes deployment configuration and performs validation, so it does not create a repository commit.

## Self-Review

- Every requested foundation is covered: canonical metadata, `robots.txt`, sitemap, `llms.txt`, structured data, ARIA, and plain `/about`.
- Private room handling is covered in metadata, sitemap exclusion, robots design, tests, and live verification.
- No task adds a designed subpage, external marketing content, runtime dependency, or unsupported privacy claim.
- The plan deliberately treats `llms.txt` as a cross-agent reference file, not a Google ranking mechanism; Google's guidance continues to prioritize crawlable, people-first content and technical SEO.
