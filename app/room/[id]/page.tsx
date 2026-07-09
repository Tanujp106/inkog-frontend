"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { io, type Socket } from "socket.io-client";

import { AmbientShaderBackground } from "@/components/ambient-shader-background";
import {
  buildRoomGateTranscriptLines,
  buildRoomPeerColorMap,
  classifyRoomMessage,
  resolveRoomStageAfterAuthenticatedJoin,
} from "@/lib/room-chat-ui.mjs";
import { getRoomComposerChrome, getRoomSlashCommandSuggestions } from "@/lib/room-composer-ui.mjs";
import {
  applyInkogTheme,
  inkogThemeChoices,
} from "@/lib/inkog-theme.mjs";
import { roomAmbientShaderOpacity, roomThemeBackground } from "@/lib/room-background.mjs";
import { getRoomRoster, getRoomTtlMeter } from "@/lib/room-header-ui.mjs";
import { getRoomCountdownNotification } from "@/lib/room-notifications.mjs";
import {
  createEmptyRoomPollDraft,
  getRoomPollInlinePrompt,
  getRoomPollPrompt,
  submitRoomPollDraftAnswer,
} from "@/lib/room-poll-command.mjs";
import {
  createPendingRoomPollRequest,
  matchesPendingRoomPollRequest,
} from "@/lib/room-poll-request.mjs";
import {
  getRoomStylePrompt,
  resolveRoomStyleSelection,
} from "@/lib/room-style-command.mjs";
import { parseRoomCommand } from "@/lib/room-terminal.mjs";
import type { RoomCommand } from "@/lib/room-terminal-types";
import { askInkogHelp } from "@/lib/inkog-help-api";
import {
  formatSystemSoundStatus,
  parseSystemSoundCommand,
} from "@/lib/system-sound.mjs";
import { useSystemSound } from "@/lib/system-sound-provider";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:3001/api";
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://127.0.0.1:3001";
const ROOM_FONT_FAMILY = '"Departure Mono", monospace';

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

interface JoinRoomData {
  anonToken: string;
  alias: string;
  isCreator: boolean;
}

type Stage = "loading" | "password" | "joined" | "expired" | "error";
type RoomRoster = { visible: { alias: string; initials: string }[]; overflow: number };
type ComposerStatus = { tone: "muted" | "accent" | "error"; message: string };
type PendingComposerCommand =
  | { type: "style" }
  | { type: "poll"; step: "question" | "option"; draft: { question: string; options: string[] } }
  | null;
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
  const [activeThemeId, setActiveThemeId] = useState("green");
  const [isCreator, setIsCreator] = useState(false);
  const anonTokenRef = useRef<string>("");

  const [passwordError, setPasswordError] = useState("");
  const [passwordGateUnlocked, setPasswordGateUnlocked] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [terminalEvents, setTerminalEvents] = useState<TerminalEvent[]>([]);
  const [composerValue, setComposerValue] = useState("");
  const [socketError, setSocketError] = useState("");
  const [cursorVisible, setCursorVisible] = useState(true);
  const [composerStatus, setComposerStatus] = useState<ComposerStatus | null>(null);
  const [pendingCommand, setPendingCommand] = useState<PendingComposerCommand>(null);
  const [slashSuggestionIndex, setSlashSuggestionIndex] = useState(0);

  const socketRef = useRef<Socket | null>(null);
  const composerRef = useRef<HTMLInputElement | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const soundRef = useRef(sound);
  const composerStatusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousSecondsLeftRef = useRef<number | null>(null);
  const pendingPollRequestRef = useRef<ReturnType<typeof createPendingRoomPollRequest> | null>(null);
  const ttlTotalSecondsRef = useRef(0);

  useEffect(() => {
    soundRef.current = sound;
  }, [sound]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const currentThemeId = document.documentElement.getAttribute("data-inkog-theme");
    if (inkogThemeChoices.some(theme => theme.id === currentThemeId)) {
      setActiveThemeId(currentThemeId ?? "green");
    }
  }, []);

  useEffect(() => {
    return () => {
      if (composerStatusTimeoutRef.current) {
        clearTimeout(composerStatusTimeoutRef.current);
      }
    };
  }, []);

  const appendEvent = (kind: TerminalEvent["kind"], content: string) => {
    setTerminalEvents(current => [
      ...current,
      { id: makeId(), kind, content, createdAt: new Date().toISOString() },
    ]);
  };

  const setComposerStatusMessage = (message: string, tone: ComposerStatus["tone"] = "muted") => {
    setComposerStatus({ message, tone });
    if (composerStatusTimeoutRef.current) {
      clearTimeout(composerStatusTimeoutRef.current);
    }
    composerStatusTimeoutRef.current = setTimeout(() => {
      setComposerStatus(current => (current?.message === message ? null : current));
    }, 3200);
  };

  const clearComposerStatus = () => {
    if (composerStatusTimeoutRef.current) {
      clearTimeout(composerStatusTimeoutRef.current);
      composerStatusTimeoutRef.current = null;
    }
    setComposerStatus(null);
  };

  const transcript = useMemo(
    () => transcriptFrom(messages, polls, terminalEvents),
    [messages, polls, terminalEvents],
  );
  const peerColorMap = useMemo(
    () => buildRoomPeerColorMap([...roomUsers, ...messages.map(message => message.alias)], alias, activeThemeId),
    [activeThemeId, alias, messages, roomUsers],
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
    if (stage === "joined" || stage === "password") requestAnimationFrame(() => composerRef.current?.focus());
  }, [stage]);

  useEffect(() => {
    if (stage !== "joined") {
      previousSecondsLeftRef.current = secondsLeft;
      return;
    }

    const previousSecondsLeft = previousSecondsLeftRef.current;
    previousSecondsLeftRef.current = secondsLeft;
    if (previousSecondsLeft === null) return;

    const notification = getRoomCountdownNotification(previousSecondsLeft, secondsLeft);
    if (!notification) return;

    soundRef.current.play("countdownWarning");
    setMessages(current => [
      ...current,
      {
        id: makeId(),
        alias: "system",
        content: notification.message,
        createdAt: new Date().toISOString(),
        isSystem: true,
      },
    ]);
  }, [secondsLeft, stage]);

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

    socket.on("connect_error", () => {
      soundRef.current.play("error");
      setSocketError("Realtime connection is still trying. Chat will sync when it reconnects.");
      setTimeout(() => setSocketError(""), 3600);
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
      if (matchesPendingRoomPollRequest(pendingPollRequestRef.current, poll)) {
        pendingPollRequestRef.current = null;
        setComposerStatusMessage(`poll created: ${poll.question}`, "accent");
      } else {
        soundRef.current.play("pollCreated");
      }
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
      if (pendingPollRequestRef.current) {
        pendingPollRequestRef.current = null;
        setComposerStatusMessage(`could not create poll: ${message}`, "error");
      }

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

  const enterJoinedRoom = async (joinData: JoinRoomData, options: { fromPasswordGate?: boolean } = {}) => {
    anonTokenRef.current = joinData.anonToken;
    setStoredToken(roomId, joinData.anonToken);
    setAlias(joinData.alias);
    setIsCreator(joinData.isCreator);
    if (options.fromPasswordGate) setPasswordGateUnlocked(true);
    await fetchHistory(joinData.anonToken);
    setStage(resolveRoomStageAfterAuthenticatedJoin());
    connectSocket(joinData.anonToken, joinData.alias, () => undefined);
  };

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setPasswordError("");
      setPasswordGateUnlocked(false);

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
        ttlTotalSecondsRef.current = Math.max(1, roomData.totalSeconds ?? roomData.secondsLeft);

        if (roomData.secondsLeft <= 0) {
          setStage("expired");
          return;
        }

        const storedToken = getStoredToken(roomId);
        if (roomData.hasPassword && !storedToken) {
          setStage("password");
          return;
        }

        let joinData: JoinRoomData;
        try {
          joinData = await doJoin();
        } catch (err: unknown) {
          const e = err as { status?: number; message?: string };
          if (roomData.hasPassword && e.status === 403) {
            setStage("password");
            return;
          }
          throw err;
        }
        if (cancelled) return;
        await enterJoinedRoom(joinData);
        if (cancelled) return;
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

  const handlePasswordSubmit = async (passwordValue: string) => {
    const nextPassword = passwordValue.trim();
    setPasswordError("");
    if (!nextPassword) {
      sound.play("error");
      setPasswordError("Password is required.");
      return;
    }

    try {
      const joinData = await doJoin(nextPassword);
      sound.play("success");
      await enterJoinedRoom(joinData, { fromPasswordGate: true });
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

    pendingPollRequestRef.current = createPendingRoomPollRequest(question, options);
    socketRef.current.emit("create_poll", { question, options });
    sound.play("pollCreated");
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
      sound.play("success");
      setComposerStatusMessage("share link copied", "accent");
    } catch {
      sound.play("error");
      setComposerStatusMessage("could not copy share link", "error");
    }
  };

  const printHelp = (commandType = "help") => {
    const base = "commands: /help /commands /style /sound /poll /share /leave /exit";
    const creator = isCreator ? " /close" : "";
    setComposerStatusMessage(
      commandType === "commands" ? `${base}${creator}` : `try ${base}${creator}`,
      "muted",
    );
  };

  const askProjectHelp = async (question: string) => {
    setComposerStatusMessage("asking inkog...", "muted");

    try {
      const result = await askInkogHelp(API, question);
      sound.play("notify");
      setComposerStatus(null);
      setMessages(current => [
        ...current,
        {
          id: makeId(),
          alias: "inkog",
          content: result.answer,
          createdAt: new Date().toISOString(),
          isSystem: true,
        },
      ]);
    } catch {
      sound.play("error");
      setComposerStatusMessage("I could not reach the inkog help brain right now.", "error");
    }
  };

  const handleSoundCommand = (rawCommand: string) => {
    const parsed = parseSystemSoundCommand(rawCommand);

    if (parsed.type === "invalid") {
      sound.play("error");
      setComposerStatusMessage(parsed.message ?? "usage: /sound on, /sound off, or /sound status", "error");
      return true;
    }

    if (parsed.type === "status") {
      sound.play("notify");
      setComposerStatusMessage(formatSystemSoundStatus(sound.muted), "muted");
      return true;
    }

    const nextMuted = parsed.muted === true;
    if (nextMuted) {
      sound.play("close");
    } else {
      sound.play("notify");
    }
    sound.setMuted(nextMuted);
    setComposerStatusMessage(formatSystemSoundStatus(nextMuted), "accent");
    return true;
  };

  const applyResolvedStyleChoice = (argument: string) => {
    const result = resolveRoomStyleSelection(argument);

    if (!result.ok) {
      sound.play("error");
      setComposerStatusMessage(result.message ?? "choose 1, 2, 3, 4, 5, or a theme name", "error");
      return false;
    }

    const theme = result.theme;
    const transcriptMessage = result.transcriptMessage;
    if (!theme || !transcriptMessage) {
      sound.play("error");
      setComposerStatusMessage("choose 1, 2, 3, 4, 5, or a theme name", "error");
      return false;
    }

    applyInkogTheme(
      {
        documentElement: typeof document !== "undefined" ? document.documentElement : undefined,
        storage: typeof window !== "undefined" ? window.localStorage : undefined,
      },
      theme.id,
    );
    setActiveThemeId(theme.id);
    sound.play("notify");
    clearComposerStatus();
    setMessages(current => [
      ...current,
      {
        id: makeId(),
        alias: "system",
        content: transcriptMessage,
        createdAt: new Date().toISOString(),
        isSystem: true,
      },
    ]);
    return true;
  };

  const handleStyleCommand = (argument: string) => {
    if (!argument) {
      setPendingCommand({ type: "style" });
      setComposerStatusMessage(getRoomStylePrompt(), "muted");
      sound.play("notify");
      return;
    }

    setPendingCommand(null);
    applyResolvedStyleChoice(argument);
  };

  const handlePollCommand = () => {
    const nextState = {
      type: "poll" as const,
      step: "question" as const,
      draft: createEmptyRoomPollDraft(),
    };
    setPendingCommand(nextState);
    setComposerStatusMessage(getRoomPollPrompt(nextState), "muted");
    sound.play("notify");
  };

  const closeRoomWithConfirm = () => {
    if (window.confirm("Close chat for everyone? This cannot be undone.")) closeRoom();
  };

  const runSlashSuggestion = (command: string) => {
    setSlashSuggestionIndex(0);
    setComposerValue("");

    if (command === "/poll") {
      handlePollCommand();
      return;
    }

    if (command === "/style") {
      handleStyleCommand("");
      return;
    }

    if (command === "/sound") {
      sound.play("press");
      setComposerValue("/sound ");
      requestAnimationFrame(() => composerRef.current?.focus());
      return;
    }

    if (command === "/share") {
      void copyShareLink();
      return;
    }

    if (command === "/leave") {
      handleLeave();
      return;
    }

    if (command === "/close") {
      if (!isCreator) {
        sound.play("error");
        setComposerStatusMessage("only the creator can close this chat", "error");
        return;
      }
      sound.play("press");
      closeRoomWithConfirm();
      return;
    }

    printHelp();
    sound.play("notify");
  };

  const runComposer = () => {
    const rawValue = composerValue;
    const value = rawValue.trim();
    setComposerValue("");

    if (stage === "loading") {
      return;
    }

    if (stage === "password") {
      setPendingCommand(null);
      void handlePasswordSubmit(rawValue);
      return;
    }

    if (pendingCommand?.type === "style") {
      if (!value) {
        setComposerStatusMessage(getRoomStylePrompt(), "muted");
        return;
      }

      if (value.startsWith("/")) {
        setPendingCommand(null);
      } else {
        if (applyResolvedStyleChoice(value)) {
          setPendingCommand(null);
        }
        return;
      }
    }

    if (pendingCommand?.type === "poll") {
      if (value.startsWith("/")) {
        setPendingCommand(null);
      } else {
        const result = submitRoomPollDraftAnswer(pendingCommand, value);

        if (result.status === "invalid") {
          sound.play("error");
          setComposerStatusMessage(result.message ?? "poll input is invalid", "error");
          return;
        }

        if (result.status === "pending") {
          if (!("state" in result) || !result.state) {
            sound.play("error");
            setComposerStatusMessage("poll draft could not continue", "error");
            return;
          }

          const nextPendingPollCommand: PendingComposerCommand = {
            type: "poll",
            step: result.state.step as "question" | "option",
            draft: result.state.draft,
          };
          setPendingCommand(nextPendingPollCommand);
          setComposerStatusMessage(result.message, "muted");
          sound.play("notify");
          return;
        }

        setPendingCommand(null);
        if (!emitPoll(result.payload.question, result.payload.options)) return;
        setComposerStatusMessage(`creating poll: ${result.payload.question}`, "muted");
        return;
      }
    }

    const command = parseRoomCommand(value) as RoomCommand;

    if (value.toLowerCase().replace(/^\/+/, "").startsWith("sound")) {
      handleSoundCommand(value.startsWith("/") ? value : `/${value}`);
      return;
    }

    switch (command.type) {
      case "empty":
        return;
      case "poll":
        handlePollCommand();
        return;
      case "poll-inline":
        if (!emitPoll(command.question, command.options)) return;
        setComposerStatusMessage(`creating poll: ${command.question}`, "muted");
        return;
      case "message":
        sendChatMessage(command.text);
        setComposerStatus(null);
        setPendingCommand(null);
        return;
      case "style":
        handleStyleCommand(command.argument);
        return;
      case "invalid":
        sound.play("error");
        setComposerStatusMessage(command.message, "error");
        return;
      case "commands":
        printHelp("commands");
        sound.play("notify");
        return;
      case "share":
        void copyShareLink();
        return;
      case "leave":
        handleLeave();
        return;
      case "exit":
        handleLeave();
        return;
      case "close":
        if (!isCreator) {
          sound.play("error");
          setComposerStatusMessage("only the creator can close this room", "error");
          return;
        }
        closeRoomWithConfirm();
        return;
      case "help":
        printHelp();
        sound.play("notify");
        return;
      case "help-question":
        void askProjectHelp(command.question);
        return;
      case "unknown":
        sound.play("error");
        setComposerStatusMessage(`command not found: ${command.command}`, "error");
        return;
    }
  };

  const votePoll = (pollId: string, optionIndex: number) => {
    sound.play("pollVoted");
    socketRef.current?.emit("vote_poll", { pollId, optionIndex });
  };

  const totalVotes = (poll: Poll) => poll.votesByMember.length;
  const votesFor = (poll: Poll, idx: number) => poll.votesByMember.filter(v => v.optionIndex === idx).length;
  const myVote = (poll: Poll) => poll.votesByMember.find(v => v.alias === alias)?.optionIndex ?? -1;
  const isRoomBooting = stage === "loading";
  const isPasswordGate = stage === "password";
  const usersTitle = roomUsers.length ? roomUsers.join("\n") : "No users online";
  const roster = getRoomRoster(roomUsers);
  const pollInlinePrompt = !isRoomBooting && !isPasswordGate && pendingCommand?.type === "poll" ? getRoomPollInlinePrompt(pendingCommand) : null;
  const showIdleCursor = composerValue.length === 0 && !pollInlinePrompt;
  const composerChrome = getRoomComposerChrome({
    composerStatus: isRoomBooting || isPasswordGate ? null : composerStatus,
    pendingCommand: isRoomBooting || isPasswordGate ? null : pendingCommand,
  });
  const slashSuggestions = isRoomBooting || isPasswordGate ? [] : getRoomSlashCommandSuggestions({ isCreator, query: composerValue });
  const showSlashSuggestions = slashSuggestions.length > 0 && !pendingCommand;
  const composerExpanded = composerChrome.expanded;
  const showComposerHint = showIdleCursor && !showSlashSuggestions && composerChrome.statusMode === "hidden";
  const gateTranscriptLines = isRoomBooting
    ? []
    : isPasswordGate
      ? buildRoomGateTranscriptLines({ topic, state: "locked" })
      : passwordGateUnlocked
        ? buildRoomGateTranscriptLines({ topic, state: "unlocked" })
        : [];
  const ttlMeter = getRoomTtlMeter({ secondsLeft, totalSeconds: ttlTotalSecondsRef.current });
  const composerStatusColor =
    composerStatus?.tone === "error"
      ? "var(--red)"
      : composerStatus?.tone === "accent"
        ? "var(--accent)"
        : "var(--text-muted)";

  useEffect(() => {
    setSlashSuggestionIndex(index => {
      if (!showSlashSuggestions) return 0;
      return Math.min(index, Math.max(slashSuggestions.length - 1, 0));
    });
  }, [showSlashSuggestions, slashSuggestions.length]);

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

  return (
    <main style={styles.roomShell} onClick={() => composerRef.current?.focus()}>
      <AmbientShaderBackground opacity={roomAmbientShaderOpacity} style={{ mixBlendMode: "screen", zIndex: 0 }} />
      <header style={styles.roomHeader}>
        <div style={styles.headerIdentity}>
          <span style={styles.brand}>inkog</span>
          <span style={styles.headerDivider}>/</span>
          <span style={styles.topic} title={topic}>{topic}</span>
        </div>
        <div style={styles.headerMeta}>
          <AvatarRoster roster={roster} usersTitle={usersTitle} />
          <RoomTtlMeter meter={ttlMeter} />
        </div>
      </header>

      {socketError && <div style={styles.errorToast}>error: {socketError}</div>}

      <section aria-label="Room terminal transcript" style={styles.transcript}>
        {gateTranscriptLines.length > 0 ? (
          <RoomGateTranscript lines={gateTranscriptLines} passwordError={isPasswordGate ? passwordError : ""} />
        ) : null}
        {isRoomBooting || isPasswordGate ? null : transcript.length === 0 ? (
          <div style={styles.emptyTranscript}>
            <p style={styles.emptyLine}>system: joined as {alias}</p>
            <p style={styles.emptyLine}>system: type a message</p>
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

            return (
              <TerminalMessage
                alias={alias}
                key={item.message.id}
                message={item.message}
                peerColorMap={peerColorMap}
              />
            );
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
        <div
          style={{
            ...styles.composerFrame,
            minHeight: composerExpanded ? "76px" : "56px",
          }}
        >
          <div
            aria-hidden={!showSlashSuggestions}
            style={{
              ...styles.slashCommandMenu,
              maxHeight: showSlashSuggestions ? "220px" : "0px",
              opacity: showSlashSuggestions ? 1 : 0,
              marginBottom: showSlashSuggestions ? "6px" : "0px",
              pointerEvents: showSlashSuggestions ? "auto" : "none",
            }}
          >
            {showSlashSuggestions ? slashSuggestions.map((item, index) => {
              const selected = slashSuggestionIndex === index;

              return (
                <button
                  key={item.command}
                  onClick={() => runSlashSuggestion(item.command)}
                  onMouseEnter={() => {
                    setSlashSuggestionIndex(index);
                    sound.play("hover");
                  }}
                  style={{
                    ...styles.slashCommandItem,
                    background: selected ? "color-mix(in srgb, var(--accent) 7%, transparent)" : "transparent",
                    color: selected ? "var(--accent)" : "var(--text)",
                  }}
                  type="button"
                >
                  <span aria-hidden="true" style={styles.slashCommandMarker}>{selected ? ">" : ""}</span>
                  <span style={styles.slashCommandName}>{item.command}</span>
                  <span style={styles.slashCommandDescription}>{item.label}</span>
                </button>
              );
            }) : null}
          </div>
          <div
            aria-hidden={composerChrome.statusMode !== "inline"}
            style={{
              ...styles.composerInlineStatus,
              maxHeight: composerChrome.statusMode === "inline" ? "22px" : "0px",
              marginBottom: composerChrome.statusMode === "inline" ? "6px" : "0px",
              opacity: composerChrome.statusMode === "inline" ? 1 : 0,
            }}
          >
            <p style={{ ...styles.composerStatus, color: composerStatusColor }}>
              {composerChrome.statusMode === "inline" ? (composerStatus?.message ?? "") : ""}
            </p>
          </div>
          <div style={styles.composerRow}>
            <label htmlFor="room-terminal-input" style={styles.srOnly}>room command</label>
            <span aria-hidden="true" style={styles.composerPrompt}>$</span>
            {pollInlinePrompt ? (
              <span aria-hidden="true" style={styles.composerPollPrefix}>
                {pollInlinePrompt.prefix}
              </span>
            ) : null}
            {showIdleCursor || showComposerHint ? (
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
                {showComposerHint ? (
                  <span style={styles.composerHint}>
                    {isRoomBooting ? "opening chat" : isPasswordGate ? "write password to enter chat" : "type to chat, or / for commands"}
                  </span>
                ) : null}
              </span>
            ) : null}
            <input
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              id="room-terminal-input"
              onChange={event => {
                setComposerValue(event.target.value);
                setSlashSuggestionIndex(0);
              }}
              onKeyDown={event => {
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
              ref={composerRef}
              spellCheck={false}
              disabled={isRoomBooting}
              placeholder={isRoomBooting ? "opening chat" : isPasswordGate ? "write password" : pollInlinePrompt?.placeholder}
              style={{
                ...styles.composerInput,
                caretColor: showIdleCursor ? "transparent" : "var(--text)",
                color: pollInlinePrompt ? "var(--accent)" : "var(--text)",
              }}
              type={isPasswordGate ? "password" : "text"}
              value={composerValue}
            />
          </div>
        </div>
      </form>
    </main>
  );
}

function RoomGateTranscript({ lines, passwordError }: { lines: string[]; passwordError?: string }) {
  return (
    <div style={styles.gateTranscript}>
      {lines.map(line => (
        <p
          key={line}
          style={{
            ...styles.transcriptLine,
            color: line === "--------" ? "var(--text-dim)" : line.includes("password accepted") ? "var(--accent)" : "var(--text-muted)",
          }}
        >
          {line}
        </p>
      ))}
      {passwordError ? (
        <p style={{ ...styles.transcriptLine, color: "var(--red)" }}>error: {passwordError}</p>
      ) : null}
    </div>
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
      <AmbientShaderBackground opacity={roomAmbientShaderOpacity} style={{ mixBlendMode: "screen", zIndex: 0 }} />
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

function TerminalMessage({
  alias,
  message,
  peerColorMap,
}: {
  alias: string;
  message: Message;
  peerColorMap: Record<string, string>;
}) {
  const presentation = classifyRoomMessage(message, alias);
  const lineColor =
    presentation.kind === "incoming"
      ? peerColorMap[message.alias] ?? "var(--accent)"
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
    <div aria-label={`${roster.visible.length + roster.overflow} online`} style={styles.roster}>
      {roster.visible.map((member, index) => (
        <span
          key={member.alias}
          style={{
            ...styles.rosterMember,
            marginLeft: index === 0 ? 0 : "-8px",
            zIndex: roster.visible.length - index,
          }}
          title={member.alias}
        >
          <span aria-label={member.alias} style={styles.rosterAvatar}>
            {member.initials}
          </span>
        </span>
      ))}
      {roster.overflow > 0 && (
        <span
          style={{
            ...styles.rosterAvatar,
            ...styles.rosterOverflow,
            marginLeft: roster.visible.length > 0 ? "-8px" : 0,
          }}
          title={usersTitle}
        >
          +{roster.overflow}
        </span>
      )}
    </div>
  );
}

function RoomTtlMeter({
  meter,
}: {
  meter: ReturnType<typeof getRoomTtlMeter>;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const meterColor = meter.warning ? "var(--red)" : "var(--accent)";

  return (
    <span
      aria-label={`room expires in ${meter.time}`}
      onBlur={() => setPreviewOpen(false)}
      onFocus={() => setPreviewOpen(true)}
      onMouseEnter={() => setPreviewOpen(true)}
      onMouseLeave={() => setPreviewOpen(false)}
      onPointerDown={() => setPreviewOpen(open => !open)}
      style={{
        ...styles.ttlMeter,
        color: meter.warning ? "var(--red)" : "var(--text-muted)",
      }}
      tabIndex={0}
    >
      <span
        aria-hidden="true"
        style={{
          ...styles.ttlTrack,
          opacity: previewOpen ? 1 : 0,
        }}
      >
        <span
          style={{
            ...styles.ttlFill,
            background: meterColor,
            width: `${meter.percent}%`,
          }}
        />
      </span>
      <span
        style={{
          ...styles.ttlTime,
          color: meterColor,
          opacity: previewOpen ? 0 : 1,
        }}
      >
        {meter.time}
      </span>
      {meter.marker ? <span aria-hidden="true" style={styles.ttlMarker}>{meter.marker}</span> : null}
    </span>
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
  const [hoveredOption, setHoveredOption] = useState<number | null>(null);
  const meterSlots = 16;

  return (
    <div style={styles.pollBlock}>
      <div aria-hidden="true" style={styles.pollBoxRule}>
        <span style={styles.pollBoxRuleText}>┌─ poll --active </span>
        <span style={styles.pollBoxRuleFill} />
        <span style={styles.pollBoxRuleText}>┐</span>
      </div>
      <div style={styles.pollBoxBody}>
        <p style={styles.pollQuestion}>{poll.question}</p>
        <div style={styles.pollOptions}>
          {poll.options.map((option, index) => {
            const count = votesFor(poll, index);
            const percent = total > 0 ? count / total : 0;
            const filledSlots = total > 0 ? Math.round(percent * meterSlots) : 0;
            const meter = `${"█".repeat(filledSlots)}${"░".repeat(meterSlots - filledSlots)}`;
            const selected = myVote === index;
            const hovered = hoveredOption === index;

            return (
              <button
                key={option}
                onBlur={() => setHoveredOption(null)}
                onFocus={() => setHoveredOption(index)}
                onClick={() => onVote(poll.pollId, index)}
                onMouseEnter={() => {
                  setHoveredOption(index);
                  sound.play("hover");
                }}
                onMouseLeave={() => setHoveredOption(null)}
                style={{
                  ...styles.pollOption,
                  backgroundColor: selected
                    ? "color-mix(in srgb, var(--accent) 10%, transparent)"
                    : hovered
                      ? "color-mix(in srgb, var(--text) 5%, transparent)"
                      : "transparent",
                  color: selected || hovered ? "var(--accent)" : "var(--text)",
                }}
                type="button"
              >
                <span aria-hidden="true" style={styles.pollOptionMarker}>{selected || hovered ? ">" : ""}</span>
                <span
                  style={{
                    ...styles.pollOptionIndex,
                    color: selected ? "var(--accent)" : hovered ? "var(--text-muted)" : "var(--text-dim)",
                  }}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span style={styles.pollOptionLabel}>{option}</span>
                <span
                  aria-hidden="true"
                  style={{
                    ...styles.pollOptionMeter,
                    color: selected ? "var(--accent)" : hovered ? "var(--text-muted)" : "var(--text-dim)",
                    opacity: selected ? 0.86 : hovered ? 0.5 : 0.34,
                  }}
                >
                  {meter}
                </span>
                <span
                  style={{
                    ...styles.pollStat,
                    color: selected ? "var(--accent)" : hovered ? "var(--text)" : "var(--text-muted)",
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        <p style={styles.pollFooter}>:: {total} vote{total === 1 ? "" : "s"}</p>
      </div>
      <div aria-hidden="true" style={styles.pollBoxRule}>
        <span style={styles.pollBoxRuleText}>└</span>
        <span style={styles.pollBoxRuleFill} />
        <span style={styles.pollBoxRuleText}>┘</span>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  roomShell: {
    backgroundColor: roomThemeBackground.baseColor,
    backgroundImage: roomThemeBackground.background,
    backgroundBlendMode: roomThemeBackground.blendMode as CSSProperties["backgroundBlendMode"],
    color: "var(--text)",
    display: "flex",
    flexDirection: "column",
    fontFamily: ROOM_FONT_FAMILY,
    height: "100dvh",
    isolation: "isolate",
    overflow: "hidden",
    position: "relative",
  },
  roomHeader: {
    alignItems: "center",
    borderBottom: "1px solid color-mix(in srgb, var(--text-dim) 28%, transparent)",
    display: "flex",
    flexShrink: 0,
    gap: "16px",
    justifyContent: "space-between",
    minHeight: "64px",
    padding: "12px clamp(32px, calc(3vw + 16px), 48px)",
    position: "relative",
    zIndex: 1,
  },
  headerIdentity: {
    alignItems: "center",
    display: "flex",
    gap: "10px",
    minWidth: 0,
  },
  brand: {
    color: "var(--text)",
    fontFamily: ROOM_FONT_FAMILY,
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
  ttlMeter: {
    alignItems: "center",
    cursor: "default",
    display: "inline-flex",
    gap: "6px",
    height: "18px",
    minWidth: "56px",
    outline: "none",
    position: "relative",
    whiteSpace: "nowrap",
  },
  ttlTrack: {
    background: "rgba(255, 255, 255, 0.055)",
    display: "inline-flex",
    height: "8px",
    overflow: "hidden",
    position: "absolute",
    right: 0,
    top: "50%",
    transform: "translateY(-50%)",
    transition: "opacity 140ms ease",
    width: "56px",
  },
  ttlFill: {
    display: "block",
    height: "100%",
    minWidth: "2px",
    opacity: 0.78,
    transition: "width 900ms cubic-bezier(0.22, 1, 0.36, 1), background-color 180ms ease",
  },
  ttlTime: {
    fontSize: "13px",
    minWidth: "56px",
    textAlign: "right",
    transition: "opacity 120ms ease",
  },
  ttlMarker: {
    color: "var(--red)",
    fontSize: "13px",
  },
  roster: {
    alignItems: "center",
    display: "inline-flex",
    marginRight: "6px",
    minHeight: "32px",
  },
  rosterMember: {
    alignItems: "center",
    display: "inline-flex",
    position: "relative",
  },
  rosterAvatar: {
    alignItems: "center",
    background: "var(--bg-3)",
    border: "1px solid var(--border-light)",
    borderRadius: "999px",
    color: "var(--text)",
    display: "inline-flex",
    fontSize: "12px",
    height: "32px",
    justifyContent: "center",
    lineHeight: 1,
    minWidth: "32px",
    padding: "0 8px",
    position: "relative",
  },
  rosterOverflow: {
    background: "var(--bg)",
    color: "var(--text-muted)",
  },
  errorToast: {
    background: "rgba(255, 87, 87, 0.12)",
    color: "var(--red)",
    flexShrink: 0,
    fontSize: "12px",
    padding: "8px clamp(16px, 3vw, 32px)",
    position: "relative",
    zIndex: 1,
  },
  transcript: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    gap: "6px",
    overflowY: "auto",
    padding: "24px clamp(32px, calc(3vw + 16px), 48px)",
    position: "relative",
    zIndex: 1,
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
  gateTranscript: {
    color: "var(--text-muted)",
    fontSize: "14px",
    lineHeight: "24px",
    paddingTop: "8vh",
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
    background: "color-mix(in srgb, var(--bg-2) 42%, transparent)",
    borderRadius: 0,
    margin: "10px 0",
    maxWidth: "720px",
    padding: 0,
  },
  pollBoxRule: {
    alignItems: "center",
    color: "color-mix(in srgb, var(--text-dim) 68%, transparent)",
    display: "flex",
    fontSize: "14px",
    lineHeight: "20px",
    overflow: "hidden",
    whiteSpace: "nowrap",
  },
  pollBoxRuleText: {
    flexShrink: 0,
  },
  pollBoxRuleFill: {
    borderTop: "1px solid currentColor",
    flex: 1,
    minWidth: "24px",
    transform: "translateY(1px)",
  },
  pollBoxBody: {
    borderLeft: "1px solid color-mix(in srgb, var(--text-dim) 40%, transparent)",
    borderRight: "1px solid color-mix(in srgb, var(--text-dim) 40%, transparent)",
    padding: "12px clamp(14px, 4vw, 32px) 14px",
  },
  pollQuestion: {
    color: "var(--text)",
    fontSize: "14px",
    lineHeight: "24px",
    margin: "0 0 16px",
    overflowWrap: "anywhere",
  },
  pollOptions: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  pollOption: {
    alignItems: "center",
    backgroundColor: "transparent",
    border: 0,
    borderRadius: 0,
    cursor: "pointer",
    display: "grid",
    gridTemplateColumns: "14px 32px minmax(80px, 1fr) 128px 32px",
    fontFamily: ROOM_FONT_FAMILY,
    fontSize: "14px",
    gap: "8px",
    lineHeight: "24px",
    minHeight: "28px",
    padding: "0 6px",
    textAlign: "left",
    transition: "color 0.15s ease, opacity 0.15s ease, background-color 0.15s ease",
    width: "100%",
  },
  pollOptionLabel: {
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  pollOptionMarker: {
    color: "var(--accent)",
    flexShrink: 0,
    width: "10px",
  },
  pollOptionIndex: {
    color: "var(--text-dim)",
    flexShrink: 0,
  },
  pollOptionMeter: {
    fontSize: "12px",
    letterSpacing: "-0.02em",
    overflow: "hidden",
    whiteSpace: "nowrap",
  },
  pollStat: {
    color: "var(--text-muted)",
    flexShrink: 0,
    fontSize: "13px",
    minWidth: "24px",
    textAlign: "right",
  },
  pollFooter: {
    color: "var(--text-dim)",
    fontSize: "12px",
    lineHeight: "20px",
    margin: "16px 0 0",
  },
  composer: {
    display: "flex",
    flexDirection: "column",
    flexShrink: 0,
    position: "relative",
    zIndex: 1,
  },
  composerFrame: {
    backdropFilter: "blur(18px) saturate(1.22)",
    background: "linear-gradient(180deg, color-mix(in srgb, var(--bg-2) 72%, transparent) 0%, color-mix(in srgb, var(--bg) 84%, transparent) 100%)",
    borderTop: "1px solid color-mix(in srgb, var(--text-dim) 28%, transparent)",
    boxShadow: "inset 0 1px 0 color-mix(in srgb, var(--text) 5%, transparent), 0 -18px 42px rgba(0, 0, 0, 0.18)",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: 0,
    justifyContent: "center",
    minHeight: "52px",
    overflow: "hidden",
    padding: "10px clamp(32px, calc(3vw + 16px), 48px)",
    transition: "min-height 150ms cubic-bezier(0.23, 1, 0.32, 1)",
    WebkitBackdropFilter: "blur(18px) saturate(1.22)",
    width: "100%",
  },
  composerInlineStatus: {
    overflow: "hidden",
    transition: "max-height 180ms cubic-bezier(0.23, 1, 0.32, 1), opacity 140ms ease",
  },
  slashCommandMenu: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    maxWidth: "520px",
    overflow: "hidden",
    pointerEvents: "auto",
    transition: "max-height 150ms cubic-bezier(0.23, 1, 0.32, 1), opacity 90ms ease-out",
    width: "min(520px, 100%)",
    willChange: "opacity",
  },
  slashCommandItem: {
    alignItems: "center",
    background: "transparent",
    border: 0,
    borderRadius: 0,
    cursor: "pointer",
    display: "flex",
    fontFamily: ROOM_FONT_FAMILY,
    fontSize: "12px",
    gap: "10px",
    lineHeight: "20px",
    minHeight: "24px",
    padding: "3px 8px",
    textAlign: "left",
    transition: "background-color 0.12s ease, color 0.12s ease",
    width: "100%",
  },
  slashCommandMarker: {
    color: "var(--accent)",
    flexShrink: 0,
    width: "10px",
  },
  slashCommandName: {
    color: "inherit",
    flexShrink: 0,
  },
  slashCommandDescription: {
    color: "var(--text-dim)",
    flex: 1,
    minWidth: 0,
    overflow: "hidden",
    textAlign: "right",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  composerRow: {
    alignItems: "center",
    display: "flex",
    gap: "8px",
    minHeight: "26px",
    width: "100%",
  },
  composerStatus: {
    fontSize: "12px",
    lineHeight: "18px",
    margin: 0,
    width: "100%",
  },
  composerPrompt: {
    color: "var(--accent)",
    flexShrink: 0,
    fontSize: "14px",
    lineHeight: "24px",
  },
  composerPollPrefix: {
    color: "var(--text)",
    flexShrink: 0,
    fontSize: "14px",
    lineHeight: "24px",
    whiteSpace: "pre",
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
    fontFamily: ROOM_FONT_FAMILY,
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
    fontFamily: ROOM_FONT_FAMILY,
    isolation: "isolate",
    justifyContent: "center",
    minHeight: "100dvh",
    overflow: "hidden",
    padding: "24px",
    position: "relative",
  },
  statePanel: {
    maxWidth: "520px",
    position: "relative",
    width: "100%",
    zIndex: 1,
  },
  passwordPanel: {
    maxWidth: "420px",
    position: "relative",
    width: "100%",
    zIndex: 1,
  },
  stateKicker: {
    color: "var(--text-dim)",
    fontSize: "12px",
    margin: "0 0 8px",
  },
  stateTitle: {
    color: "var(--text)",
    fontFamily: ROOM_FONT_FAMILY,
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
    fontFamily: ROOM_FONT_FAMILY,
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
