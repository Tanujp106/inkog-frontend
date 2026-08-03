import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("keeps Interface Kit development-only and compatible with Next's React runtime", async () => {
  const [layout, config, provider, shim] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../next.config.mjs", import.meta.url), "utf8"),
    readFile(new URL("../app/interface-kit-provider.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/interface-kit-react-shim.ts", import.meta.url), "utf8"),
  ]);

  assert.match(layout, /process\.env\.NODE_ENV === "development" && <InterfaceKit \/>/);
  assert.match(config, /serverExternalPackages: \["interface-kit"\]/);
  assert.match(config, /resolveAlias:[\s\S]*react:/);
  assert.match(provider, /useEffect\(\(\) =>/);
  assert.match(provider, /import\("interface-kit\/react"\)/);
  assert.match(shim, /export \* from "next\/dist\/compiled\/react"/);
  assert.match(shim, /export function useEffectEvent/);
});
