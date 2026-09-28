"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import styles from "./playground.module.css";

const directions = [
  ["pop", "Playful Pop", "Social and bright"],
  ["minimal", "Ultra-minimal", "Calm and exact"],
  ["brutal", "Web Brutalist", "Direct and graphic"],
  ["dream", "Dreamworld", "Warm and gentle"],
  ["arcade", "Arcade Future", "Dark and social"],
] as const;

type Point = { x: number; y: number };

export default function DirectionPicker() {
  const pickerRef = useRef<HTMLElement>(null);
  const dragRef = useRef<{ pointerX: number; pointerY: number; originX: number; originY: number } | null>(null);
  const positionRef = useRef<Point | null>(null);
  const homePositionRef = useRef<Point | null>(null);
  const [position, setPosition] = useState<Point | null>(null);

  const clamp = (point: Point): Point => {
    const picker = pickerRef.current;
    const width = picker?.offsetWidth ?? 218;
    const height = picker?.offsetHeight ?? 290;
    return {
      x: Math.max(8, Math.min(point.x, window.innerWidth - width - 8)),
      y: Math.max(8, Math.min(point.y, window.innerHeight - height - 8)),
    };
  };

  const moveTo = (point: Point) => {
    const next = clamp(point);
    positionRef.current = next;
    setPosition(next);
  };

  useEffect(() => {
    const picker = pickerRef.current;
    if (!picker) return;
    const bounds = picker.getBoundingClientRect();
    const initial = { x: bounds.left, y: bounds.top };
    homePositionRef.current = initial;
    positionRef.current = initial;
    setPosition(initial);

    const keepInView = () => {
      const current = positionRef.current;
      const element = pickerRef.current;
      if (!current || !element) return;
      const width = element.offsetWidth;
      const height = element.offsetHeight;
      const next = {
        x: Math.max(8, Math.min(current.x, window.innerWidth - width - 8)),
        y: Math.max(8, Math.min(current.y, window.innerHeight - height - 8)),
      };
      positionRef.current = next;
      setPosition(next);
    };
    window.addEventListener("resize", keepInView);
    return () => window.removeEventListener("resize", keepInView);
  }, []);

  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const current = positionRef.current ?? { x: 18, y: 18 };
    dragRef.current = { pointerX: event.clientX, pointerY: event.clientY, originX: current.x, originY: current.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const drag = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const { pointerX, pointerY, originX, originY } = dragRef.current;
    moveTo({ x: originX + event.clientX - pointerX, y: originY + event.clientY - pointerY });
  };

  const stopDrag = (event: PointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const nudge = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (homePositionRef.current) moveTo(homePositionRef.current);
      return;
    }
    const offsets: Record<string, Point> = {
      ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 },
      ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
    };
    const offset = offsets[event.key];
    if (!offset) return;
    event.preventDefault();
    const current = positionRef.current ?? { x: 18, y: 18 };
    const step = event.shiftKey ? 48 : 16;
    moveTo({ x: current.x + offset.x * step, y: current.y + offset.y * step });
  };

  return (
    <aside
      ref={pickerRef}
      className={styles.picker}
      aria-label="Playground direction selector"
      style={position ? { left: position.x, top: position.y } : undefined}
      data-positioned={position ? "true" : undefined}
    >
      <div
        className={styles.pickerTitle}
        role="button"
        tabIndex={0}
        aria-label="Move direction picker. Drag or use arrow keys. Press Enter to reset its position."
        onPointerDown={startDrag}
        onPointerMove={drag}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
        onKeyDown={nudge}
      >
        <span className={styles.dragMark} aria-hidden="true">⠿</span><b>inkog <span>/ playground</span></b><small>05 DIRECTIONS</small>
      </div>
      <fieldset>
        <legend className={styles.srOnly}>Choose a design direction</legend>
        {directions.map(([id, name, note], index) => (
          <label key={id}>
            <input type="radio" name="inkog-direction" value={id} defaultChecked={index === 0} />
            <span className={styles.pickerNumber}>0{index + 1}</span>
            <span><b>{name}</b><small>{note}</small></span>
          </label>
        ))}
      </fieldset>
    </aside>
  );
}
