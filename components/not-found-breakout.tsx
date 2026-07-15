"use client";

import Link from "next/link";
import { PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef, useState } from "react";

import { AmbientShaderBackground } from "@/components/ambient-shader-background";
import {
  clientXToBreakoutX,
  createInitialBreakoutState,
  launchBreakout,
  movePaddle,
  resizeBreakout,
  restartBreakout,
  setPaddleFromPointer,
  shouldHandleBreakoutPointer,
  shouldLaunchBreakoutForKey,
  stepBreakout,
} from "@/lib/not-found-breakout.mjs";
import { createBreakoutConfetti, stepBreakoutConfetti } from "@/lib/not-found-confetti.mjs";
import { useSystemSound } from "@/lib/system-sound-provider";

const soundByEvent = {
  launch: "breakoutLaunch",
  wall: "breakoutWall",
  paddle: "breakoutPaddle",
  brickA: "breakoutBrickA",
  brickB: "breakoutBrickB",
  brickC: "breakoutBrickC",
  miss: "breakoutMiss",
  clear: "breakoutClear",
} as const;

type BreakoutState = ReturnType<typeof createInitialBreakoutState>;
type BreakoutMode = BreakoutState["mode"];
type BreakoutEvent = keyof typeof soundByEvent;
type BreakoutConfetti = ReturnType<typeof createBreakoutConfetti>;

declare global {
  interface Window {
    advanceTime?: (milliseconds: number) => void;
    render_game_to_text?: () => string;
  }
}

export function NotFoundBreakout() {
  const arenaRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const confettiRef = useRef<BreakoutConfetti>([]);
  const gameRef = useRef<BreakoutState>(createInitialBreakoutState());
  const keyboardRef = useRef({ left: false, right: false, shift: false });
  const pointerActiveRef = useRef(false);
  const prefersReducedMotionRef = useRef(false);
  const [hud, setHud] = useState(() => pickHud(gameRef.current));
  const { play } = useSystemSound();

  const renderCurrentGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    drawGame(
      canvas,
      gameRef.current,
      confettiRef.current,
      prefersReducedMotionRef.current,
    );
  }, []);

  const setGame = useCallback(
    (nextState: BreakoutState) => {
      const previousMode = gameRef.current.mode;

      if (nextState.mode === "cleared" && previousMode !== "cleared") {
        const particles = createBreakoutConfetti(nextState.width, nextState.height);
        confettiRef.current = prefersReducedMotionRef.current
          ? spreadStaticConfetti(particles, nextState.height)
          : particles;
      } else if (nextState.mode !== "cleared") {
        confettiRef.current = [];
      }

      for (const event of nextState.events) {
        const sound = soundByEvent[event as BreakoutEvent];
        if (sound) play(sound);
      }

      gameRef.current = nextState;
      setHud(previous => {
        const next = pickHud(nextState);
        return previous.mode === next.mode && previous.lives === next.lives ? previous : next;
      });
    },
    [play],
  );

  const advanceGame = useCallback(
    (seconds: number) => {
      let nextState = gameRef.current;

      if (nextState.mode === "running") {
        const keyboard = keyboardRef.current;
        const direction = Number(keyboard.right) - Number(keyboard.left);

        if (direction !== 0) {
          nextState = movePaddle(nextState, direction, seconds, keyboard.shift);
        }

        nextState = stepBreakout(nextState, seconds);
        setGame(nextState);
      }

      if (
        nextState.mode === "cleared"
        && !prefersReducedMotionRef.current
        && confettiRef.current.length > 0
      ) {
        confettiRef.current = stepBreakoutConfetti(
          confettiRef.current,
          seconds,
          nextState.width,
          nextState.height,
        );
      }

      renderCurrentGame();
    },
    [renderCurrentGame, setGame],
  );

  const handleRestart = useCallback(() => {
    keyboardRef.current = { left: false, right: false, shift: false };
    pointerActiveRef.current = false;
    setGame(restartBreakout(gameRef.current));
    renderCurrentGame();
  }, [renderCurrentGame, setGame]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => {
      prefersReducedMotionRef.current = mediaQuery.matches;

      if (mediaQuery.matches && gameRef.current.mode === "cleared") {
        const state = gameRef.current;
        confettiRef.current = spreadStaticConfetti(
          createBreakoutConfetti(state.width, state.height),
          state.height,
        );
      }

      renderCurrentGame();
    };

    syncPreference();
    mediaQuery.addEventListener("change", syncPreference);
    return () => mediaQuery.removeEventListener("change", syncPreference);
  }, [renderCurrentGame]);

  useEffect(() => {
    const arena = arenaRef.current;
    const canvas = canvasRef.current;
    if (!arena || !canvas) return;

    const syncArena = () => {
      const width = arena.clientWidth;
      const height = arena.clientHeight;
      if (width <= 0 || height <= 0) return;

      const previousState = gameRef.current;

      if (previousState.width !== width || previousState.height !== height) {
        if (previousState.mode === "cleared" && confettiRef.current.length > 0) {
          const scaleX = width / previousState.width;
          const scaleY = height / previousState.height;
          confettiRef.current = confettiRef.current.map(particle => ({
            ...particle,
            x: particle.x * scaleX,
            y: particle.y * scaleY,
          }));
        }

        setGame(resizeBreakout(previousState, width, height));
      }

      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const backingWidth = Math.max(1, Math.round(width * pixelRatio));
      const backingHeight = Math.max(1, Math.round(height * pixelRatio));

      if (canvas.width !== backingWidth || canvas.height !== backingHeight) {
        canvas.width = backingWidth;
        canvas.height = backingHeight;
      }

      canvas.getContext("2d")?.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      renderCurrentGame();
    };

    const resizeObserver = new ResizeObserver(() => syncArena());
    resizeObserver.observe(arena);
    syncArena();
    window.addEventListener("resize", syncArena);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", syncArena);
    };
  }, [renderCurrentGame, setGame]);

  useEffect(() => {
    const themeObserver = new MutationObserver(renderCurrentGame);
    themeObserver.observe(document.documentElement, {
      attributeFilter: ["data-inkog-theme"],
      attributes: true,
    });

    return () => themeObserver.disconnect();
  }, [renderCurrentGame]);

  useEffect(() => {
    let animationFrame = 0;
    let previousTimestamp = window.performance.now();

    const tick = (timestamp: number) => {
      const shouldAnimateFrame = !document.hidden && (
        gameRef.current.mode === "running"
        || (
          gameRef.current.mode === "cleared"
          && !prefersReducedMotionRef.current
          && confettiRef.current.length > 0
        )
      );

      if (shouldAnimateFrame) {
        const deltaSeconds = Math.min(Math.max((timestamp - previousTimestamp) / 1000, 0), 1 / 20);
        advanceGame(deltaSeconds);
      }
      previousTimestamp = timestamp;
      animationFrame = window.requestAnimationFrame(tick);
    };

    const handleVisibilityChange = () => {
      previousTimestamp = window.performance.now();
    };

    animationFrame = window.requestAnimationFrame(tick);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [advanceGame]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        if (!event.repeat) handleRestart();
        return;
      }

      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target?.closest("a, button, input, select, textarea, [contenteditable='true']")) return;

      if (event.key === "Shift") {
        keyboardRef.current.shift = true;
        return;
      }

      if (gameRef.current.mode === "cleared") return;

      const blocksLaunch = event.altKey || event.ctrlKey || event.metaKey;
      const isArrow = event.key === "ArrowLeft" || event.key === "ArrowRight";

      if (isArrow) {
        if (blocksLaunch) return;

        event.preventDefault();
        const direction = event.key === "ArrowLeft" ? -1 : 1;
        const directionKey = event.key === "ArrowLeft" ? "left" : "right";
        keyboardRef.current[directionKey] = true;
        keyboardRef.current.shift = event.shiftKey;

        if (!event.repeat) {
          let nextState = gameRef.current;
          if (
            shouldLaunchBreakoutForKey(event.key)
            && (nextState.mode === "idle" || nextState.mode === "waiting")
          ) {
            nextState = launchBreakout(nextState);
            setGame(nextState);
          }
          nextState = movePaddle(nextState, direction, 1 / 60, event.shiftKey);
          setGame(nextState);
          renderCurrentGame();
        }
        return;
      }

      if (!blocksLaunch && shouldLaunchBreakoutForKey(event.key)) {
        event.preventDefault();
        if (
          !event.repeat
          && (gameRef.current.mode === "idle" || gameRef.current.mode === "waiting")
        ) {
          setGame(launchBreakout(gameRef.current));
          renderCurrentGame();
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") keyboardRef.current.left = false;
      if (event.key === "ArrowRight") keyboardRef.current.right = false;
      if (event.key === "Shift") keyboardRef.current.shift = false;
    };

    const clearKeyboard = () => {
      keyboardRef.current = { left: false, right: false, shift: false };
    };

    window.addEventListener("keydown", handleKeyDown, { passive: false });
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", clearKeyboard);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", clearKeyboard);
    };
  }, [handleRestart, renderCurrentGame, setGame]);

  useEffect(() => {
    const renderGameToText = () => serializeGameState(gameRef.current);
    const advanceTime = (milliseconds: number) => {
      const steps = Math.max(1, Math.round(milliseconds / (1000 / 60)));
      for (let index = 0; index < steps; index += 1) advanceGame(1 / 60);
    };

    window.render_game_to_text = renderGameToText;
    window.advanceTime = advanceTime;

    return () => {
      if (window.render_game_to_text === renderGameToText) delete window.render_game_to_text;
      if (window.advanceTime === advanceTime) delete window.advanceTime;
    };
  }, [advanceGame]);

  const movePaddleFromPointer = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (!shouldHandleBreakoutPointer(event.pointerType, pointerActiveRef.current)) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      const gameX = clientXToBreakoutX(event.clientX, bounds, gameRef.current.width);
      setGame(setPaddleFromPointer(gameRef.current, gameX));
      renderCurrentGame();
    },
    [renderCurrentGame, setGame],
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      pointerActiveRef.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.focus({ preventScroll: true });
      movePaddleFromPointer(event);
    },
    [movePaddleFromPointer],
  );

  const handlePointerUp = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    pointerActiveRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  return (
    <section ref={arenaRef} className="not-found-breakout">
      <AmbientShaderBackground className="not-found-breakout-ambient" opacity={0.3} style={{ zIndex: 0 }} />

      <p
        aria-live="polite"
        className={hud.mode === "cleared" ? "sr-only" : "not-found-breakout-status"}
        id="not-found-breakout-status"
      >
        {getStatusLabel(hud.mode)}
      </p>

      <canvas
        ref={canvasRef}
        aria-describedby="not-found-breakout-status not-found-breakout-controls"
        aria-keyshortcuts="ArrowLeft ArrowRight Shift+ArrowLeft Shift+ArrowRight R Enter Space"
        aria-label={`Breakout game with a destructible pixel 404, a ball, a paddle, and ${hud.lives} lives remaining`}
        className="not-found-breakout-canvas"
        onPointerCancel={handlePointerUp}
        onPointerDown={handlePointerDown}
        onPointerMove={movePaddleFromPointer}
        onPointerUp={handlePointerUp}
        role="application"
        tabIndex={0}
      />

      <p
        className={hud.mode === "cleared" ? "sr-only" : "not-found-breakout-controls"}
        id="not-found-breakout-controls"
      >
        {hud.mode === "cleared"
          ? "Use restart or back to home."
          : "← / → move · SHIFT + ← / → faster · R restart"}
      </p>

      {hud.mode === "cleared" ? (
        <div className="not-found-breakout-clear-actions">
          <button type="button" onClick={handleRestart}>
            restart
          </button>
          <Link href="/">back to home</Link>
        </div>
      ) : (
        <>
          <p className="not-found-breakout-lives" aria-label={`${hud.lives} lives remaining`}>
            <span>lives</span>
            <span className="not-found-breakout-life-marks" aria-hidden="true">
              {Array.from({ length: 3 }, (_, life) => (
                <span data-active={life < hud.lives} key={life} />
              ))}
            </span>
          </p>

          <Link className="not-found-breakout-home" href="/">
            back to home
          </Link>
        </>
      )}
    </section>
  );
}

function pickHud(state: BreakoutState) {
  return { mode: state.mode as BreakoutMode, lives: state.lives };
}

function getStatusLabel(mode: BreakoutMode) {
  if (mode === "waiting") return "press any key to continue";
  if (mode === "cleared") return "404 cleared. Restart or go back to home.";
  if (mode === "running") return "\u00a0";
  return "press any key to start";
}

function spreadStaticConfetti(particles: BreakoutConfetti, height: number) {
  return particles.map((particle, index) => ({
    ...particle,
    y: (particle.y + (index / Math.max(particles.length, 1)) * height) % Math.max(height, 1),
  }));
}

function drawGame(
  canvas: HTMLCanvasElement,
  state: BreakoutState,
  confetti: BreakoutConfetti,
  isStaticConfetti: boolean,
) {
  const context = canvas.getContext("2d");
  if (!context) return;

  canvas.dataset.gameState = serializeGameState(state);

  const theme = window.getComputedStyle(document.documentElement);
  const border = theme.getPropertyValue("--color-border").trim() || "#2a2a32";
  const text = theme.getPropertyValue("--color-text").trim() || "#e8e8f0";
  const muted = theme.getPropertyValue("--color-dim").trim() || "#8f8f9e";
  const accent = theme.getPropertyValue("--color-signal").trim() || "#c8ff57";

  context.clearRect(0, 0, state.width, state.height);

  context.save();
  context.fillStyle = accent;
  context.globalAlpha = 0.08;
  context.shadowBlur = 0;
  for (const brick of state.bricks) {
    if (brick.isActive) continue;
    context.fillRect(brick.x, brick.y, brick.width, brick.height);
  }
  context.restore();

  context.save();
  context.fillStyle = accent;
  context.shadowBlur = 10;
  context.shadowColor = accent;
  for (const brick of state.bricks) {
    if (!brick.isActive) continue;
    context.globalAlpha = 0.72 + brick.row * 0.02;
    context.fillRect(brick.x, brick.y, brick.width, brick.height);
  }
  context.restore();

  if (state.mode !== "cleared") {
    context.fillStyle = text;
    context.fillRect(
      state.paddle.x - state.paddle.width / 2,
      state.paddle.y,
      state.paddle.width,
      state.paddle.height,
    );

    context.save();
    context.fillStyle = accent;
    context.shadowBlur = 12;
    context.shadowColor = accent;
    context.beginPath();
    context.arc(state.ball.x, state.ball.y, state.ball.radius, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  if (state.mode === "cleared") {
    const colors = [accent, text, muted, border];

    for (const particle of confetti) {
      context.save();
      context.fillStyle = colors[particle.colorIndex] ?? accent;
      context.globalAlpha = isStaticConfetti ? 0.72 : Math.min(1, particle.life / 0.6);
      context.translate(particle.x, particle.y);
      context.rotate((particle.rotation * Math.PI) / 180);
      context.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
      context.restore();
    }
  }
}

function serializeGameState(state: BreakoutState) {
  return JSON.stringify({
    coordinateSystem: `origin top-left; x increases right; y increases down; canvas ${state.width} by ${state.height}`,
    mode: state.mode,
    lives: state.lives,
    paddle: state.paddle,
    ball: state.ball,
    bricks: {
      active: state.bricks.filter(brick => brick.isActive).length,
      total: state.bricks.length,
    },
  });
}
