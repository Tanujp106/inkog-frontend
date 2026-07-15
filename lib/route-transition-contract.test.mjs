import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = relativePath => readFile(new URL(relativePath, import.meta.url), "utf8");

test("mounts one persistent route transition provider beneath the root providers", async () => {
  const layout = await source("../app/layout.tsx");
  const provider = await source("../components/route-transition-provider.tsx");

  assert.match(layout, /import \{ RouteTransitionProvider \} from "@\/components\/route-transition-provider";/);
  assert.match(layout, /<SystemSoundProvider>[\s\S]*<RouteTransitionProvider>[\s\S]*\{children\}[\s\S]*<\/RouteTransitionProvider>/);
  assert.equal((provider.match(/<AmbientShaderBackground/g) ?? []).length, 1);
});

test("keeps landing and room route files free of local shader mounts", async () => {
  const [landing, room] = await Promise.all([
    source("../components/direction-two-shell.tsx"),
    source("../app/room/[id]/page.tsx"),
  ]);

  assert.doesNotMatch(landing, /AmbientShaderBackground/);
  assert.doesNotMatch(room, /AmbientShaderBackground/);
});

test("starts create and join handoffs immediately before navigation", async () => {
  const landing = await source("../components/direction-two-shell.tsx");

  assert.match(landing, /beginRoomHandoff\(id, promptRowRef\.current\);\s*router\.push\(`\/room\/\$\{id\}`\);/);
  assert.match(landing, /beginRoomHandoff\(data\.id, promptRowRef\.current\);\s*router\.push\(`\/room\/\$\{data\.id\}`\);/);
});

test("marks both route-local composers and binds them to shared geometry tokens", async () => {
  const [provider, landing, room] = await Promise.all([
    source("../components/route-transition-provider.tsx"),
    source("../components/direction-two-shell.tsx"),
    source("../app/room/[id]/page.tsx"),
  ]);

  assert.match(provider, /routeComposerGeometry/);
  assert.match(landing, /data-route-composer="landing"/);
  assert.match(room, /data-route-composer="room"/);
  assert.match(landing, /var\(--route-composer-frame-padding\)/);
  assert.match(room, /routeComposerGeometry/);
});

test("matches the landing composer's responsive bottom anchor", async () => {
  const globals = await source("../app/globals.css");

  assert.match(globals, /\.route-transition-root \{[\s\S]*--route-composer-bottom-padding: 32px;/);
  assert.match(globals, /@media \(min-width: 640px\) \{[\s\S]*\.route-transition-root \{[\s\S]*--route-composer-bottom-padding: 52px;/);
});

test("uses the measured landing composer bottom edge for an exact room release", async () => {
  const [provider, room] = await Promise.all([
    source("../components/route-transition-provider.tsx"),
    source("../app/room/[id]/page.tsx"),
  ]);

  assert.match(provider, /setComposerBottomOffset\(window\.innerHeight - rect\.bottom\)/);
  assert.match(provider, /"--route-composer-bottom-padding": `\$\{composerBottomOffset\}px`/);
  assert.doesNotMatch(room, /return \(\) => \{\s*if \(activeRoomId === roomId\) cancelRoomHandoff\(roomId\);/);
});

test("the provider owns inert outgoing content, the composer snapshot, and final focus transfer", async () => {
  const provider = await source("../components/route-transition-provider.tsx");

  assert.match(provider, /data-route-transition-outgoing/);
  assert.match(provider, /inert/);
  assert.match(provider, /dangerouslySetInnerHTML/);
  assert.match(provider, /roomInputRef\.current\?\.focus\(\)/);
  assert.match(provider, /prefers-reduced-motion: reduce/);
});

test("preserves the landing mobile and desktop shader opacity without remounting", async () => {
  const provider = await source("../components/route-transition-provider.tsx");

  assert.match(provider, /max-width: 639px/);
  assert.match(provider, /isMobileViewport \? 0\.34 : 0\.43/);
  assert.match(provider, /pathname\.startsWith\("\/room\/"\) \? roomAmbientShaderOpacity/);
});
