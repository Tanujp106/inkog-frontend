import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("custom 404 page mounts the pixel breakout game and keeps both home links", async () => {
  const page = await readFile(new URL("../app/not-found.tsx", import.meta.url), "utf8");
  const game = await readFile(new URL("../components/not-found-breakout.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const notFoundStyles = styles.slice(
    styles.indexOf(".not-found-page"),
    styles.indexOf("@keyframes direction-two-password-reveal"),
  );

  assert.match(page, /NotFoundBreakout/);
  assert.match(page, /href="\/"/);
  assert.doesNotMatch(page, /socket|wire|cable gossip/i);

  assert.match(game, /press any key to start/);
  assert.match(game, /back to home/i);
  assert.match(game, /className="not-found-breakout-home" href="\/"/);
  assert.match(game, /← \/ → move · SHIFT \+ ← \/ → faster · R restart/);
  assert.match(game, /!event\.repeat/);
  assert.match(game, /\$\{hud\.lives\} lives remaining/);
  assert.match(game, /render_game_to_text/);
  assert.match(game, /advanceTime/);
  assert.match(game, /<canvas/);
  assert.match(game, /AmbientShaderBackground/);
  assert.match(game, /ResizeObserver/);
  assert.match(game, /resizeBreakout/);
  assert.match(game, /shouldLaunchBreakoutForKey/);
  assert.match(game, /useSystemSound/);
  assert.match(game, /createBreakoutConfetti/);
  assert.match(game, /stepBreakoutConfetti/);
  assert.match(game, /Math\.min\(window\.devicePixelRatio \|\| 1, 2\)/);

  for (const soundName of [
    "breakoutLaunch",
    "breakoutWall",
    "breakoutPaddle",
    "breakoutBrickA",
    "breakoutBrickB",
    "breakoutBrickC",
    "breakoutMiss",
    "breakoutClear",
  ]) {
    assert.match(game, new RegExp(soundName));
  }

  const clearActions = game.match(
    /<div className="not-found-breakout-clear-actions">([\s\S]*?)<\/div>/,
  )?.[1];
  assert.ok(clearActions, "cleared state should render its focused action group");
  assert.match(clearActions, /<button[^>]*>[\s\S]*restart[\s\S]*<\/button>/i);
  assert.match(clearActions, /<Link[^>]*href="\/"[^>]*>[\s\S]*back to home[\s\S]*<\/Link>/i);
  assert.doesNotMatch(clearActions, /status|lives|controls|<p/i);

  assert.match(notFoundStyles, /\.not-found-breakout-canvas/);
  assert.match(notFoundStyles, /min-height: 100dvh/);
  assert.match(notFoundStyles, /width: 100%/);
  assert.match(notFoundStyles, /border-bottom: 1px solid/);
  assert.match(notFoundStyles, /env\(safe-area-inset-/);
  assert.doesNotMatch(notFoundStyles, /linear-gradient\(rgba\(255, 255, 255, 0\.022\)/);
  assert.doesNotMatch(notFoundStyles, /background-size: 20px 20px/);
  assert.doesNotMatch(notFoundStyles, /\.not-found-breakout-frame/);
  assert.doesNotMatch(notFoundStyles, /aspect-ratio: 20 \/ 13/);
  assert.doesNotMatch(notFoundStyles, /background:\s*color-mix\(in srgb, var\(--color-panel\)/);
  assert.doesNotMatch(notFoundStyles, /box-shadow:/);
  assert.doesNotMatch(game, /for \(let x = 20\.5/);
  assert.doesNotMatch(game, /for \(let y = 20\.5/);
  assert.doesNotMatch(styles, /\.not-found-pixel-socket/);
  assert.doesNotMatch(styles, /@keyframes not-found-wire-spark/);
});
