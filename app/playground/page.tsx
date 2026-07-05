"use client";

import type { CSSProperties, PointerEvent } from "react";
import { useRef, useState } from "react";

import { DirectionTwoShell } from "@/components/direction-two-shell";
import { playgroundDirections } from "@/lib/playground-directions.mjs";
import { useSystemSound } from "@/lib/system-sound-provider";

const sidebarMargin = 8;
type PlaygroundDirection = (typeof playgroundDirections)[number];

export default function PlaygroundPage() {
  const [activeId, setActiveId] = useState(1);
  const activeDirection = playgroundDirections.find(direction => direction.id === activeId) ?? playgroundDirections[0];

  return (
    <>
      <FloatingSidebar
        activeDirection={activeDirection}
        activeId={activeId}
        onSelect={setActiveId}
      />

      {activeId === 1 && <CurrentUiFrame />}
      {activeId === 2 && <DirectionTwoShell />}
    </>
  );
}

function CurrentUiFrame() {
  return (
    <iframe
      title="Current UI"
      src="/"
      style={styles.currentUiFrame}
    />
  );
}

function FloatingSidebar({
  activeDirection,
  activeId,
  onSelect,
}: {
  activeDirection: PlaygroundDirection;
  activeId: number;
  onSelect: (id: number) => void;
}) {
  const sidebarRef = useRef<HTMLElement | null>(null);
  const sound = useSystemSound();
  const dragRef = useRef({ pointerId: -1, offsetX: 0, offsetY: 0 });
  const [position, setPosition] = useState({ x: 16, y: 16 });
  const [isCollapsed, setIsCollapsed] = useState(false);

  const clampSidebarPosition = (x: number, y: number) => {
    const sidebar = sidebarRef.current;
    const width = sidebar?.offsetWidth ?? 238;
    const height = sidebar?.offsetHeight ?? 260;

    return {
      x: Math.min(Math.max(sidebarMargin, x), window.innerWidth - width - sidebarMargin),
      y: Math.min(Math.max(sidebarMargin, y), window.innerHeight - height - sidebarMargin),
    };
  };

  const handleDragStart = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !sidebarRef.current) return;

    const rect = sidebarRef.current.getBoundingClientRect();
    dragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleDragMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current.pointerId !== event.pointerId) return;

    setPosition(clampSidebarPosition(
      event.clientX - dragRef.current.offsetX,
      event.clientY - dragRef.current.offsetY,
    ));
  };

  const handleDragEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current.pointerId !== event.pointerId) return;

    dragRef.current.pointerId = -1;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const toggleCollapsed = () => {
    sound.play(isCollapsed ? "press" : "close");
    setIsCollapsed(collapsed => !collapsed);
    requestAnimationFrame(() => {
      setPosition(currentPosition => clampSidebarPosition(currentPosition.x, currentPosition.y));
    });
  };

  return (
    <aside
      ref={sidebarRef}
      style={{
        ...styles.sidebar,
        ...(isCollapsed ? styles.sidebarCollapsed : {}),
        left: position.x,
        top: position.y,
      }}
    >
      <div
        style={{
          ...styles.brand,
          ...(isCollapsed ? styles.brandCollapsed : {}),
        }}
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
        onPointerCancel={handleDragEnd}
      >
        <span style={styles.brandMark}>
          <span style={styles.logoText}>inkog</span>
          <span style={{ ...styles.logoDot, background: activeDirection.accent }} />
        </span>
        <button
          type="button"
          aria-label={isCollapsed ? "Expand directions" : "Collapse directions"}
          onPointerDown={event => event.stopPropagation()}
          onClick={toggleCollapsed}
          onMouseEnter={() => sound.play("hover")}
          style={styles.collapseButton}
        >
          {isCollapsed ? "+" : "-"}
        </button>
      </div>

      {!isCollapsed && (
        <nav aria-label="Design directions" style={styles.nav}>
          {playgroundDirections.map(direction => {
            const isActive = direction.id === activeId;

            return (
              <button
                key={direction.id}
                type="button"
                onClick={() => {
                  sound.play(direction.id === activeId ? "press" : "success");
                  onSelect(direction.id);
                }}
                onMouseEnter={() => sound.play("hover")}
                style={{
                  ...styles.navItem,
                  ...(isActive ? styles.navItemActive : {}),
                  borderColor: isActive ? direction.accent : "var(--border)",
                }}
              >
                <span>{direction.label}</span>
                {isActive && <span style={{ ...styles.activeMark, background: direction.accent }} />}
              </button>
            );
          })}
        </nav>
      )}
    </aside>
  );
}

const styles: Record<string, CSSProperties> = {
  currentUiFrame: {
    position: "fixed",
    inset: 0,
    width: "100vw",
    height: "100vh",
    border: 0,
    background: "var(--bg)",
  },
  sidebar: {
    position: "fixed",
    top: "16px",
    left: "16px",
    zIndex: 10000,
    width: "204px",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    background: "rgba(20, 20, 23, 0.94)",
    backdropFilter: "blur(10px)",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "18px",
    boxShadow: "0 18px 50px rgba(0, 0, 0, 0.28)",
  },
  sidebarCollapsed: {
    width: "132px",
    gap: 0,
  },
  brand: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
    paddingTop: "2px",
    paddingRight: "2px",
    paddingBottom: "8px",
    paddingLeft: "2px",
    borderBottom: "1px solid var(--border)",
    cursor: "pointer",
    touchAction: "none",
    userSelect: "none",
  },
  brandCollapsed: {
    borderBottom: 0,
    paddingBottom: "2px",
  },
  brandMark: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    minWidth: 0,
  },
  logoText: {
    fontFamily: "Syne, sans-serif",
    fontSize: "18px",
    fontWeight: 800,
    letterSpacing: 0,
  },
  logoDot: {
    width: "7px",
    height: "7px",
    borderRadius: "999px",
    display: "inline-block",
  },
  collapseButton: {
    width: "26px",
    height: "26px",
    border: "1px solid var(--border)",
    borderRadius: "6px",
    background: "var(--bg-3)",
    color: "var(--text)",
    cursor: "pointer",
    flexShrink: 0,
    fontFamily: "DM Mono, monospace",
    fontSize: "15px",
    lineHeight: 1,
  },
  nav: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  navItem: {
    minHeight: "40px",
    border: "1px solid var(--border)",
    borderRadius: "6px",
    background: "transparent",
    color: "var(--text-muted)",
    fontFamily: "DM Mono, monospace",
    fontSize: "12px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 10px",
    transition: "all 0.15s ease",
  },
  navItemActive: {
    background: "var(--bg-3)",
    color: "var(--text)",
  },
  activeMark: {
    width: "6px",
    height: "6px",
    borderRadius: "999px",
  },
};
