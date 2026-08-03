# Room OG First-Share Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure a new Inkog room link has an immediately available static Open Graph preview.

**Architecture:** Replace room-specific runtime metadata with generic invite metadata and the existing static PNG. This removes both the Render room lookup and dynamic GIF generation from the crawler path.

**Tech Stack:** Next.js Metadata API, Node test runner.

## Global Constraints

- Do not modify `inkog-backend`.
- Do not add dependencies.
- Keep `/room/[id]` noindex.

---

### Task 1: Static room share metadata

**Files:**
- Modify: `lib/room-og.mjs`
- Modify: `lib/room-og.test.mjs`
- Modify: `app/room/[id]/layout.tsx`

**Interfaces:**
- Produces: `buildRoomOgImagePath()` returns `/og-image.png`; `buildRoomOgTitle()` and `buildRoomOgDescription()` return generic share copy without a room object.

- [ ] **Step 1: Write the failing test**

```js
assert.equal(buildRoomOgImagePath("abc123"), "/og-image.png");
assert.equal(buildRoomOgTitle("Dinner vote"), "Inkog room invite");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lib/room-og.test.mjs`

Expected: failure because the current implementation emits a room-local GIF and topic-specific title.

- [ ] **Step 3: Write minimal implementation**

```js
export function buildRoomOgImagePath() { return "/og-image.png"; }
```

Remove the room API fetch and its imports from `generateMetadata`, then use the generic title, description, and static image path.

- [ ] **Step 4: Run focused verification**

Run: `node --test lib/room-og.test.mjs lib/site-seo.test.mjs lib/room-og-image.test.mjs`

Expected: all tests pass.

- [ ] **Step 5: Run a production build and inspect metadata**

Run: `NEXT_DIST_DIR=.next-build-verification npm run build`

Expected: build succeeds and no source changes beyond this task are introduced.

- [ ] **Step 6: Commit and push**

```bash
git add app/room/[id]/layout.tsx lib/room-og.mjs lib/room-og.test.mjs docs/superpowers/specs/2026-07-30-room-og-first-share-design.md docs/superpowers/plans/2026-07-30-room-og-first-share.md
git commit -m "Fix room OG first-share preview"
git push origin main
```
