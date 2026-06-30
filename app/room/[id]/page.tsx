"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link2, LogOut, Power } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { io, type Socket } from "socket.io-client";

import {
  classifyRoomMessage,
} from "@/lib/room-chat-ui.mjs";
import { formatRoomCountdown, getRoomRoster } from "@/lib/room-header-ui.mjs";
import { parseRoomCommand } from "@/lib/room-terminal.mjs";
import type { RoomCommand } from "@/lib/room-terminal-types";
import {
  formatSystemSoundStatus,
  parseSystemSoundCommand,
} from "@/lib/system-sound.mjs";
import { useSystemSound } from "@/lib/system-sound-provider";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:3001/api";
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://127.0.0.1:3001";

interface Message {
  id: string;
  alias: string;
  content: string;
  createdAt: string;
  isSystem?: boolean;
}

interface PollVote {
  alias: string;
  optionIndex: number;
}

interface Poll {
  pollId: string;
  question: string;
  options: string[];
  votesByMember: PollVote[];
  createdAt: string;
}

interface TerminalEvent {
  id: string;
  kind: "input" | "output" | "error";
  content: string;
  createdAt: string;
}

type Stage = "loading" | "password" | "joined" | "expired" | "error";
type RoomRoster = { visible: { alias: string; initials: string }[]; overflow: number };
type TranscriptItem =
  | { type: "message"; message: Message; timestamp: number }
  | { type: "poll"; poll: Poll; timestamp: number }
  | { type: "event"; event: TerminalEvent; timestamp: number };

function getStoredToken(roomId: string) {
  if (typeof window === "undefined" || typeof window.localStorage?.getItem !== "function") return undefined;
  return window.localStorage.getItem(`token_${roomId}`) || undefined;
}

function setStoredToken(roomId: string, token: string) {
  if (typeof window === "undefined" || typeof window.localStorage?.setItem !== "function") return;
  window.localStorage.setItem(`token_${roomId}`, token);
}

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random()}`;
}

function timestampFrom(value: string) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function transcriptFrom(messages: Message[], polls: Poll[], events: TerminalEvent[]) {
  return [
    ...messages.map(message => ({ type: "message" as const, message, timestamp: timestampFrom(message.createdAt) })),
    ...polls.map(poll => ({ type: "poll" as const, poll, timestamp: timestampFrom(poll.createdAt) })),
    ...events.map(event => ({ type: "event" as const, event, timestamp: timestampFrom(event.createdAt) })),
  ].sort((a, b) => a.timestamp - b.timestamp);
}

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const sound = useSystemSound();
  const roomId = params.id as string;

  const [stage, setStage] = useState<Stage>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [topic, setTopic] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [onlineCount, setOnlineCount] = useState(0);
  const [roomUsers, setRoomUsers] = useState<string[]>([]);
  const [alias, setAlias] = useState("");
  const [isCreator, setIsCreator] = useState(false);
  const anonTokenRef = useRef<string>("");

  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [terminalEvents, setTerminalEvents] = useState<TerminalEvent[]>([]);
  const [composerValue, setComposerValue] = useState("");
  const [copied, setCopied] = useState(false);
  const [socketError, setSocketError] = useState("");
  const [cursorVisible, setCursorVisible] = useState(true);

  const socketRef = useRef<Socket | null>(null);
  const composerRef = useRef<HTMLInputElement | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const soundRef = useRef(sound);

  useEffect(() => {
    soundRef.current = sound;
  }, [sound]);

  const appendEvent = (kind: TerminalEvent["kind"], content: string) => {
    setTerminalEvents(current => [
      ...current,
      { id: makeId(), kind, content, createdAt: new Date().toISOString() },
    ]);
  };

  const transcript = useMemo(
    () => transcriptFrom(messages, polls, terminalEvents),
    [messages, polls, terminalEvents],
  );

  useEffect(() => {
    if (stage !== "joined" || secondsLeft <= 0) return;
    const interval = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          setStage("expired");
          clearInterval(interval);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [stage, secondsLeft]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  useEffect(() => {
    if (stage === "joined") requestAnimationFrame(() => composerRef.current?.focus());
  }, [stage]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCursorVisible(current => !current);
    }, 530);

    return () => clearInterval(interval);
  }, []);

  const connectSocket = (token: string, myAlias: string, onReady: () => void) => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const socket = io(SOCKET_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join_room", { roomId, anonToken: token });
    });

    socket.on("join_room_success", ({ onlineCount, roomUsers }: { onlineCount: number; roomUsers: string[] }) => {
      setOnlineCount(onlineCount);
      setRoomUsers(roomUsers ?? []);
      soundRef.current.play("success");
      setMessages(prev => [...prev, {
        id: makeId(),
        alias: "system",
        content: `joined as ${myAlias}`,
        createdAt: new Date().toISOString(),
        isSystem: true,
      }]);
      onReady();
    });

    socket.on("user_joined", ({ alias, onlineCount, roomUsers }: { alias: string; onlineCount: number; roomUsers: string[] }) => {
      setOnlineCount(onlineCount);
      setRoomUsers(roomUsers ?? []);
      soundRef.current.play("notify");
      setMessages(prev => [...prev, {
        id: makeId(),
        alias: "system",
        content: `${alias} joined`,
        createdAt: new Date().toISOString(),
        isSystem: true,
      }]);
    });

    socket.on("user_left", ({ alias, onlineCount, roomUsers }: { alias: string; onlineCount: number; roomUsers: string[] }) => {
      setOnlineCount(onlineCount);
      setRoomUsers(roomUsers ?? []);
      soundRef.current.play("close");
      setMessages(prev => [...prev, {
        id: makeId(),
        alias: "system",
        content: `${alias} left`,
        createdAt: new Date().toISOString(),
        isSystem: true,
      }]);
    });

    socket.on("new_message", (msg: Message) => {
      if (msg.alias !== myAlias) {
        soundRef.current.play("messageReceived");
      }
      setMessages(prev => [...prev, msg]);
    });

    socket.on("message_deleted", ({ messageId }: { messageId: string }) => {
      setMessages(prev => prev.filter(m => m.id !== messageId));
    });

    socket.on("poll_created", (poll: Poll) => {
      soundRef.current.play("notify");
      setPolls(prev => [...prev, poll]);
    });

    socket.on("poll_updated", ({ pollId, votesByMember }: { pollId: string; votesByMember: PollVote[] }) => {
      setPolls(prev => prev.map(p => p.pollId === pollId ? { ...p, votesByMember } : p));
    });

    socket.on("poll_closed", ({ pollId, votesByMember }: { pollId: string; votesByMember: PollVote[] }) => {
      setPolls(prev => prev.map(p => p.pollId === pollId ? { ...p, votesByMember } : p));
    });

    socket.on("room_closed", () => {
      soundRef.current.play("close");
      setStage("expired");
    });

    socket.on("error", ({ message }: { message: string }) => {
      if (message === "You are already in this room in another tab.") {
        socket.disconnect();
        socketRef.current = null;
        setStage("error");
        setErrorMsg("This room is already open in another tab. Please use that tab.");
        return;
      }

      appendEvent("error", message);
      soundRef.current.play("error");
      setSocketError(message);
      setTimeout(() => setSocketError(""), 3000);
    });

    return socket;
  };

  const doJoin = async (password?: string) => {
    const storedToken = getStoredToken(roomId);
    const body: Record<string, unknown> = {};
    if (storedToken) body.anonToken = storedToken;
    if (password) body.password = password;

    const res = await fetch(`${API}/rooms/${roomId}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw { status: res.status, message: data.message };
    return data;
  };

  const fetchHistory = async (token: string) => {
    const [msgRes, pollRes] = await Promise.all([
      fetch(`${API}/rooms/${roomId}/messages?anonToken=${encodeURIComponent(token)}`),
      fetch(`${API}/rooms/${roomId}/polls?anonToken=${encodeURIComponent(token)}`),
    ]);

    if (msgRes.ok) {
      const data = await msgRes.json();
      setMessages(data.messages || []);
    }

    if (pollRes.ok) {
      const data = await pollRes.json();
      setPolls(data.polls || []);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const roomRes = await fetch(`${API}/rooms/${roomId}`);
        if (cancelled) return;
        if (!roomRes.ok) {
          if (roomRes.status === 404) {
            setErrorMsg("Room not found.");
            setStage("error");
            return;
          }
          setErrorMsg("Failed to load room.");
          setStage("error");
          return;
        }

        const roomData = await roomRes.json();
        if (cancelled) return;
        setTopic(roomData.topic);
        setSecondsLeft(roomData.secondsLeft);

        if (roomData.secondsLeft <= 0) {
          setStage("expired");
          return;
        }

        if (roomData.hasPassword) {
          setStage("password");
          return;
        }

        const joinData = await doJoin();
        if (cancelled) return;
        anonTokenRef.current = joinData.anonToken;
        setStoredToken(roomId, joinData.anonToken);
        setAlias(joinData.alias);
        setIsCreator(joinData.isCreator);
        await fetchHistory(joinData.anonToken);
        if (cancelled) return;
        connectSocket(joinData.anonToken, joinData.alias, () => setStage("joined"));
      } catch (err: unknown) {
        if (cancelled) return;
        const e = err as { status?: number; message?: string };
        if (e.status === 410) {
          setStage("expired");
          return;
        }
        setErrorMsg(e.message || "Could not reach server.");
        setStage("error");
      }
    };

    void run();

    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  // roomId is the only stable route dependency; socket helpers close over current room state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const handlePasswordSubmit = async () => {
    setPasswordError("");
    try {
      const joinData = await doJoin(passwordInput);
      anonTokenRef.current = joinData.anonToken;
      setStoredToken(roomId, joinData.anonToken);
      setAlias(joinData.alias);
      setIsCreator(joinData.isCreator);
      await fetchHistory(joinData.anonToken);
      sound.play("success");
      connectSocket(joinData.anonToken, joinData.alias, () => setStage("joined"));
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      if (e.status === 410) setStage("expired");
      else {
        sound.play("error");
        setPasswordError(e.message || "Failed to join.");
      }
    }
  };

  const emitPoll = (question: string, options: string[]) => {
    if (!socketRef.current) {
      appendEvent("error", "socket not connected");
      sound.play("error");
      return false;
    }

    socketRef.current.emit("create_poll", { question, options });
    sound.play("success");
    return true;
  };

  const sendChatMessage = (message: string) => {
    if (!socketRef.current) {
      appendEvent("error", "socket not connected");
      sound.play("error");
      return;
    }

    socketRef.current.emit("send_message", { message });
    sound.play("messageSent");
  };

  const closeRoom = () => {
    sound.play("close");
    socketRef.current?.emit("close_room", {});
  };

  const handleLeave = () => {
    sound.play("close");
    socketRef.current?.disconnect();
    socketRef.current = null;
    router.push("/");
  };

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      appendEvent("output", "share link copied");
      sound.play("success");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      appendEvent("error", "could not copy share link");
      sound.play("error");
    }
  };

  const printHelp = () => {
    appendEvent("output", "commands: /poll question | option a | option b, /share, /leave, /sound");
    if (isCreator) appendEvent("output", "creator: /close");
  };

  const handleSoundCommand = (rawCommand: string) => {
    const parsed = parseSystemSoundCommand(rawCommand);

    if (parsed.type === "invalid") {
      appendEvent("input", rawCommand);
      appendEvent("error", parsed.message ?? "usage: /sound on, /sound off, or /sound status");
      sound.play("error");
      return true;
    }

    if (parsed.type === "status") {
      appendEvent("input", rawCommand);
      appendEvent("output", formatSystemSoundStatus(sound.muted));
      sound.play("notify");
      return true;
    }

    appendEvent("input", rawCommand);
    const nextMuted = parsed.muted === true;
    if (nextMuted) {
      sound.play("close");
    }
    sound.setMuted(nextMuted);
    appendEvent("output", formatSystemSoundStatus(nextMuted));
    return true;
  };

  const runComposer = () => {
    const rawValue = composerValue;
    const value = rawValue.trim();
    setComposerValue("");

    const command = parseRoomCommand(value) as RoomCommand;

    if (value.toLowerCase().replace(/^\/+/, "").startsWith("sound")) {
      handleSoundCommand(value.startsWith("/") ? value : `/${value}`);
      return;
    }

    switch (command.type) {
      case "empty":
        return;
      case "poll-inline":
        if (!emitPoll(command.question, command.options)) return;
        return;
      case "message":
        sendChatMessage(command.text);
        return;
      case "invalid":
        appendEvent("error", command.message);
        sound.play("error");
        return;
      case "share":
        appendEvent("input", value);
        void copyShareLink();
        return;
      case "leave":
        appendEvent("input", value);
        handleLeave();
        return;
      case "close":
        appendEvent("input", value);
        if (!isCreator) {
          appendEvent("error", "only the creator can close this room");
          sound.play("error");
          return;
        }
        if (window.confirm("Close room for everyone? This cannot be undone.")) closeRoom();
        return;
      case "help":
        appendEvent("input", value);
        printHelp();
        return;
      case "unknown":
        appendEvent("input", command.command);
        appendEvent("error", `command not found: ${command.command}`);
        appendEvent("output", "try /help");
        sound.play("error");
        return;
    }
  };

  const votePoll = (pollId: string, optionIndex: number) => {
    sound.play("press");
    socketRef.current?.emit("vote_poll", { pollId, optionIndex });
  };

  const totalVotes = (poll: Poll) => poll.votesByMember.length;
  const votesFor = (poll: Poll, idx: number) => poll.votesByMember.filter(v => v.optionIndex === idx).length;
  const myVote = (poll: Poll) => poll.votesByMember.find(v => v.alias === alias)?.optionIndex ?? -1;
  const usersTitle = roomUsers.length ? roomUsers.join("\n") : "No users online";
  const roster = getRoomRoster(roomUsers);
  const showIdleCursor = composerValue.length === 0;

  if (stage === "expired") {
    return (
      <TerminalState
        action="back"
        copy="room expired. messages are no longer available."
        onAction={() => router.push("/")}
        title="room expired"
      />
    );
  }

  if (stage === "error") {
    return (
      <TerminalState
        action="back"
        copy={errorMsg}
        onAction={() => router.push("/")}
        title="room error"
      />
    );
  }

  if (stage === "loading") {
    return <TerminalState copy="loading room..." title="inkog" />;
  }

  if (stage === "password") {
    return (
      <main style={styles.stateShell}>
        <section style={styles.passwordPanel}>
          <p style={styles.stateKicker}>private room</p>
          <h1 style={styles.stateTitle}>{topic}</h1>
          <label style={styles.passwordLabel}>
            <span style={styles.mutedLine}>password</span>
            <input
              autoFocus
              onChange={event => setPasswordInput(event.target.value)}
              onKeyDown={event => {
                if (event.key === "Enter") {
                  void handlePasswordSubmit();
                }
              }}
              placeholder="enter room password"
              style={styles.passwordInput}
              type="password"
              value={passwordInput}
            />
          </label>
          {passwordError && <p style={styles.errorLine}>error: {passwordError}</p>}
          <button
            className="btn-ghost"
            onClick={() => {
              sound.play("press");
              void handlePasswordSubmit();
            }}
            onMouseEnter={() => sound.play("hover")}
            style={styles.commandButton}
            type="button"
          >
            enter
          </button>
        </section>
      </main>
    );
  }

  return (
    <main style={styles.roomShell} onClick={() => composerRef.current?.focus()}>
      <header style={styles.roomHeader}>
        <div style={styles.headerIdentity}>
          <span style={styles.brand}>inkog</span>
          <span style={styles.headerDivider}>/</span>
          <span style={styles.topic} title={topic}>{topic}</span>
        </div>
        <div style={styles.headerMeta}>
          <AvatarRoster roster={roster} usersTitle={usersTitle} />
          <span style={{ ...styles.metaItem, color: secondsLeft < 300 ? "var(--red)" : "var(--text-muted)" }}>
            {formatRoomCountdown(secondsLeft)}
          </span>
          <button
            aria-label={copied ? "Share link copied" : "Copy share link"}
            className="btn-ghost"
            onClick={() => {
              sound.play("press");
              void copyShareLink();
            }}
            onMouseEnter={() => sound.play("hover")}
            style={{
              ...styles.iconButton,
              color: copied ? "var(--accent)" : "var(--text-muted)",
            }}
            title={copied ? "copied" : "copy share link"}
            type="button"
          >
            <Link2 size={14} strokeWidth={2} />
          </button>
          {isCreator && (
            <button
              className="btn-danger"
              aria-label="Close room"
              onClick={() => {
                sound.play("press");
                if (window.confirm("Close room for everyone? This cannot be undone.")) closeRoom();
              }}
              onMouseEnter={() => sound.play("hover")}
              style={styles.iconButtonDanger}
              type="button"
            >
              <Power size={14} strokeWidth={2} />
            </button>
          )}
          <button
            aria-label="Leave room"
            className="btn-ghost"
            onClick={handleLeave}
            onMouseEnter={() => sound.play("hover")}
            style={{ ...styles.iconButton, color: "var(--red)" }}
            type="button"
          >
            <LogOut size={14} strokeWidth={2} />
          </button>
        </div>
      </header>

      {socketError && <div style={styles.errorToast}>error: {socketError}</div>}

      <section aria-label="Room terminal transcript" style={styles.transcript}>
        {transcript.length === 0 ? (
          <div style={styles.emptyTranscript}>
            <p style={styles.emptyLine}>system: joined as {alias}</p>
            <p style={styles.emptyLine}>system: type a message</p>
            <p style={styles.emptyLine}>system: use /poll question | option a | option b</p>
          </div>
        ) : (
          transcript.map(item => {
            if (item.type === "event") {
              return <TerminalEventRow event={item.event} key={item.event.id} />;
            }

            if (item.type === "poll") {
              return (
                <TerminalPoll
                  key={item.poll.pollId}
                  myVote={myVote(item.poll)}
                  onVote={votePoll}
                  poll={item.poll}
                  total={totalVotes(item.poll)}
                  votesFor={votesFor}
                />
              );
            }

            return <TerminalMessage alias={alias} key={item.message.id} message={item.message} />;
          })
        )}
        <div ref={transcriptEndRef} />
      </section>

      <form
        onSubmit={event => {
          event.preventDefault();
          runComposer();
        }}
        style={styles.composer}
      >
        <label htmlFor="room-terminal-input" style={styles.srOnly}>room command</label>
        <span aria-hidden="true" style={styles.composerPrompt}>$</span>
        {showIdleCursor ? (
          <span
            aria-hidden="true"
            style={{
              ...styles.composerCursor,
              opacity: cursorVisible ? 1 : 0.18,
            }}
          >
            |
          </span>
        ) : null}
        <input
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          id="room-terminal-input"
          onChange={event => setComposerValue(event.target.value)}
          ref={composerRef}
          spellCheck={false}
          style={styles.composerInput}
          value={composerValue}
        />
      </form>
    </main>
  );
}

function TerminalState({
  action,
  copy,
  onAction,
  title,
}: {
  action?: string;
  copy: string;
  onAction?: () => void;
  title: string;
}) {
  const sound = useSystemSound();

  return (
    <main style={styles.stateShell}>
      <section style={styles.statePanel}>
        <h1 style={styles.stateTitle}>{title}</h1>
        <p style={styles.mutedLine}>{copy}</p>
        {action && (
          <button
            className="btn-ghost"
            onClick={() => {
              sound.play("press");
              onAction?.();
            }}
            onMouseEnter={() => sound.play("hover")}
            style={styles.commandButton}
            type="button"
          >
            {action}
          </button>
        )}
      </section>
    </main>
  );
}

function TerminalEventRow({ event }: { event: TerminalEvent }) {
  const prefix = event.kind === "input" ? "$" : event.kind === "error" ? "error:" : ">";
  const color =
    event.kind === "input"
      ? "var(--accent)"
      : event.kind === "error"
        ? "var(--red)"
        : "var(--text-muted)";

  return (
    <p style={{ ...styles.transcriptLine, color }}>
      <span aria-hidden="true">{prefix} </span>
      {event.content}
    </p>
  );
}

function TerminalMessage({ alias, message }: { alias: string; message: Message }) {
  const presentation = classifyRoomMessage(message, alias);
  const lineColor =
    presentation.kind === "incoming"
      ? "var(--accent)"
      : presentation.kind === "outgoing"
        ? "var(--text-muted)"
        : "var(--text-dim)";

  return (
    <p
      style={{
        ...styles.transcriptLine,
        color: lineColor,
      }}
    >
      <span aria-hidden="true">{presentation.prefix} </span>
      {message.content}
    </p>
  );
}

function AvatarRoster({
  roster,
  usersTitle,
}: {
  roster: RoomRoster;
  usersTitle: string;
}) {
  return (
    <div aria-label={`${roster.visible.length + roster.overflow} online`} style={styles.roster} title={usersTitle}>
      {roster.visible.map((member, index) => (
        <span
          key={member.alias}
          style={{
            ...styles.rosterAvatar,
            marginLeft: index === 0 ? 0 : "-8px",
            zIndex: roster.visible.length - index,
          }}
          title={member.alias}
        >
          {member.initials}
        </span>
      ))}
      {roster.overflow > 0 && (
        <span style={{ ...styles.rosterAvatar, ...styles.rosterOverflow, marginLeft: roster.visible.length > 0 ? "-8px" : 0 }}>
          +{roster.overflow}
        </span>
      )}
    </div>
  );
}

function TerminalPoll({
  myVote,
  onVote,
  poll,
  total,
  votesFor,
}: {
  myVote: number;
  onVote: (pollId: string, optionIndex: number) => void;
  poll: Poll;
  total: number;
  votesFor: (poll: Poll, idx: number) => number;
}) {
  const sound = useSystemSound();

  return (
    <div style={styles.pollBlock}>
      <p style={styles.pollQuestion}>
        <span style={{ color: "var(--accent)" }}>poll --active </span>
        {poll.question}
      </p>
      <div style={styles.pollOptions}>
        {poll.options.map((option, index) => {
          const count = votesFor(poll, index);
          const percent = total > 0 ? Math.round((count / total) * 100) : 0;
          const selected = myVote === index;

          return (
            <button
              key={option}
              onClick={() => onVote(poll.pollId, index)}
              onMouseEnter={() => sound.play("hover")}
              style={{
                ...styles.pollOption,
                borderColor: selected ? "var(--accent)" : "var(--border)",
                color: selected ? "var(--accent)" : "var(--text)",
                backgroundImage: `linear-gradient(90deg, ${selected ? "rgba(200,255,87,0.12)" : "rgba(255,255,255,0.045)"} ${percent}%, transparent ${percent}%)`,
              }}
              type="button"
            >
              <span>{index + 1}. {option}</span>
              <span style={styles.pollStat}>{count} / {percent}%</span>
            </button>
          );
        })}
      </div>
      <p style={styles.pollFooter}>{total} vote{total === 1 ? "" : "s"}</p>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  roomShell: {
    background: "var(--bg)",
    color: "var(--text)",
    display: "flex",
    flexDirection: "column",
    fontFamily: "var(--font-mono)",
    height: "100dvh",
    overflow: "hidden",
  },
  roomHeader: {
    alignItems: "center",
    borderBottom: "1px solid var(--border)",
    display: "flex",
    flexShrink: 0,
    gap: "16px",
    justifyContent: "space-between",
    minHeight: "64px",
    padding: "12px clamp(16px, 3vw, 32px)",
  },
  headerIdentity: {
    alignItems: "center",
    display: "flex",
    gap: "10px",
    minWidth: 0,
  },
  brand: {
    color: "var(--text)",
    fontFamily: "var(--font-mono)",
    fontSize: "15px",
    fontWeight: 700,
  },
  headerDivider: {
    color: "var(--text-dim)",
  },
  roomId: {
    color: "var(--accent)",
    fontSize: "12px",
    whiteSpace: "nowrap",
  },
  topic: {
    color: "var(--text-muted)",
    fontSize: "13px",
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  headerMeta: {
    alignItems: "center",
    display: "flex",
    flexShrink: 0,
    flexWrap: "wrap",
    gap: "10px",
    justifyContent: "flex-end",
  },
  metaItem: {
    alignItems: "center",
    color: "var(--text-muted)",
    display: "inline-flex",
    fontSize: "13px",
    gap: "6px",
    whiteSpace: "nowrap",
  },
  iconButton: {
    alignItems: "center",
    borderRadius: 0,
    display: "inline-flex",
    height: "32px",
    justifyContent: "center",
    padding: 0,
    width: "32px",
  },
  iconButtonDanger: {
    alignItems: "center",
    borderRadius: 0,
    display: "inline-flex",
    height: "32px",
    justifyContent: "center",
    padding: 0,
    width: "32px",
  },
  roster: {
    alignItems: "center",
    display: "inline-flex",
    marginRight: "4px",
    minHeight: "24px",
  },
  rosterAvatar: {
    alignItems: "center",
    background: "var(--bg-3)",
    border: "1px solid var(--border-light)",
    borderRadius: "999px",
    color: "var(--text)",
    display: "inline-flex",
    fontSize: "10px",
    height: "24px",
    justifyContent: "center",
    lineHeight: 1,
    minWidth: "24px",
    padding: "0 6px",
    position: "relative",
  },
  rosterOverflow: {
    background: "var(--bg)",
    color: "var(--text-muted)",
  },
  errorToast: {
    background: "rgba(255, 87, 87, 0.12)",
    borderBottom: "1px solid rgba(255, 87, 87, 0.28)",
    color: "var(--red)",
    flexShrink: 0,
    fontSize: "12px",
    padding: "8px clamp(16px, 3vw, 32px)",
  },
  transcript: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    gap: "6px",
    overflowY: "auto",
    padding: "24px clamp(16px, 4vw, 56px)",
  },
  emptyTranscript: {
    color: "var(--text-dim)",
    fontSize: "14px",
    lineHeight: "24px",
    paddingTop: "8vh",
  },
  emptyLine: {
    margin: "0 0 4px",
  },
  transcriptLine: {
    color: "var(--text)",
    fontSize: "14px",
    lineHeight: "24px",
    margin: 0,
    overflowWrap: "anywhere",
    whiteSpace: "pre-wrap" as const,
  },
  pollBlock: {
    background: "rgba(255, 255, 255, 0.02)",
    border: "1px solid var(--border)",
    borderLeft: "1px solid var(--border-light)",
    borderRadius: "8px",
    margin: 0,
    maxWidth: "720px",
    padding: "12px 14px 12px 16px",
  },
  pollQuestion: {
    color: "var(--text)",
    fontSize: "14px",
    lineHeight: "24px",
    margin: "0 0 10px",
    overflowWrap: "anywhere",
  },
  pollOptions: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  pollOption: {
    alignItems: "center",
    backgroundColor: "transparent",
    backgroundPosition: "left center",
    backgroundRepeat: "no-repeat",
    border: "1px solid var(--border)",
    borderRadius: 0,
    cursor: "pointer",
    display: "flex",
    fontFamily: "var(--font-mono)",
    fontSize: "13px",
    gap: "14px",
    justifyContent: "space-between",
    lineHeight: "20px",
    minHeight: "36px",
    padding: "7px 10px",
    textAlign: "left",
    transition: "border-color 0.15s ease, color 0.15s ease, background-image 0.2s ease",
  },
  pollStat: {
    color: "var(--text-muted)",
    flexShrink: 0,
    fontSize: "12px",
  },
  pollFooter: {
    color: "var(--text-dim)",
    fontSize: "12px",
    margin: "8px 0 0",
  },
  composer: {
    alignItems: "center",
    borderTop: "1px solid var(--border)",
    display: "flex",
    flexShrink: 0,
    gap: "8px",
    minHeight: "56px",
    padding: "10px clamp(16px, 3vw, 32px)",
  },
  composerPrompt: {
    color: "var(--accent)",
    flexShrink: 0,
    fontSize: "14px",
    lineHeight: "24px",
  },
  composerCursor: {
    color: "var(--text-muted)",
    flexShrink: 0,
    fontSize: "14px",
    lineHeight: "24px",
    transition: "opacity 0.14s linear",
  },
  composerInput: {
    background: "transparent",
    border: 0,
    boxShadow: "none",
    color: "var(--text)",
    flex: 1,
    fontFamily: "var(--font-mono)",
    fontSize: "14px",
    lineHeight: "24px",
    minWidth: 0,
    outline: "none",
    padding: 0,
  },
  stateShell: {
    alignItems: "center",
    background: "var(--bg)",
    color: "var(--text)",
    display: "flex",
    fontFamily: "var(--font-mono)",
    justifyContent: "center",
    minHeight: "100dvh",
    padding: "24px",
  },
  statePanel: {
    maxWidth: "520px",
    width: "100%",
  },
  passwordPanel: {
    maxWidth: "420px",
    width: "100%",
  },
  stateKicker: {
    color: "var(--text-dim)",
    fontSize: "12px",
    margin: "0 0 8px",
  },
  stateTitle: {
    color: "var(--text)",
    fontFamily: "var(--font-mono)",
    fontSize: "20px",
    lineHeight: "28px",
    margin: "0 0 14px",
  },
  mutedLine: {
    color: "var(--text-muted)",
    fontSize: "14px",
    lineHeight: "24px",
    margin: "0 0 16px",
  },
  errorLine: {
    color: "var(--red)",
    fontSize: "13px",
    margin: "0 0 12px",
  },
  passwordLabel: {
    display: "block",
    marginBottom: "12px",
  },
  passwordInput: {
    background: "transparent",
    border: 0,
    borderBottom: "1px solid var(--border)",
    borderRadius: 0,
    color: "var(--text)",
    fontFamily: "var(--font-mono)",
    padding: "10px 0",
    width: "100%",
  },
  commandButton: {
    borderRadius: 0,
    padding: "7px 12px",
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
