"use client";

import { useEffect, useRef, useState } from "react";

import {
  buildExpiredRoomPixelCells,
  expiredRoomPixelBubbleMotion,
  getExpiredRoomPixelPhase,
} from "@/lib/expired-room-pixel-bubble.mjs";
import {
  createExpiredRoomPixelWorld,
  destroyExpiredRoomPixelWorld,
  getExpiredRoomPixelSettledCells,
  releaseExpiredRoomPixelBodies,
  stepExpiredRoomPixelWorld,
} from "@/lib/expired-room-pixel-physics.mjs";

const pixelCells = buildExpiredRoomPixelCells();
const pixelSize = 8;
const pixelGap = 2;
const pixelPitch = pixelSize + pixelGap;

type ExpiredRoomPixelPhase = ReturnType<typeof getExpiredRoomPixelPhase>;
type ExpiredRoomPixelWorld = ReturnType<typeof createExpiredRoomPixelWorld>;
type PixelColorSet = {
  foreground: string;
  signal: string;
  floor: string;
};
type CanvasSize = { width: number; height: number; dpr: number };
type BodyPosition = { position: { x: number; y: number } };
type RenderBody = BodyPosition & { angle: number };
type SettledPixel = { id: string; rotation: number; x: number; y: number };

function readPixelColors(): PixelColorSet {
  const styles = getComputedStyle(document.documentElement);
  return {
    foreground: styles.getPropertyValue("--foreground").trim() || "#e8e8f0",
    signal: styles.getPropertyValue("--color-signal").trim() || "#2f7d50",
    floor: styles.getPropertyValue("--text-dim").trim() || "#8f8f9e",
  };
}

function drawPixel(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  rotation: number,
  role: string,
  colors: PixelColorSet,
) {
  context.save();
  context.translate(Math.round(x), Math.round(y));
  context.rotate(rotation);
  context.fillStyle = colors.foreground;
  context.globalAlpha = 0.96;
  context.fillRect(-pixelSize / 2, -pixelSize / 2, pixelSize, pixelSize);
  context.restore();
}

function drawFloor(context: CanvasRenderingContext2D, size: CanvasSize, floorY: number, colors: PixelColorSet) {
  context.save();
  context.globalAlpha = 0.38;
  context.strokeStyle = colors.floor;
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(size.width * 0.14, Math.round(floorY) + 0.5);
  context.lineTo(size.width * 0.86, Math.round(floorY) + 0.5);
  context.stroke();

  context.globalAlpha = 0.24;
  context.fillStyle = colors.signal;
  for (const x of [0.26, 0.34, 0.42, 0.58, 0.66, 0.74]) {
    context.fillRect(Math.round(size.width * x), Math.round(floorY - 2), 2, 2);
  }
  context.restore();
}

export function ExpiredRoomPixelBubble() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [phase, setPhase] = useState<ExpiredRoomPixelPhase>("present");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const phaseRef = useRef<ExpiredRoomPixelPhase>("present");
  const reducedMotionRef = useRef(false);
  const frameRef = useRef<number | null>(null);

  reducedMotionRef.current = reducedMotion;

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncReducedMotion = () => setReducedMotion(query.matches);

    syncReducedMotion();
    query.addEventListener?.("change", syncReducedMotion);
    return () => query.removeEventListener?.("change", syncReducedMotion);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !stage || !context) return;

    let world: ExpiredRoomPixelWorld | null = null;
    let size: CanvasSize = { width: 300, height: 168, dpr: 1 };
    let originX = 0;
    let originY = 8;
    let floorY = 145;
    let startedAt = performance.now();
    let previousFrameAt = startedAt;
    let released = false;
    let stopped = false;
    const colors = readPixelColors();

    const setSimulationPhase = (nextPhase: ExpiredRoomPixelPhase) => {
      if (phaseRef.current === nextPhase) return;
      phaseRef.current = nextPhase;
      setPhase(nextPhase);
    };

    const draw = () => {
      if (!world) return;

      context.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
      context.clearRect(0, 0, size.width, size.height);
      context.imageSmoothingEnabled = false;
      drawFloor(context, size, floorY, colors);

      if (reducedMotionRef.current) {
        const settledCells = getExpiredRoomPixelSettledCells(pixelCells);
        settledCells.forEach((settledCell: SettledPixel, index: number) => {
          const cell = pixelCells[index];
          drawPixel(
            context,
            originX + cell.column * pixelPitch + settledCell.x + pixelSize / 2,
            originY + cell.row * pixelPitch + settledCell.y + pixelSize / 2,
            settledCell.rotation,
            cell.role,
            colors,
          );
        });
        return;
      }

      world.bodies.forEach((body: RenderBody, index: number) => {
        const cell = pixelCells[index];
        drawPixel(context, body.position.x, body.position.y, body.angle, cell.role, colors);
      });
    };

    const rebuildWorld = () => {
      const rect = stage.getBoundingClientRect();
      size = {
        dpr: Math.min(window.devicePixelRatio || 1, 2),
        height: Math.max(1, Math.round(rect.height)),
        width: Math.max(1, Math.round(rect.width)),
      };
      canvas.width = Math.round(size.width * size.dpr);
      canvas.height = Math.round(size.height * size.dpr);
      canvas.style.width = `${size.width}px`;
      canvas.style.height = `${size.height}px`;

      originX = Math.max(0, (size.width - 16 * pixelPitch) / 2);
      originY = 4;
      floorY = Math.min(145, size.height - 12);
      if (world) destroyExpiredRoomPixelWorld(world);
      world = createExpiredRoomPixelWorld({
        cells: pixelCells,
        floorY,
        height: size.height,
        originX,
        originY,
        pixelGap,
        pixelSize,
        width: size.width,
      });
      released = false;
      startedAt = performance.now();
      previousFrameAt = startedAt;
      setSimulationPhase(reducedMotionRef.current ? "interactive" : "present");
      draw();
    };

    const handleFrame = (now: number) => {
      if (stopped || !world) return;

      const elapsed = now - startedAt;
      const deltaMs = Math.min(32, Math.max(0, now - previousFrameAt));
      previousFrameAt = now;

      if (reducedMotionRef.current) {
        setSimulationPhase("interactive");
        draw();
        return;
      }

      if (!released && elapsed >= expiredRoomPixelBubbleMotion.holdMs) {
        releaseExpiredRoomPixelBodies(world, pixelCells, { originX, originY, pixelGap, pixelSize });
        released = true;
      }

      if (released) {
        stepExpiredRoomPixelWorld(world, deltaMs);
      }

      setSimulationPhase(getExpiredRoomPixelPhase(elapsed));
      draw();
      frameRef.current = window.requestAnimationFrame(handleFrame);
    };

    const resizeObserver = new ResizeObserver(rebuildWorld);
    resizeObserver.observe(stage);
    rebuildWorld();
    frameRef.current = window.requestAnimationFrame(handleFrame);

    return () => {
      stopped = true;
      resizeObserver.disconnect();
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
      if (world) destroyExpiredRoomPixelWorld(world);
      world = null;
    };
  }, [reducedMotion]);

  return (
    <div
      aria-hidden="true"
      className="expired-room-pixel-bubble"
      data-expired-pixel-phase={phase}
      ref={stageRef}
    >
      <canvas className="expired-room-pixel-canvas" ref={canvasRef} />
    </div>
  );
}
