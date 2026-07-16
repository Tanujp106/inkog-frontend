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
  const canvasFocusStyles = notFoundStyles.match(
    /\.not-found-breakout-canvas:focus-visible\s*\{([^}]*)\}/,
  )?.[1];

  assert.ok(canvasFocusStyles, "canvas should own a visible focus rule");
  assert.match(canvasFocusStyles, /outline-offset:\s*-\d+px/);

  assert.match(page, /NotFoundBreakout/);
  assert.doesNotMatch(page, /import Link from "next\/link"/);
  assert.doesNotMatch(page, /not-found-header|not-found-brand/);
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
  assert.ok(
    game.includes(
      '<AmbientShaderBackground className="not-found-breakout-ambient" opacity={0.3} style={{ zIndex: 0 }} />',
    ),
    "shader should keep the exact existing props",
  );
  assert.doesNotMatch(
    game,
    /!prefersReducedMotion\s*&&\s*\(\s*<AmbientShaderBackground/,
    "reduced motion must not unmount the ambient shader",
  );
  assert.match(game, /ResizeObserver/);
  assert.match(game, /resizeBreakout/);
  assert.match(game, /shouldLaunchBreakoutForKey/);
  assert.match(game, /useSystemSound/);
  assert.match(game, /createBreakoutConfetti/);
  assert.match(game, /stepBreakoutConfetti/);
  assert.match(game, /Math\.min\(window\.devicePixelRatio \|\| 1, 2\)/);

  const canvas = game.match(/<canvas[\s\S]*?\/>/)?.[0];
  assert.ok(canvas, "interactive canvas should be present");
  assert.match(canvas, /aria-describedby="not-found-breakout-status not-found-breakout-controls"/);
  assert.match(canvas, /role="application"/);
  assert.match(canvas, /tabIndex=\{0\}/);
  assert.match(game, /id="not-found-breakout-status"/);
  assert.match(game, /id="not-found-breakout-controls"/);
  assert.match(game, /aria-live="polite"/);
  assert.match(
    game,
    /className=\{hud\.mode === "cleared" \? "sr-only" : "not-found-breakout-status"\}/,
  );
  assert.match(game, /if \(mode === "cleared"\) return "404 cleared/);

  const tick = game.match(
    /const tick = \(timestamp: number\) => \{([\s\S]*?)animationFrame = window\.requestAnimationFrame\(tick\);\s*\};/,
  )?.[1];
  assert.ok(tick, "animation frame callback should be inspectable");
  assert.match(tick, /const shouldAnimateFrame =/);
  assert.match(tick, /mode === "running"/);
  assert.match(tick, /!prefersReducedMotionRef\.current/);
  assert.match(tick, /confettiRef\.current\.length > 0/);
  assert.match(game, /getBreakoutIdleBallOffset/);
  assert.match(tick, /const shouldAnimateIdle =/);
  assert.match(tick, /mode === "idle" \|\| mode === "waiting"/);
  assert.match(tick, /renderCurrentGame\(idleBallOffset\)/);
  const guardedAdvance = tick.match(/if \(shouldAnimateFrame\) \{[\s\S]*?advanceGame\(deltaSeconds\);[\s\S]*?\}/)?.[0];
  assert.ok(guardedAdvance, "state advance and redraw should stay behind the active-frame gate");
  assert.doesNotMatch(tick.replace(guardedAdvance, ""), /advanceGame\(/);

  assert.match(game, /const themeObserver = new MutationObserver\(\(\) => renderCurrentGame\(\)\)/);
  assert.match(game, /themeObserver\.observe\(document\.documentElement, \{/);
  assert.match(game, /attributeFilter: \["data-inkog-theme"\]/);
  assert.match(game, /return \(\) => themeObserver\.disconnect\(\)/);
  assert.match(game, /resizeObserver\.disconnect\(\)/);
  assert.match(game, /window\.removeEventListener\("resize", syncArena\)/);
  assert.match(game, /window\.cancelAnimationFrame\(animationFrame\)/);
  assert.match(game, /document\.removeEventListener\("visibilitychange", handleVisibilityChange\)/);
  assert.match(game, /mediaQuery\.removeEventListener\("change", syncPreference\)/);
  assert.match(game, /window\.removeEventListener\("keydown", handleKeyDown\)/);
  assert.match(game, /window\.removeEventListener\("keyup", handleKeyUp\)/);
  assert.match(game, /window\.removeEventListener\("blur", clearKeyboard\)/);

  assert.match(game, /const width = arena\.clientWidth;/);
  assert.match(game, /const height = arena\.clientHeight;/);
  assert.doesNotMatch(game, /const bounds = arena\.getBoundingClientRect\(\)/);
  assert.match(game, /mediaQuery\.matches && gameRef\.current\.mode === "cleared"/);
  assert.match(game, /spreadStaticConfetti\([\s\S]*createBreakoutConfetti/);
  assert.match(game, /clientXToBreakoutX/);
  assert.match(game, /shouldHandleBreakoutPointer/);
  assert.match(
    game,
    /shouldHandleBreakoutPointer\(event\.pointerType, pointerActiveRef\.current\)/,
  );
  assert.match(
    game,
    /clientXToBreakoutX\(event\.clientX, bounds, gameRef\.current\.width\)/,
  );
  assert.match(game, /event\.currentTarget\.setPointerCapture\(event\.pointerId\)/);
  assert.match(game, /event\.currentTarget\.focus\(\{ preventScroll: true \}\)/);
  assert.match(game, /pointerActiveRef\.current = false/);
  assert.match(game, /event\.currentTarget\.hasPointerCapture\(event\.pointerId\)/);
  assert.match(game, /event\.currentTarget\.releasePointerCapture\(event\.pointerId\)/);
  assert.match(game, /onPointerCancel=\{handlePointerUp\}/);
  assert.match(game, /onPointerUp=\{handlePointerUp\}/);

  const keyHandler = game.match(
    /const handleKeyDown = \(event: KeyboardEvent\) => \{([\s\S]*?)const handleKeyUp/,
  )?.[1];
  assert.ok(keyHandler, "keyboard handler should be inspectable");
  const restartIndex = keyHandler.indexOf('event.key.toLowerCase() === "r"');
  const interactiveGuardIndex = keyHandler.indexOf("target?.closest");
  const launchHelperIndex = keyHandler.indexOf("shouldLaunchBreakoutForKey");
  assert.ok(restartIndex >= 0 && restartIndex < interactiveGuardIndex, "R must be handled first");
  assert.ok(
    interactiveGuardIndex >= 0 && interactiveGuardIndex < launchHelperIndex,
    "interactive targets must be guarded before launch handling",
  );

  for (const [eventName, soundName] of [
    ["launch", "breakoutLaunch"],
    ["wall", "breakoutWall"],
    ["paddle", "breakoutPaddle"],
    ["brickA", "breakoutBrickA"],
    ["brickB", "breakoutBrickB"],
    ["brickC", "breakoutBrickC"],
    ["miss", "breakoutMiss"],
    ["clear", "breakoutClear"],
  ]) {
    assert.match(game, new RegExp(`${eventName}: "${soundName}"`));
  }
  assert.match(game, /for \(const event of nextState\.events\)/);
  assert.match(game, /const sound = soundByEvent\[event as BreakoutEvent\]/);
  assert.match(game, /if \(sound\) play\(sound\)/);

  const ghostPassIndex = game.indexOf("if (brick.isActive) continue");
  const activePassIndex = game.indexOf("if (!brick.isActive) continue");
  const confettiIndex = game.indexOf('if (state.mode === "cleared")');
  assert.ok(ghostPassIndex >= 0, "destroyed bricks should have a ghost rendering pass");
  assert.match(game, /context\.globalAlpha = 0\.08/);
  assert.match(game, /context\.shadowBlur = 0/);
  assert.ok(
    ghostPassIndex < activePassIndex && activePassIndex < confettiIndex,
    "ghost bricks should render before active bricks and cleared-state confetti",
  );

  const clearActions = game.match(
    /<div className="not-found-breakout-clear-actions">([\s\S]*?)<\/div>/,
  )?.[1];
  assert.ok(clearActions, "cleared state should render its focused action group");
  assert.match(clearActions, /<button[^>]*>[\s\S]*restart[\s\S]*<\/button>/i);
  assert.match(clearActions, /<Link[^>]*href="\/"[^>]*>[\s\S]*back to home[\s\S]*<\/Link>/i);
  assert.doesNotMatch(clearActions, /status|lives|controls|<p/i);

  assert.match(notFoundStyles, /\.not-found-breakout-canvas/);
  assert.doesNotMatch(notFoundStyles, /\.not-found-header|\.not-found-brand/);
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
