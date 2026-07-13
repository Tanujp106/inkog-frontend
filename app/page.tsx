"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { TerminalComposer } from "@/components/terminal-composer";
import { askInkogHelp } from "@/lib/inkog-help-api";
import {
  advanceLandingCreateSession,
  getLandingInlineTemplate,
  getLandingSlashCommandSuggestions,
  parseLandingCommand,
  redactLandingTranscriptValue,
} from "@/lib/landing-terminal.mjs";
import { setStoredRoomPassword } from "@/lib/room-password-command.mjs";
import { useSystemSound } from "@/lib/system-sound-provider";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:3001/api";

type LandingTerminalEvent = {
  id: string;
  kind: "input" | "output" | "error";
  content: string;
};

type LandingCreateDraft = {
  topic?: string;
  expiry?: number;
  roomLimit?: number;
  password?: string;
};

type LandingCreateSession = {
  type: "create";
  step: "topic" | "expiry" | "roomLimit" | "password";
  draft: LandingCreateDraft;
};

type LandingSession = { type: "join" } | { type: "help" } | LandingCreateSession;

function setStoredToken(roomId: string, token: string) {
  if (typeof window === "undefined" || typeof window.localStorage?.setItem !== "function") return;
  window.localStorage.setItem(`token_${roomId}`, token);
}

function makeTranscriptId() {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

function getSessionPrompt(session: LandingSession) {
  if (session.type === "join") return "system: enter a room ID or link";
  if (session.type === "help") return "system: ask anything about inkog";

  const prompts: Record<LandingCreateSession["step"], string> = {
    topic: "system: enter a room topic",
    expiry: "system: enter expiry in minutes (blank uses 60)",
    roomLimit: "system: enter max members from 1–30 (blank uses 10)",
    password: "system: enter an optional password",
  };

  return prompts[session.step];
}

function getDisplayedInlineValue(session: LandingSession, value: string) {
  const redacted = redactLandingTranscriptValue(session, value);
  if (redacted) return redacted;
  if (session.type === "create" && session.step === "expiry") return "<default 60>";
  if (session.type === "create" && session.step === "roomLimit") return "<default 10>";
  return "<empty>";
}

export default function Home() {
  const router = useRouter();
  const sound = useSystemSound();
  const [composerValue, setComposerValue] = useState("");
  const [session, setSession] = useState<LandingSession | null>(null);
  const [terminalEvents, setTerminalEvents] = useState<LandingTerminalEvent[]>([]);
  const [slashSuggestionIndex, setSlashSuggestionIndex] = useState(0);
  const [creating, setCreating] = useState(false);
  const [helpLoading, setHelpLoading] = useState(false);

  const composerRef = useRef<HTMLInputElement | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  const inlineTemplate = session ? getLandingInlineTemplate(session) : null;
  const slashSuggestions = useMemo(
    () => (session ? [] : getLandingSlashCommandSuggestions(composerValue)),
    [composerValue, session],
  );
  const showSlashSuggestions = slashSuggestions.length > 0;
  const isBusy = creating || helpLoading;
  const showIdleCursor = composerValue.length === 0 && !inlineTemplate;

  const appendEvent = (kind: LandingTerminalEvent["kind"], content: string) => {
    setTerminalEvents(events => [...events, { id: makeTranscriptId(), kind, content }]);
  };

  const focusComposer = () => {
    requestAnimationFrame(() => composerRef.current?.focus());
  };

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [terminalEvents]);

  useEffect(() => {
    setSlashSuggestionIndex(index => Math.min(index, Math.max(slashSuggestions.length - 1, 0)));
  }, [slashSuggestions.length]);

  const beginSession = (nextSession: LandingSession, command: string) => {
    appendEvent("input", command);
    appendEvent("output", getSessionPrompt(nextSession));
    setComposerValue("");
    setSession(nextSession);
    setSlashSuggestionIndex(0);
    focusComposer();
  };

  const cancelSession = (message = "system: command cancelled") => {
    setComposerValue("");
    setSession(null);
    setSlashSuggestionIndex(0);
    appendEvent("output", message);
    sound.play("close");
    focusComposer();
  };

  const createRoom = async (draft: Required<LandingCreateDraft>) => {
    setCreating(true);
    appendEvent("output", "system: creating room…");

    try {
      const body: Record<string, unknown> = {
        topic: draft.topic.trim(),
        expiry: draft.expiry,
        roomLimit: draft.roomLimit,
      };
      if (draft.password.trim()) body.password = draft.password.trim();

      const res = await fetch(`${API}/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        sound.play("error");
        appendEvent("error", `error: ${data?.message || "failed to create room"}`);
        return;
      }

      setStoredToken(data.id, data.creatorToken);
      setStoredRoomPassword(data.id, draft.password);
      sound.play("success");
      appendEvent("output", `system: room ${data.id} created`);
      router.push(`/room/${data.id}`);
    } catch {
      sound.play("error");
      appendEvent("error", "error: could not reach server. Is the backend running?");
    } finally {
      setCreating(false);
    }
  };

  const joinRoom = (target: string, command: string) => {
    appendEvent("input", command);
    setComposerValue("");

    const roomMatch = target.trim().match(/([a-z0-9]{6})$/i);
    if (!roomMatch) {
      sound.play("error");
      appendEvent("error", "error: enter a six-character room ID or room link");
      return;
    }

    const roomId = roomMatch[1];
    sound.play("success");
    appendEvent("output", `system: opening room ${roomId}`);
    router.push(`/room/${roomId}`);
  };

  const askHelp = async (question: string, command: string) => {
    appendEvent("input", command);
    setComposerValue("");
    setHelpLoading(true);

    try {
      const result = await askInkogHelp(API, question);
      sound.play("notify");
      appendEvent("output", result.answer);
    } catch {
      sound.play("error");
      appendEvent("error", "error: I could not reach the inkog help brain right now.");
    } finally {
      setHelpLoading(false);
      focusComposer();
    }
  };

  const submitInlineValue = (value: string) => {
    if (!session || !inlineTemplate || isBusy) return;

    if (value.trim() === "/cancel") {
      appendEvent("input", "/cancel");
      cancelSession();
      return;
    }

    if (session.type === "join") {
      const submitted = value.trim();
      if (!submitted) {
        appendEvent("input", `${inlineTemplate.prefix}<empty>`);
        sound.play("error");
        appendEvent("error", "error: enter a room ID or link");
        return;
      }
      setSession(null);
      joinRoom(submitted, `${inlineTemplate.prefix}${submitted}`);
      return;
    }

    if (session.type === "help") {
      const submitted = value.trim();
      if (!submitted) {
        appendEvent("input", `${inlineTemplate.prefix}<empty>`);
        sound.play("error");
        appendEvent("error", "error: ask me something about inkog");
        return;
      }
      setSession(null);
      void askHelp(submitted, `${inlineTemplate.prefix}${submitted}`);
      return;
    }

    const result = advanceLandingCreateSession(session, value);
    appendEvent("input", `${inlineTemplate.prefix}${getDisplayedInlineValue(session, result.submitted)}`);
    setComposerValue("");

    if (result.kind === "error") {
      sound.play("error");
      appendEvent("error", `error: ${result.message}`);
      focusComposer();
      return;
    }

    if (result.kind === "next") {
      const nextSession = result.session as LandingCreateSession;
      setSession(nextSession);
      appendEvent("output", getSessionPrompt(nextSession));
      focusComposer();
      return;
    }

    setSession(null);
    void createRoom(result.draft as Required<LandingCreateDraft>);
  };

  const runCommand = (value: string) => {
    if (isBusy) return;
    if (session) {
      submitInlineValue(value);
      return;
    }

    const command = parseLandingCommand(value);
    const rawCommand = value.trim();

    switch (command.type) {
      case "empty":
        return;
      case "create":
        beginSession({ type: "create", step: "topic", draft: {} }, "/create");
        return;
      case "join":
        if (command.target) {
          joinRoom(command.target, rawCommand);
        } else {
          beginSession({ type: "join" }, "/join");
        }
        return;
      case "help":
        if (command.question) {
          void askHelp(command.question, rawCommand);
        } else {
          beginSession({ type: "help" }, "/help");
        }
        return;
      case "cancel":
        appendEvent("input", "/cancel");
        cancelSession("system: no active command");
        return;
      case "unknown":
        appendEvent("input", rawCommand);
        setComposerValue("");
        sound.play("error");
        appendEvent("error", `error: command not found: ${command.command}`);
        focusComposer();
        return;
    }
  };

  const runSlashSuggestion = (command: string) => {
    sound.play("press");
    runCommand(command);
  };

  return (
    <div style={styles.pageShell}>
      <header style={styles.header}>
        <div style={styles.brandRow}>
          <span style={styles.brand}>inkog</span>
          <span aria-hidden="true" style={styles.brandDot} />
        </div>
      </header>

      <main style={styles.main}>
        <div style={styles.workspace}>
          <div className="animate-fadeUp" style={styles.hero}>
            <p style={styles.eyebrow}>anonymous group chat</p>
            <h1 style={styles.headline}>
              Say what you{" "}
              <span className="serif" style={styles.headlineAccent}>actually</span>
              {" "}think
            </h1>
            <p style={styles.heroCopy}>
              Create a room, share the link, everyone gets an anonymous alias.<br />
              No accounts. No traces. The room self-destructs.
            </p>
            <div style={styles.heroActions}>
              <button
                className="btn-accent"
                onClick={() => {
                  sound.play("press");
                  runCommand("/create");
                }}
                onMouseEnter={() => sound.play("hover")}
                style={styles.actionButton}
              >
                Create a Room
              </button>
              <button
                className="btn-ghost"
                onClick={() => {
                  sound.play("press");
                  runCommand("/join");
                }}
                onMouseEnter={() => sound.play("hover")}
                style={styles.actionButton}
              >
                Join via Link →
              </button>
              <button
                className="btn-ghost"
                onClick={() => {
                  sound.play("press");
                  router.push("/playground");
                }}
                onMouseEnter={() => sound.play("hover")}
                style={styles.actionButton}
              >
                Playground
              </button>
            </div>
          </div>

          <section aria-label="Landing terminal transcript" style={styles.transcript}>
            {terminalEvents.length === 0 ? (
              <div style={styles.emptyTranscript}>
                <p style={styles.emptyLine}>system: use /create, /join, or /help</p>
                <p style={styles.emptyLine}>system: your room details stay in this browser</p>
              </div>
            ) : terminalEvents.map(event => (
              <p
                aria-live={event.kind === "input" ? undefined : "polite"}
                key={event.id}
                style={{
                  ...styles.transcriptLine,
                  color: event.kind === "error" ? "var(--red)" : event.kind === "input" ? "var(--text)" : "var(--text-muted)",
                }}
              >
                <span aria-hidden="true" style={{ ...styles.transcriptMarker, color: event.kind === "error" ? "var(--red)" : "var(--accent)" }}>
                  {event.kind === "input" ? "$" : event.kind === "error" ? "!" : ">"}
                </span>
                {event.content}
              </p>
            ))}
            <div ref={transcriptEndRef} />
          </section>

          <TerminalComposer
            cursorVisible
            disabled={isBusy}
            expanded={Boolean(inlineTemplate || showSlashSuggestions || isBusy)}
            hint={isBusy ? (creating ? "creating room" : "asking inkog") : "type / for commands"}
            inputId="landing-terminal-input"
            inputLabel="landing command"
            inputPrefix={inlineTemplate ? <span aria-hidden="true" style={styles.inlinePrefix}>{inlineTemplate.prefix}</span> : null}
            inputRef={composerRef}
            inputStyle={{ caretColor: showIdleCursor ? "transparent" : "var(--text)" }}
            inputType={inlineTemplate?.inputType ?? "text"}
            onKeyDown={event => {
              if (event.key === "Escape" && session) {
                event.preventDefault();
                cancelSession();
                return;
              }

              if (!showSlashSuggestions) return;

              if (event.key === "ArrowDown") {
                event.preventDefault();
                setSlashSuggestionIndex(index => (index + 1) % slashSuggestions.length);
                return;
              }

              if (event.key === "ArrowUp") {
                event.preventDefault();
                setSlashSuggestionIndex(index => (index - 1 + slashSuggestions.length) % slashSuggestions.length);
                return;
              }

              if (event.key === "Escape") {
                event.preventDefault();
                setComposerValue("");
                setSlashSuggestionIndex(0);
                return;
              }

              if (event.key === "Enter") {
                event.preventDefault();
                runSlashSuggestion(slashSuggestions[slashSuggestionIndex]?.command ?? slashSuggestions[0].command);
              }
            }}
            onSubmit={() => runCommand(composerValue)}
            onValueChange={value => {
              setComposerValue(value);
              setSlashSuggestionIndex(0);
            }}
            placeholder={inlineTemplate?.placeholder}
            showHint={showIdleCursor}
            showIdleCursor={showIdleCursor}
            topContent={(
              <>
                <div
                  aria-hidden={!showSlashSuggestions}
                  style={{
                    ...styles.slashMenu,
                    maxHeight: showSlashSuggestions ? "220px" : "0px",
                    marginBottom: showSlashSuggestions ? "6px" : 0,
                    opacity: showSlashSuggestions ? 1 : 0,
                    pointerEvents: showSlashSuggestions ? "auto" : "none",
                  }}
                >
                  {showSlashSuggestions ? slashSuggestions.map((item, index) => {
                    const selected = index === slashSuggestionIndex;
                    return (
                      <button
                        key={item.command}
                        onClick={() => runSlashSuggestion(item.command)}
                        onMouseEnter={() => {
                          setSlashSuggestionIndex(index);
                          sound.play("hover");
                        }}
                        style={{
                          ...styles.slashItem,
                          background: selected ? "color-mix(in srgb, var(--accent) 7%, transparent)" : "transparent",
                          color: selected ? "var(--accent)" : "var(--text)",
                        }}
                        type="button"
                      >
                        <span aria-hidden="true" style={styles.slashMarker}>{selected ? ">" : ""}</span>
                        <span style={styles.slashCommand}>{item.command}</span>
                        <span style={styles.slashLabel}>{item.label}</span>
                      </button>
                    );
                  }) : null}
                </div>
                {isBusy ? <p role="status" aria-live="polite" style={styles.composerStatus}>{creating ? "creating room…" : "asking inkog…"}</p> : null}
              </>
            )}
            value={composerValue}
          />
        </div>
      </main>

      <footer style={styles.footer}>
        <p style={styles.footerCopy}>rooms expire and vanish forever — no logs, no accounts</p>
      </footer>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  pageShell: {
    display: "flex",
    flexDirection: "column",
    height: "100dvh",
    minHeight: "100vh",
    overflow: "hidden",
  },
  header: {
    borderBottom: "1px solid var(--border)",
    flexShrink: 0,
    padding: "28px 40px",
  },
  brandRow: { alignItems: "center", display: "flex", gap: "8px" },
  brand: { fontFamily: "Syne, sans-serif", fontSize: "20px", fontWeight: 800, letterSpacing: "-0.04em" },
  brandDot: { background: "var(--accent)", borderRadius: "50%", display: "inline-block", height: "6px", width: "6px" },
  main: {
    display: "flex",
    flex: "1 1 0",
    minHeight: 0,
    padding: "clamp(32px, 6vh, 60px) 24px 0",
  },
  workspace: {
    display: "flex",
    flex: 1,
    flexDirection: "column",
    margin: "0 auto",
    maxWidth: "720px",
    minHeight: 0,
    width: "100%",
  },
  hero: { flexShrink: 0, marginBottom: "28px", textAlign: "center" },
  eyebrow: {
    color: "var(--text-dim)",
    fontFamily: "DM Mono, monospace",
    fontSize: "11px",
    letterSpacing: "0.15em",
    marginBottom: "20px",
    textTransform: "uppercase",
  },
  headline: { fontSize: "clamp(44px, 8vw, 76px)", letterSpacing: "-0.04em", lineHeight: 0.95, marginBottom: "22px" },
  headlineAccent: { color: "var(--accent)", fontStyle: "italic" },
  heroCopy: { color: "var(--text-muted)", fontFamily: "DM Mono, monospace", fontSize: "14px", lineHeight: 1.8 },
  heroActions: { display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "center", marginTop: "30px" },
  actionButton: { borderRadius: "6px", padding: "14px 32px" },
  transcript: {
    borderTop: "1px solid color-mix(in srgb, var(--border) 78%, transparent)",
    display: "flex",
    flex: "1 1 0",
    flexDirection: "column",
    gap: "8px",
    minHeight: 0,
    overflowX: "hidden",
    overflowY: "auto",
    padding: "18px clamp(0px, 2vw, 16px) 22px",
    scrollbarWidth: "thin",
  },
  emptyTranscript: { margin: "auto 0", textAlign: "center" },
  emptyLine: { color: "var(--text-dim)", fontFamily: '"Departure Mono", monospace', fontSize: "13px", lineHeight: 1.7, margin: 0 },
  transcriptLine: { display: "flex", fontFamily: '"Departure Mono", monospace', fontSize: "13px", gap: "10px", lineHeight: 1.7, margin: 0, overflowWrap: "anywhere", whiteSpace: "pre-wrap" },
  transcriptMarker: { flexShrink: 0, fontWeight: 700 },
  inlinePrefix: { color: "var(--accent)", flexShrink: 0, fontFamily: '"Departure Mono", monospace', fontSize: "14px", lineHeight: "24px" },
  slashMenu: { display: "flex", flexDirection: "column", overflow: "hidden", transition: "max-height 150ms ease, opacity 120ms ease" },
  slashItem: { alignItems: "center", border: 0, cursor: "pointer", display: "grid", fontFamily: '"Departure Mono", monospace', fontSize: "12px", gap: "10px", gridTemplateColumns: "12px minmax(72px, auto) 1fr", minHeight: "29px", padding: "5px 8px", textAlign: "left" },
  slashMarker: { color: "var(--accent)", textAlign: "center" },
  slashCommand: { fontWeight: 700 },
  slashLabel: { color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  composerStatus: { color: "var(--text-muted)", fontFamily: '"Departure Mono", monospace', fontSize: "12px", lineHeight: "20px", margin: "0 0 6px" },
  footer: { borderTop: "1px solid var(--border)", display: "flex", flexShrink: 0, justifyContent: "center", padding: "18px 40px" },
  footerCopy: { color: "var(--text-dim)", fontSize: "11px", letterSpacing: "0.08em", margin: 0 },
};
