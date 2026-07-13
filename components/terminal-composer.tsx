"use client";

import type { CSSProperties, KeyboardEventHandler, ReactNode, RefObject } from "react";

const TERMINAL_FONT_FAMILY = '"Departure Mono", monospace';

export interface TerminalComposerProps {
  inputId: string;
  value: string;
  prompt?: string;
  inputPrefix?: ReactNode;
  hint?: string;
  placeholder?: string;
  inputType?: "text" | "password";
  disabled?: boolean;
  expanded?: boolean;
  topContent?: ReactNode;
  inputLabel?: string;
  inputRef?: RefObject<HTMLInputElement | null>;
  ariaDescribedBy?: string;
  showIdleCursor?: boolean;
  showHint?: boolean;
  cursorVisible?: boolean;
  inputStyle?: CSSProperties;
  onValueChange: (value: string) => void;
  onSubmit: () => void;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
}

export function TerminalComposer({
  inputId,
  value,
  prompt = "$",
  inputPrefix,
  hint,
  placeholder,
  inputType = "text",
  disabled = false,
  expanded = false,
  topContent,
  inputLabel = "terminal command",
  inputRef,
  ariaDescribedBy,
  showIdleCursor = false,
  showHint = false,
  cursorVisible = true,
  inputStyle,
  onValueChange,
  onSubmit,
  onKeyDown,
}: TerminalComposerProps) {
  const showIdleContent = showIdleCursor || showHint;

  return (
    <form
      onSubmit={event => {
        event.preventDefault();
        onSubmit();
      }}
      style={styles.composer}
    >
      <div
        data-terminal-composer-state={expanded ? "expanded" : "collapsed"}
        style={{
          ...styles.composerFrame,
          minHeight: expanded ? "76px" : "56px",
        }}
      >
        {topContent}
        <div data-terminal-composer-input-row style={styles.composerRow}>
          <label htmlFor={inputId} style={styles.srOnly}>{inputLabel}</label>
          <span aria-hidden="true" style={styles.composerPrompt}>{prompt}</span>
          {inputPrefix}
          {showIdleContent ? (
            <span aria-hidden="true" style={styles.composerIdleText}>
              {showIdleCursor ? (
                <span
                  style={{
                    ...styles.composerCursor,
                    opacity: cursorVisible ? 1 : 0.18,
                  }}
                >
                  |
                </span>
              ) : null}
              {showHint && hint ? <span style={styles.composerHint}>{hint}</span> : null}
            </span>
          ) : null}
          <input
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            aria-describedby={ariaDescribedBy}
            id={inputId}
            onChange={event => onValueChange(event.target.value)}
            onKeyDown={onKeyDown}
            ref={inputRef}
            spellCheck={false}
            disabled={disabled}
            placeholder={placeholder}
            style={{ ...styles.composerInput, ...inputStyle }}
            type={inputType}
            value={value}
          />
        </div>
      </div>
    </form>
  );
}

const styles: Record<string, CSSProperties> = {
  composer: {
    display: "flex",
    flexDirection: "column",
    flexShrink: 0,
    position: "relative",
    zIndex: 1,
  },
  composerFrame: {
    backdropFilter: "blur(18px) saturate(1.22)",
    background: "linear-gradient(180deg, color-mix(in srgb, var(--bg) 70%, rgba(255, 255, 255, 0.035)) 0%, color-mix(in srgb, var(--bg-2) 62%, rgba(0, 0, 0, 0.32)) 100%)",
    borderTop: "1px solid color-mix(in srgb, var(--text-dim) 28%, transparent)",
    boxShadow: "inset 0 1px 0 color-mix(in srgb, var(--text) 5%, transparent), 0 -18px 42px rgba(0, 0, 0, 0.18)",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: 0,
    justifyContent: "center",
    minHeight: "52px",
    overflow: "hidden",
    padding: "12px clamp(32px, calc(3vw + 16px), 48px)",
    transition: "min-height 150ms cubic-bezier(0.23, 1, 0.32, 1)",
    WebkitBackdropFilter: "blur(18px) saturate(1.22)",
    width: "100%",
  },
  composerRow: {
    alignItems: "center",
    display: "flex",
    gap: "8px",
    minHeight: "24px",
    width: "100%",
  },
  composerPrompt: {
    color: "var(--accent)",
    flexShrink: 0,
    fontSize: "14px",
    lineHeight: "24px",
  },
  composerIdleText: {
    alignItems: "center",
    display: "inline-flex",
    flexShrink: 1,
    gap: 0,
    minWidth: 0,
  },
  composerCursor: {
    color: "var(--text-muted)",
    flexShrink: 0,
    fontSize: "14px",
    lineHeight: "24px",
    transition: "opacity 0.14s linear",
  },
  composerHint: {
    color: "var(--text-dim)",
    fontSize: "13px",
    lineHeight: "24px",
    marginLeft: "-3px",
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  composerInput: {
    background: "transparent",
    border: 0,
    boxShadow: "none",
    color: "var(--text)",
    flex: 1,
    fontFamily: TERMINAL_FONT_FAMILY,
    fontSize: "14px",
    lineHeight: "24px",
    minWidth: 0,
    outline: "none",
    padding: 0,
  },
  srOnly: {
    border: 0,
    clip: "rect(0, 0, 0, 0)",
    height: "1px",
    margin: "-1px",
    overflow: "hidden",
    padding: 0,
    position: "absolute",
    whiteSpace: "nowrap",
    width: "1px",
  },
};
