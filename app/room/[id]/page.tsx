"use client";

import type { CSSProperties, MouseEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { io, type Socket } from "socket.io-client";

import { useRouteHandoff } from "@/components/route-handoff-provider";
import { ExpiredRoomPixelBubble } from "@/components/expired-room-pixel-bubble";
import { getSlashCommandTokenDeletionRange } from "@/lib/slash-command-token.mjs";
import {
  buildRoomGateTranscriptLines,
  buildRoomPeerColorMap,
  classifyRoomMessage,
  isRoomComposerInteractive,
  resolveRoomStageAfterAuthenticatedJoin,
} from "@/lib/room-chat-ui.mjs";
import { getRoomComposerChrome, getRoomSlashCommandSuggestions } from "@/lib/room-composer-ui.mjs";
import {
  applyInkogTheme,
  inkogThemeChoices,
} from "@/lib/inkog-theme.mjs";
import { roomThemeBackground } from "@/lib/room-background.mjs";
import { buildRoomShareMessage, getRoomRoster, getRoomTtlMeter } from "@/lib/room-header-ui.mjs";
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
import {
  getStoredRoomPassword,
  resolveRoomPasswordCommand,
} from "@/lib/room-password-command.mjs";
import { parseRoomCommand } from "@/lib/room-terminal.mjs";
import type { RoomCommand } from "@/lib/room-terminal-types";
import { getInkogApiBaseUrl, getInkogSocketBaseUrl } from "@/lib/api-config.mjs";
import { askInkogHelp } from "@/lib/inkog-help-api";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard.mjs";
import { isExpiredRoomPreview } from "@/lib/room-preview.mjs";
import {
  isValidRoomId,
  resolveRoomAccessFailureStage,
  resolveRoomLookupOutcome,
} from "@/lib/room-lookup.mjs";
import {
  formatSystemSoundStatus,
  parseSystemSoundCommand,
} from "@/lib/system-sound.mjs";
import { useSystemSound } from "@/lib/system-sound-provider";

const API = getInkogApiBaseUrl();
const SOCKET_URL = getInkogSocketBaseUrl();
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
  createdByAlias?: string;
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
type PasswordReveal = { password: string; hint: string };
type PendingComposerCommand =
  | { type: "style" }
  | { type: "poll"; step: "question" | "option"; draft: { question: string; options: string[] } }
  | null;
type TranscriptItem =
  | { type: "message"; message: Message; timestamp: number }
  | { type: "poll"; poll: Poll; timestamp: number }
  | { type: "event"; event: TerminalEvent; timestamp: number };

function createWorstCaseRoomScenario() {
  const now = Date.now();
  const createdAt = (minutesAgo: number) => new Date(now - minutesAgo * 60_000).toISOString();
  const alias = "Lantern Otter";
  const longAlias = "RidiculouslyLongAnonymousParticipantWithoutSpaces";
  const stressAliases = [
    "ExtraordinarilyLongParticipantAliasWithoutSpacesAndPunctuationForWrapping",
    "🧑🏽‍🔧✨",
    "مريم / מרין",
    "Q",
    "Élodie — late arrival",
    ...Array.from({ length: 20 }, (_, index) => `Visitor ${String(index + 1).padStart(2, "0")}`),
  ];
  const roomUsers = [
    alias,
    "Glowing Pebble",
    longAlias,
    "Northstar",
    "Moss Crew",
    "Quiet Comet",
    "Riverglass",
    "Saffron Cloud",
    "Pixel Gardener",
    "Cedar Echo",
    "Orbital Finch",
    "Harbor Light",
    "Tiny Avalanche",
    "Maple Circuit",
    "Blue Hour",
    ...stressAliases,
  ];
  const makeMessage = (
    id: string,
    sender: string,
    content: string,
    minutesAgo: number,
    isSystem = false,
  ): Message => ({ id, alias: sender, content, createdAt: createdAt(minutesAgo), isSystem });
  const makePoll = (
    pollId: string,
    question: string,
    options: string[],
    votes: Array<[string, number]>,
    minutesAgo: number,
    createdByAlias: string,
  ): Poll => ({
    pollId,
    question,
    options,
    votesByMember: votes.map(([voterAlias, optionIndex]) => ({ alias: voterAlias, optionIndex })),
    createdAt: createdAt(minutesAgo),
    createdByAlias,
  });
  const burstParticipants = roomUsers.slice(15, 24);
  const unbrokenToken = "X".repeat(520);
  const longParagraph = "The step-free route, rain backup, tool inventory, dietary labels, late arrivals, and cleanup owner all need to stay visible together while the group is still making decisions. ".repeat(6);
  const longUrl = `https://example.com/neighborhood/repair-weekend/venue-and-accessibility?${"arrival-window-and-accessibility-checklist=".repeat(12)}confirmed`;
  const burstMessages = burstParticipants.flatMap((sender, participantIndex) => {
    const contents = [
      `Update ${participantIndex + 1}: I can take one more task if someone is still waiting for a reply.`,
      `Follow-up: please keep the step-free entrance clear, and leave a little space around the work tables.\nSecond line: I will confirm the key pickup after lunch.`,
      `Long catch-up note from the volunteer thread: ${longParagraph}`,
      `This is the route detail that tends to stretch a narrow transcript: ${longUrl}`,
      "Mixed script check: café déjà vu · Ελληνικά · 日本語 · العربية · שלום · 👋🏽🧰✅",
      `Unbroken label stress ${participantIndex + 1}: ${unbrokenToken}`,
    ];

    return contents.map((content, messageIndex) => {
      const offsetSeconds = participantIndex * contents.length + messageIndex + 1;
      return makeMessage(
        `stress-message-burst-${String(participantIndex + 1).padStart(2, "0")}-${messageIndex + 1}`,
        sender,
        content,
        3 - offsetSeconds / 60,
      );
    });
  });
  const balancedRosterVotes: Array<[string, number]> = roomUsers.map((participant, index) => [participant, index % 4] as [string, number]);
  const highParticipationVotes: Array<[string, number]> = roomUsers.map((participant, index) => [participant, index % 3] as [string, number]);

  return {
    topic: "Neighborhood repair weekend",
    alias,
    roomUsers,
    secondsLeft: 3_599,
    totalSeconds: 3_600,
    messages: [
      makeMessage("stress-message-01", "system", `joined as ${alias}`, 49, true),
      makeMessage("stress-message-02", "system", "Glowing Pebble joined", 48, true),
      makeMessage("stress-message-03", "system", `${longAlias} joined`, 47, true),
      makeMessage("stress-message-04", "system", "37 more participants joined", 46, true),
      makeMessage("stress-message-05", alias, "Quick sanity check: can everybody see the plan, and can we keep decisions in this room?", 44),
      makeMessage("stress-message-06", "Glowing Pebble", "Yep. I can see it on my phone too.", 43),
      makeMessage(
        "stress-message-07",
        "Northstar",
        "Here is the full context before we decide: the community garden workday moved because the original site is closed, the second venue has limited covered space, and a few people can only arrive after lunch. Please keep the tool pickup, accessibility route, food plan, and rain backup together so nobody has to reconstruct the decision from twenty separate replies.",
        42,
      ),
      makeMessage("stress-message-08", "Quiet Comet", "ok", 41),
      makeMessage("stress-message-09", "Quiet Comet", "One more thing", 41),
      makeMessage("stress-message-10", "Quiet Comet", "I can bring the folding tables", 40),
      makeMessage(
        "stress-message-11",
        "Riverglass",
        "The venue details are here if the link wraps badly on a narrow screen: https://example.com/neighborhood/repair-weekend/venue-and-accessibility?source=room-invitation&view=all-locations&arrival=late",
        39,
      ),
      makeMessage("stress-message-12", longAlias, "I can bring the toolboxes, extension leads, labelled bins, spare gloves, and the sign-in sheets. Please tag me if the equipment list changes again.", 37),
      makeMessage("stress-message-13", "system", "Blue Hour left", 36, true),
      makeMessage("stress-message-14", "system", "Blue Hour rejoined", 35, true),
      makeMessage("stress-message-15", "Moss Crew", "雨なら屋根のある場所に変更できます。 / If it rains, we can move under the covered area.", 33),
      makeMessage("stress-message-16", alias, "Adding a poll for the venue now.", 32),
      makeMessage("stress-message-17", "Saffron Cloud", "I voted, but I may need to leave fifteen minutes early.", 29),
      makeMessage("stress-message-18", "Pixel Gardener", "Please count the step-free route as a hard requirement, not a tie-breaker.", 27),
      makeMessage("stress-message-19", "system", "Maple Circuit joined", 25, true),
      makeMessage("stress-message-20", "Maple Circuit", "For anyone catching up: the first vote is about venue only. Food and start time are separate.", 23),
      makeMessage("stress-message-21", "Harbor Light", "The forecast changed again. I pasted the short version below, and the full details are in the link above.", 20),
      makeMessage("stress-message-22", alias, "Can we settle the time before I send the final checklist?", 17),
      makeMessage("stress-message-23", "Tiny Avalanche", "08:30 is difficult for people taking the first bus; 10:00 is much safer.", 14),
      makeMessage("stress-message-24", "Cedar Echo", "I have one vote on the second poll. The first poll still has enough answers to compare.", 11),
      makeMessage("stress-message-25", "Orbital Finch", "Final reminder: bring water, label anything you leave behind, and post schedule changes here.", 7),
      makeMessage("stress-message-26", alias, "Thanks — I’ll pin the final plan after the last two votes come in.", 2),
      ...burstMessages,
    ],
    polls: [
      makePoll(
        "stress-poll-venue",
        "Which step-free venue should host the neighborhood repair weekend if the forecast keeps changing?",
        [
          "North garden pavilion with covered work tables",
          "Library community room near the accessible entrance",
          "School courtyard if the rain holds off until afternoon",
          "Keep the original site and move tools under the east awning",
        ],
        [
          [alias, 1], ["Glowing Pebble", 1], [longAlias, 0], ["Northstar", 2],
          ["Moss Crew", 1], ["Quiet Comet", 0], ["Riverglass", 1], ["Saffron Cloud", 3],
          ["Pixel Gardener", 1], ["Cedar Echo", 2], ["Orbital Finch", 1], ["Harbor Light", 3],
        ],
        31,
        alias,
      ),
      makePoll(
        "stress-poll-food",
        "What should we order for lunch? This poll has long option labels and no votes yet.",
        [
          "Vegetarian rice bowls with sauces packed separately",
          "Sandwiches with gluten-free and dairy-free choices clearly labelled",
          "Bring-your-own lunch and a shared table for snacks",
          "Order after arrival once we know the final head count",
        ],
        [],
        22,
        "Glowing Pebble",
      ),
      makePoll(
        "stress-poll-time",
        "Pick a start time that still works for late arrivals and the first bus.",
        ["08:30 — early setup, fewer buses", "10:00 — later start, easier arrival", "11:30 — lunch first, shorter work block", "Keep the time flexible until Friday"],
        [
          [alias, 1], ["Glowing Pebble", 1], [longAlias, 0], ["Northstar", 1],
          ["Moss Crew", 3], ["Quiet Comet", 0], ["Riverglass", 1], ["Saffron Cloud", 2],
          ["Pixel Gardener", 1], ["Cedar Echo", 2], ["Orbital Finch", 0], ["Harbor Light", 3],
          ["Tiny Avalanche", 1], ["Maple Circuit", 1], ["Blue Hour", 2],
        ],
        16,
        "Tiny Avalanche",
      ),
      makePoll(
        "stress-poll-tools",
        "Who can bring the remaining equipment?",
        ["Folding tables", "Extension leads", "Gloves and labels", "I can cover more than one item"],
        [[alias, 3]],
        5,
        "Cedar Echo",
      ),
      makePoll(
        "stress-poll-accessibility",
        "Which accessibility and weather plan should we publish as the single source of truth for everyone arriving at different times?",
        [
          "Use the library room, keep the step-free entrance unlocked, and move all tools inside before rain starts",
          "Use the garden pavilion only if the covered route is clear and the accessible drop-off stays open",
          "Split setup between both venues and post a live update whenever the forecast changes",
          "Wait until the final head count, then assign one volunteer to confirm the route with each late arrival",
        ],
        balancedRosterVotes,
        28,
        stressAliases[0],
      ),
      makePoll(
        "stress-poll-supply-check",
        "Which supply handoff can you personally confirm before the deadline?",
        [
          "I can bring labelled bins and a complete inventory",
          "I can bring tools but need someone else to carry them",
          "I can meet the first bus and help unload",
          "I can take the overflow task after the venue is chosen",
        ],
        highParticipationVotes,
        19,
        stressAliases[2],
      ),
      makePoll(
        "stress-poll-lunch-overflow",
        "Choose a lunch plan that still works if the group grows, dietary notes arrive late, and deliveries are split across two entrances.",
        [
          "Order individually labelled vegetarian, vegan, gluten-free, and dairy-free meals with sauces packed separately",
          "Collect dietary details in the room, confirm quantities twice, then place one order for the accessible entrance",
          "Bring-your-own lunch and reserve a clearly marked shared table for snacks, water, and allergy-safe items",
          "Delay the order until arrival and ask a volunteer to check every package against the final participant list",
        ],
        [],
        12,
        "Élodie — late arrival",
      ),
      makePoll(
        "stress-poll-last-minute",
        "Should we keep the cleanup team for one more hour?",
        [
          "Yes, keep the covered room until every borrowed item is checked back in",
          "No, finish on time and leave the final inventory with the venue host",
        ],
        [[alias, 0], [roomUsers[roomUsers.length - 1], 1], [roomUsers[roomUsers.length - 2], 0]],
        4,
        "Q",
      ),
    ],
    events: [
      { id: "stress-event-03", kind: "error", content: "Make each poll option a little different.", createdAt: createdAt(9) },
    ] satisfies TerminalEvent[],
  };
}

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
  const {
    cancelRoomHandoff,
    composerStyle,
    getRoomPartStyle,
    markRoomReady,
    state: routeHandoffState,
  } = useRouteHandoff();

  const [stage, setStage] = useState<Stage>(() => (isValidRoomId(roomId) ? "loading" : "expired"));
  const [errorMsg, setErrorMsg] = useState("");
  const [topic, setTopic] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [onlineCount, setOnlineCount] = useState(0);
  const [roomUsers, setRoomUsers] = useState<string[]>([]);
  const [alias, setAlias] = useState("");
  const [activeThemeId, setActiveThemeId] = useState("green");
  const [isCreator, setIsCreator] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const anonTokenRef = useRef<string>("");

  const [passwordError, setPasswordError] = useState("");
  const [passwordGateUnlocked, setPasswordGateUnlocked] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [terminalEvents, setTerminalEvents] = useState<TerminalEvent[]>([]);
  const [isWorstCaseScenario, setIsWorstCaseScenario] = useState(false);
  const [composerValue, setComposerValue] = useState("");
  const [socketError, setSocketError] = useState("");
  const [isRealtimeReady, setIsRealtimeReady] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [composerStatus, setComposerStatus] = useState<ComposerStatus | null>(null);
  const [pendingCommand, setPendingCommand] = useState<PendingComposerCommand>(null);
  const [passwordReveal, setPasswordReveal] = useState<PasswordReveal | null>(null);
  const [slashSuggestionIndex, setSlashSuggestionIndex] = useState(0);
  const [shareCopied, setShareCopied] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const composerRef = useRef<HTMLInputElement | null>(null);
  const transcriptViewportRef = useRef<HTMLElement | null>(null);
  const shouldFollowTranscriptRef = useRef(true);
  const soundRef = useRef(sound);
  const composerStatusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shareCopiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousSecondsLeftRef = useRef<number | null>(null);
  const pendingPollRequestRef = useRef<ReturnType<typeof createPendingRoomPollRequest> | null>(null);
  const ttlTotalSecondsRef = useRef(0);

  const focusComposer = () => {
    requestAnimationFrame(() => {
      const input = composerRef.current;
      if (!input) return;

      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    });
  };

  useEffect(() => {
    soundRef.current = sound;
  }, [sound]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const currentThemeId = document.documentElement.getAttribute("data-inkog-theme");
    const normalizedThemeId = currentThemeId === "crimson" ? "green" : currentThemeId;
    if (inkogThemeChoices.some(theme => theme.id === normalizedThemeId)) {
      setActiveThemeId(normalizedThemeId ?? "green");
    }
  }, []);

  useEffect(() => {
    return () => {
      if (composerStatusTimeoutRef.current) {
        clearTimeout(composerStatusTimeoutRef.current);
      }
      if (shareCopiedTimeoutRef.current) {
        clearTimeout(shareCopiedTimeoutRef.current);
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
    const transcriptViewport = transcriptViewportRef.current;
    if (!transcriptViewport || !shouldFollowTranscriptRef.current) return;

    transcriptViewport.scrollTo({ top: transcriptViewport.scrollHeight, behavior: "smooth" });
  }, [transcript]);

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
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const interval = setInterval(() => {
      setCursorVisible(current => !current);
    }, 530);

    return () => clearInterval(interval);
  }, []);

  const connectSocket = (token: string, myAlias: string, onReady: () => void) => {
    setIsRealtimeReady(false);
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
      setSocketError("Chat is reconnecting. Your messages will catch up in a moment.");
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
        setComposerStatusMessage(`That poll didn't go through: ${message}`, "error");
      }

      if (message === "This room is already open in another tab. Pick up where you left off there.") {
        socket.disconnect();
        socketRef.current = null;
        setStage("error");
        setErrorMsg("This room is already open in another tab. Pick up where you left off there.");
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
    connectSocket(joinData.anonToken, joinData.alias, () => setIsRealtimeReady(true));
  };

  useEffect(() => {
    if (stage === "joined") {
      markRoomReady(roomId);
      return;
    }

    if (stage === "password") {
      markRoomReady(roomId);
      return;
    }

    if (stage === "expired" || stage === "error") {
      cancelRoomHandoff();
    }
  }, [cancelRoomHandoff, markRoomReady, roomId, stage]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const requestedScenario = new URLSearchParams(window.location.search).get("uiScenario");
      if (requestedScenario === "worst-case") {
        if (process.env.NODE_ENV === "production") {
          setStage("expired");
          return;
        }

        const scenario = createWorstCaseRoomScenario();
        setIsWorstCaseScenario(true);
        setTopic(scenario.topic);
        setAlias(scenario.alias);
        setRoomUsers(scenario.roomUsers);
        setOnlineCount(scenario.roomUsers.length);
        setSecondsLeft(scenario.secondsLeft);
        ttlTotalSecondsRef.current = scenario.totalSeconds;
        setMessages(scenario.messages);
        setPolls(scenario.polls);
        setTerminalEvents(scenario.events);
        setIsCreator(true);
        setHasPassword(false);
        setIsRealtimeReady(true);
        setStage("joined");
        return;
      }

      if (isExpiredRoomPreview({ nodeEnv: process.env.NODE_ENV, search: window.location.search })) {
        setStage("expired");
        return;
      }

      if (!isValidRoomId(roomId)) {
        setStage("expired");
        return;
      }

      setPasswordError("");
      setPasswordGateUnlocked(false);

      try {
        const roomRes = await fetch(`${API}/rooms/${roomId}`);
        if (cancelled) return;

        let roomData: {
          topic?: string;
          hasPassword?: boolean;
          secondsLeft?: number;
          totalSeconds?: number;
        } | null = null;

        if (roomRes.ok) {
          roomData = await roomRes.json();
          if (cancelled) return;
        }

        const lookup = resolveRoomLookupOutcome({
          ok: roomRes.ok,
          status: roomRes.status,
          secondsLeft: roomData?.secondsLeft,
        });

        if (lookup.stage === "expired") {
          setStage("expired");
          return;
        }

        if (lookup.stage === "error") {
          setErrorMsg(lookup.message || "We couldn't load this room. Try opening it again.");
          setStage("error");
          return;
        }

        if (!roomData || typeof roomData.topic !== "string" || typeof roomData.secondsLeft !== "number") {
          setErrorMsg("We couldn't load this room. Try opening it again.");
          setStage("error");
          return;
        }

        setTopic(roomData.topic);
        setHasPassword(Boolean(roomData.hasPassword));
        setSecondsLeft(roomData.secondsLeft);
        ttlTotalSecondsRef.current = Math.max(1, roomData.totalSeconds ?? roomData.secondsLeft);

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
        const failureStage = resolveRoomAccessFailureStage(e.status);
        if (failureStage === "expired") {
          setStage("expired");
          return;
        }
        setErrorMsg(e.message || "The room server is taking a breather. Try again in a moment.");
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
      setPasswordError("Enter the room password to keep going.");
      return;
    }

    try {
      const joinData = await doJoin(nextPassword);
      sound.play("success");
      await enterJoinedRoom(joinData, { fromPasswordGate: true });
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      if (resolveRoomAccessFailureStage(e.status) === "expired") setStage("expired");
      else {
        sound.play("error");
        setPasswordError(e.message || "We couldn't get you into the room. Try again.");
      }
    }
  };

  const emitPoll = (question: string, options: string[]) => {
    if (isWorstCaseScenario) {
      setPolls(current => [...current, {
        pollId: makeId(),
        question,
        options,
        votesByMember: [],
        createdAt: new Date().toISOString(),
        createdByAlias: alias,
      }]);
      sound.play("pollCreated");
      return true;
    }

    if (!socketRef.current) {
      appendEvent("error", "You're not connected to the room yet. Try again in a moment.");
      sound.play("error");
      return false;
    }

    pendingPollRequestRef.current = createPendingRoomPollRequest(question, options);
    socketRef.current.emit("create_poll", { question, options });
    sound.play("pollCreated");
    return true;
  };

  const sendChatMessage = (message: string) => {
    if (isWorstCaseScenario) {
      setMessages(current => [...current, {
        id: makeId(),
        alias,
        content: message,
        createdAt: new Date().toISOString(),
      }]);
      sound.play("messageSent");
      return;
    }

    if (!socketRef.current) {
      appendEvent("error", "You're not connected to the room yet. Try again in a moment.");
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
      await copyTextToClipboard(window.location.href);
      sound.play("success");
      setComposerStatusMessage("Room link copied", "accent");
    } catch {
      sound.play("error");
      setComposerStatusMessage("Couldn't copy the room link just now. Try again?", "error");
    }
  };

  const copyShareLinkFromButton = async () => {
    try {
      const sharePassword = isCreator ? getStoredRoomPassword(roomId) : null;
      const shareMessage = buildRoomShareMessage({
        topic,
        url: window.location.href,
        password: sharePassword,
        hasPassword,
      });
      await navigator.clipboard.writeText(shareMessage);
      sound.play("success");
      setShareCopied(true);
      if (shareCopiedTimeoutRef.current) {
        clearTimeout(shareCopiedTimeoutRef.current);
      }
      shareCopiedTimeoutRef.current = setTimeout(() => {
        setShareCopied(false);
        shareCopiedTimeoutRef.current = null;
      }, 1000);
      setComposerStatusMessage("share message copied", "accent");
    } catch {
      sound.play("error");
      setShareCopied(false);
      setComposerStatusMessage("Couldn't copy the share message just now. Try again?", "error");
    }
  };

  const copyRevealedPassword = async () => {
    if (!passwordReveal) return;

    try {
      await navigator.clipboard.writeText(passwordReveal.password);
      sound.play("success");
      setComposerStatusMessage("password copied", "accent");
    } catch {
      sound.play("error");
      setComposerStatusMessage("Couldn't copy the password just now. Try again?", "error");
    }
  };

  const printHelp = (commandType = "help") => {
    const base = "commands: /help /commands /style /sound /poll /share /leave /exit";
    const creator = isCreator ? " /password /close" : "";
    setComposerStatusMessage(
      commandType === "commands" ? `${base}${creator}` : `try ${base}${creator}`,
      "muted",
    );
  };

  const askProjectHelp = async (question: string) => {
    if (isWorstCaseScenario) {
      setComposerStatusMessage("Help replies are disabled in this local UI scenario.", "muted");
      return;
    }

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
      setComposerStatusMessage("The inkog help brain is taking a breather. Try again in a moment.", "error");
    }
  };

  const handleSoundCommand = (rawCommand: string) => {
    const parsed = parseSystemSoundCommand(rawCommand);

    if (parsed.type === "invalid") {
      sound.play("error");
      setComposerStatusMessage(parsed.message ?? "Try /sound on, /sound off, or /sound status.", "error");
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
      setComposerStatusMessage(result.message ?? "Pick a theme from 1 to 5, or type a theme name.", "error");
      return false;
    }

    const theme = result.theme;
    const transcriptMessage = result.transcriptMessage;
    if (!theme || !transcriptMessage) {
      sound.play("error");
      setComposerStatusMessage("Pick a theme from 1 to 5, or type a theme name.", "error");
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

  const handlePasswordCommand = () => {
    if (!hasPassword) {
      sound.play("error");
      setComposerStatusMessage("this room has no password", "muted");
      return;
    }

    const result = resolveRoomPasswordCommand({
      isCreator,
      password: getStoredRoomPassword(roomId),
    });

    if (!result.ok) {
      sound.play("error");
      setComposerStatusMessage(result.message ?? "Couldn't show the room password just now.", "error");
      return;
    }

    sound.play("notify");
    clearComposerStatus();
    setPasswordReveal({
      password: result.password ?? "",
      hint: result.hint ?? "type c to copy",
    });
  };

  const startHelpPrompt = () => {
    setPendingCommand(null);
    setComposerValue("/help ");
    setComposerStatusMessage("ask anything about inkog", "muted");
    sound.play("press");
    focusComposer();
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
      focusComposer();
      return;
    }

    if (command === "/share") {
      void copyShareLink();
      return;
    }

    if (command === "/password") {
      handlePasswordCommand();
      return;
    }

    if (command === "/help") {
      startHelpPrompt();
      return;
    }

    if (command === "/leave") {
      handleLeave();
      return;
    }

    if (command === "/close") {
      if (!isCreator) {
        sound.play("error");
      setComposerStatusMessage("Only the room creator can close the chat.", "error");
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
    if (!isRoomComposerInteractive(stage, isRealtimeReady)) return;

    const rawValue = composerValue;
    const value = rawValue.trim();
    setComposerValue("");

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
          setComposerStatusMessage(result.message ?? "That poll answer didn't quite fit. Try again.", "error");
          return;
        }

        if (result.status === "pending") {
          if (!("state" in result) || !result.state) {
            sound.play("error");
            setComposerStatusMessage("We lost that poll draft. Start a new one?", "error");
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
        setComposerStatusMessage(
          isWorstCaseScenario ? `poll added to local scenario: ${result.payload.question}` : `creating poll: ${result.payload.question}`,
          isWorstCaseScenario ? "accent" : "muted",
        );
        return;
      }
    }

    if (passwordReveal && value.toLowerCase() === "c") {
      void copyRevealedPassword();
      return;
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
        setComposerStatusMessage(
          isWorstCaseScenario ? `poll added to local scenario: ${command.question}` : `creating poll: ${command.question}`,
          isWorstCaseScenario ? "accent" : "muted",
        );
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
      case "password": {
        handlePasswordCommand();
        return;
      }
      case "leave":
        handleLeave();
        return;
      case "exit":
        handleLeave();
        return;
      case "close":
        if (!isCreator) {
          sound.play("error");
          setComposerStatusMessage("Only the room creator can close the room.", "error");
          return;
        }
        closeRoomWithConfirm();
        return;
      case "help":
        startHelpPrompt();
        return;
      case "help-question":
        void askProjectHelp(command.question);
        return;
      case "unknown":
        sound.play("error");
        setComposerStatusMessage(`That command's new to me: ${command.command}.`, "error");
        return;
    }
  };

  const votePoll = (pollId: string, optionIndex: number) => {
    sound.play("pollVoted");
    if (isWorstCaseScenario) {
      setPolls(current => current.map(poll => poll.pollId === pollId
        ? {
            ...poll,
            votesByMember: [
              ...poll.votesByMember.filter(vote => vote.alias !== alias),
              { alias, optionIndex },
            ],
          }
        : poll));
      return;
    }

    socketRef.current?.emit("vote_poll", { pollId, optionIndex });
  };

  const totalVotes = (poll: Poll) => poll.votesByMember.length;
  const votesFor = (poll: Poll, idx: number) => poll.votesByMember.filter(v => v.optionIndex === idx).length;
  const myVote = (poll: Poll) => poll.votesByMember.find(v => v.alias === alias)?.optionIndex ?? -1;
  const isRoomBooting = stage === "loading";
  const isPasswordGate = stage === "password";
  const roster = getRoomRoster(roomUsers);
  const pollInlinePrompt = !isRoomBooting && !isPasswordGate && pendingCommand?.type === "poll" ? getRoomPollInlinePrompt(pendingCommand) : null;
  const showIdleCursor = composerValue.length === 0 && !pollInlinePrompt;
  const composerChrome = getRoomComposerChrome({
    composerStatus: isRoomBooting || isPasswordGate ? null : composerStatus,
    pendingCommand: isRoomBooting || isPasswordGate ? null : pendingCommand,
  });
  const slashSuggestions = isRoomBooting || isPasswordGate ? [] : getRoomSlashCommandSuggestions({
    hasPassword,
    isCreator,
    query: composerValue,
  });
  const showSlashSuggestions = slashSuggestions.length > 0 && !pendingCommand;
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
        ? "var(--room-accent-text)"
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
        copy="This room has wrapped up, so its messages aren't available anymore."
        onAction={() => router.push("/")}
        showPixelBubble
        title="This room has wrapped up"
      />
    );
  }

  if (stage === "error") {
    return (
      <TerminalState
        action="back"
        copy={errorMsg}
        onAction={() => router.push("/")}
        title="A little room hiccup"
      />
    );
  }

  return (
    <main
      className="room-screen"
      data-route-handoff-phase={routeHandoffState.phase}
      style={styles.roomShell}
    >
      <header style={{ ...styles.roomHeader, ...getRoomPartStyle(roomId, "header") }}>
        <div style={styles.roomHeaderInner}>
          <div style={styles.headerIdentity}>
            <h1 style={styles.roomName} title={`inkog / ${topic}`}>
              <span style={styles.roomBrand}>inkog</span>
              <span style={styles.roomNameDivider}>/</span>
              <span style={styles.roomTopic}>{topic}</span>
            </h1>
          </div>
          <div style={styles.headerMeta}>
            <button
              aria-label="Copy room link"
              className="btn-ghost"
              onClick={() => void copyShareLinkFromButton()}
              onMouseEnter={() => sound.play("hover")}
              style={styles.headerShareButton}
              type="button"
            >
              {shareCopied ? "copied!" : "share"}
            </button>
            {shareCopied ? <span aria-live="polite" role="status" style={styles.srOnly}>Room link copied.</span> : null}
            <AvatarRoster roster={roster} roomUsers={roomUsers} viewerAlias={alias} />
            <RoomTtlMeter meter={ttlMeter} />
          </div>
        </div>
      </header>

      {socketError && <div role="alert" style={{ ...styles.errorToast, ...getRoomPartStyle(roomId, "transcript") }}>heads-up: {socketError}</div>}

      <section
        aria-label="Room terminal transcript"
        className={`room-chat-transcript${routeHandoffState.phase === "transitioning" ? " room-route-transcript-enter" : ""}`}
        onScroll={event => {
          const viewport = event.currentTarget;
          shouldFollowTranscriptRef.current = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <= 96;
        }}
        ref={transcriptViewportRef}
        style={{ ...styles.transcript, ...getRoomPartStyle(roomId, "transcript") }}
      >
        <div style={styles.transcriptInner}>
          {gateTranscriptLines.length > 0 ? (
            <RoomGateTranscript lines={gateTranscriptLines} passwordError={isPasswordGate ? passwordError : ""} />
          ) : null}
          {isRoomBooting || isPasswordGate ? null : transcript.length === 0 ? (
            <div style={styles.emptyTranscript}>
              <p style={styles.emptyLine}>system: joined as {alias}</p>
              <p style={styles.emptyLine}>system: type a message</p>
            </div>
          ) : (
            transcript.map((item, index) => {
              const previousItem = transcript[index - 1];
              const nextItem = transcript[index + 1];

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

              const sameSenderBefore = previousItem?.type === "message"
                && !previousItem.message.isSystem
                && !item.message.isSystem
                && previousItem.message.alias === item.message.alias;
              const sameSenderAfter = nextItem?.type === "message"
                && !nextItem.message.isSystem
                && !item.message.isSystem
                && nextItem.message.alias === item.message.alias;
              const showSenderLabel = item.message.isSystem || !sameSenderBefore;
              const messageMarginBottom = sameSenderAfter
                ? sameSenderBefore ? 4 : 0
                : sameSenderBefore ? 0 : 24;

              return (
                <TerminalMessage
                  alias={alias}
                  key={item.message.id}
                  message={item.message}
                  messageMarginBottom={messageMarginBottom}
                  peerColorMap={peerColorMap}
                  senderGroupEnd={sameSenderBefore && !sameSenderAfter}
                  showSenderLabel={showSenderLabel}
                />
              );
            })
          )}
        </div>
      </section>

      <form
        onSubmit={event => {
          event.preventDefault();
          runComposer();
        }}
        style={{ ...styles.composer, ...composerStyle, ...getRoomPartStyle(roomId, "composer") }}
      >
        <div
          data-route-composer="room"
          onClick={event => {
            if (event.target instanceof Element && event.target.closest('input, [role="option"]')) return;
            composerRef.current?.focus();
          }}
          style={{
            ...styles.composerFrame,
          }}
        >
          <div
            aria-hidden={!showSlashSuggestions}
            aria-label="Room command suggestions"
            id="room-slash-command-suggestions"
            role="listbox"
            style={{
              ...styles.slashCommandMenu,
              maxHeight: showSlashSuggestions ? "220px" : "0px",
              opacity: showSlashSuggestions ? 1 : 0,
              marginBottom: showSlashSuggestions ? "6px" : "0px",
              paddingBottom: showSlashSuggestions ? "8px" : "0px",
              pointerEvents: showSlashSuggestions ? "auto" : "none",
            }}
          >
            {showSlashSuggestions ? slashSuggestions.map((item, index) => {
              const selected = slashSuggestionIndex === index;

              return (
                <div
                  aria-selected={selected}
                  key={item.command}
                  id={`room-slash-option-${index}`}
                  onMouseDown={event => event.preventDefault()}
                  onClick={() => runSlashSuggestion(item.command)}
                  onMouseEnter={() => {
                    setSlashSuggestionIndex(index);
                    sound.play("hover");
                  }}
                  style={{
                    ...styles.slashCommandItem,
                    background: selected ? "color-mix(in srgb, var(--accent) 7%, transparent)" : "transparent",
                    color: selected ? "var(--room-accent-text)" : "var(--text)",
                  }}
                  role="option"
                >
                  <span aria-hidden="true" style={styles.slashCommandMarker}>{selected ? ">" : ""}</span>
                  <span style={styles.slashCommandName}>{item.command}</span>
                  <span style={styles.slashCommandDescription}>{item.label}</span>
                </div>
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
            <p id="room-composer-status" role="status" aria-live="polite" style={{ ...styles.composerStatus, color: composerStatusColor }}>
              {composerChrome.statusMode === "inline" ? (composerStatus?.message ?? "") : ""}
            </p>
          </div>
          {passwordReveal ? (
            <RoomPasswordReveal
              hint={passwordReveal.hint}
              password={passwordReveal.password}
            />
          ) : null}
          <div style={styles.composerRow}>
            <label htmlFor="room-terminal-input" style={styles.srOnly}>
              {isPasswordGate ? "Room password" : "Chat message or room command"}
            </label>
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
              aria-activedescendant={showSlashSuggestions ? `room-slash-option-${slashSuggestionIndex}` : undefined}
              aria-autocomplete={isPasswordGate ? undefined : "list"}
              aria-describedby="room-composer-status"
              aria-expanded={isPasswordGate ? undefined : showSlashSuggestions}
              aria-controls={isPasswordGate ? undefined : "room-slash-command-suggestions"}
              id="room-terminal-input"
              onChange={event => {
                setComposerValue(event.target.value);
                setSlashSuggestionIndex(0);
              }}
              onKeyDown={event => {
                if (event.key === "Escape" && passwordReveal) {
                  event.preventDefault();
                  sound.play("close");
                  setPasswordReveal(null);
                  setSlashSuggestionIndex(0);
                  return;
                }

                if (
                  passwordReveal
                  && event.key.toLowerCase() === "c"
                  && !event.altKey
                  && !event.ctrlKey
                  && !event.metaKey
                ) {
                  event.preventDefault();
                  void copyRevealedPassword();
                  return;
                }

                const slashCommandDeletionDirection = event.key === "Backspace"
                  ? "backward"
                  : event.key === "Delete"
                    ? "forward"
                    : null;

                if (
                  !isPasswordGate &&
                  !pendingCommand &&
                  !passwordReveal &&
                  slashCommandDeletionDirection &&
                  !event.altKey &&
                  !event.ctrlKey &&
                  !event.metaKey
                ) {
                  const input = event.currentTarget;
                  const deletionRange = getSlashCommandTokenDeletionRange(
                    input.value,
                    input.selectionStart,
                    input.selectionEnd,
                    slashCommandDeletionDirection,
                  );

                  if (deletionRange) {
                    event.preventDefault();
                    setComposerValue(input.value.slice(0, deletionRange.start) + input.value.slice(deletionRange.end));
                    requestAnimationFrame(() => composerRef.current?.setSelectionRange(deletionRange.start, deletionRange.start));
                    setSlashSuggestionIndex(0);
                    return;
                  }
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
              ref={composerRef}
              spellCheck={false}
              disabled={stage !== "joined" && stage !== "password"}
              placeholder={isRoomBooting ? "opening chat" : isPasswordGate ? "write password" : pollInlinePrompt?.placeholder}
              style={{
                ...styles.composerInput,
                caretColor: showIdleCursor ? "transparent" : "var(--text)",
                color: "var(--room-message-text)",
              }}
              role={isPasswordGate ? undefined : "combobox"}
              type={isPasswordGate ? "password" : "text"}
              value={composerValue}
            />
          </div>
        </div>
      </form>
    </main>
  );
}

function RoomPasswordReveal({
  hint,
  password,
}: {
  hint: string;
  password: string;
}) {
  const [displayedPassword, setDisplayedPassword] = useState(() => getPasswordCipherText(password, 0));
  const [isPasswordRevealed, setIsPasswordRevealed] = useState(false);

  useEffect(() => {
    setIsPasswordRevealed(false);
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) {
      setDisplayedPassword(password);
      setIsPasswordRevealed(true);
      return;
    }

    const characters = Array.from(password);
    const duration = 420;
    const startedAt = performance.now();
    let animationFrame = 0;

    const reveal = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const revealedCharacters = Math.floor(progress * (characters.length + 1));
      setDisplayedPassword(getPasswordCipherText(password, revealedCharacters));

      if (progress < 1) animationFrame = requestAnimationFrame(reveal);
      else setIsPasswordRevealed(true);
    };

    animationFrame = requestAnimationFrame(reveal);
    return () => cancelAnimationFrame(animationFrame);
  }, [password]);

  return (
    <div style={styles.passwordRevealLine}>
      <span aria-atomic="true" aria-live="polite" style={styles.srOnly}>
        {isPasswordRevealed ? `Room password: ${password}` : ""}
      </span>
      <style>{`
        @keyframes room-password-shimmer {
          from { background-position: 140% 0; }
          to { background-position: -40% 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .room-password-shimmer { animation: none !important; }
        }
      `}</style>
      <span style={styles.passwordRevealLabel}>password:</span>
      <span aria-hidden="true" className="room-password-shimmer" style={styles.passwordRevealValue}>
        {displayedPassword}
      </span>
      <span style={styles.passwordRevealHint}>{hint}</span>
    </div>
  );
}

const PASSWORD_CIPHER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*";

function getPasswordCipherText(password: string, revealedCharacters: number) {
  return Array.from(password, (character, index) => {
    if (character === " " || index < revealedCharacters) return character;
    return PASSWORD_CIPHER[(index * 13 + revealedCharacters * 7) % PASSWORD_CIPHER.length];
  }).join("");
}

function RoomGateTranscript({ lines, passwordError }: { lines: string[]; passwordError?: string }) {
  return (
    <div aria-label="Room access instructions" aria-live="polite" role="status" style={styles.gateTranscript}>
      {lines.map(line => (
        <p
          key={line}
          style={{
            ...styles.transcriptLine,
            color: line === "--------" ? "var(--text-dim)" : line.includes("password accepted") ? "var(--room-accent-text)" : "var(--text-muted)",
          }}
        >
          {line}
        </p>
      ))}
      {passwordError ? (
        <p role="alert" style={{ ...styles.transcriptLine, color: "var(--red)" }}>heads-up: {passwordError}</p>
      ) : null}
    </div>
  );
}

function TerminalState({
  action,
  copy,
  onAction,
  showPixelBubble = false,
  title,
}: {
  action?: string;
  copy: string;
  onAction?: () => void;
  showPixelBubble?: boolean;
  title: string;
}) {
  const sound = useSystemSound();

  return (
    <main className="room-state-screen" style={styles.stateShell}>
      <section style={styles.statePanel}>
        {showPixelBubble ? <ExpiredRoomPixelBubble /> : null}
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
  const prefix = event.kind === "input" ? "$" : event.kind === "error" ? "heads-up:" : ">";
  const color =
    event.kind === "input"
      ? "var(--room-accent-text)"
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
  messageMarginBottom,
  peerColorMap,
  senderGroupEnd,
  showSenderLabel,
}: {
  alias: string;
  message: Message;
  messageMarginBottom: number;
  peerColorMap: Record<string, string>;
  senderGroupEnd: boolean;
  showSenderLabel: boolean;
}) {
  const presentation = classifyRoomMessage(message, alias);
  const senderColor = message.alias === alias
    ? "var(--room-accent-text)"
    : peerColorMap[message.alias] ?? "var(--text-muted)";

  if (presentation.kind === "system") {
    return (
      <p style={styles.systemMessageLine}>
        <span aria-hidden="true" style={styles.systemMessageRule} />
        <span style={styles.systemMessageText}>
          {message.content}
        </span>
        <span aria-hidden="true" style={styles.systemMessageRule} />
      </p>
    );
  }

  return (
    <p
      style={{
        ...styles.transcriptLine,
        color: "var(--text)",
        margin: `0 0 ${messageMarginBottom}px`,
      }}
    >
      {showSenderLabel ? (
        <span className="room-chat-sender" style={{ color: senderColor }}>
          {presentation.kind === "outgoing" ? "you" : message.alias}
        </span>
      ) : null}
      <span
        className="room-chat-message-content"
        style={{
          marginTop: 0,
          marginRight: 0,
          marginBottom: senderGroupEnd ? 24 : 0,
          marginLeft: 0,
        }}
      >
        {message.content}
      </span>
    </p>
  );
}

function AvatarRoster({
  roster,
  roomUsers,
  viewerAlias,
}: {
  roster: RoomRoster;
  roomUsers: string[];
  viewerAlias: string;
}) {
  const [activeAlias, setActiveAlias] = useState<string | null>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState<{ left: number; top: number } | null>(null);
  const rosterRef = useRef<HTMLDivElement | null>(null);
  const positionPopover = useCallback(() => {
    const bounds = rosterRef.current?.getBoundingClientRect();
    if (!bounds) return;

    const width = Math.min(360, Math.max(0, window.innerWidth - 32));
    const maxLeft = Math.max(16, window.innerWidth - width - 16);
    setPopoverPosition({
      left: Math.max(16, Math.min(bounds.right - width, maxLeft)),
      top: bounds.bottom + 10,
    });
  }, []);

  useEffect(() => {
    if (!isPopoverOpen) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!rosterRef.current?.contains(event.target as Node)) setIsPopoverOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsPopoverOpen(false);
        setActiveAlias(null);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", positionPopover);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", positionPopover);
    };
  }, [isPopoverOpen, positionPopover]);

  const togglePopover = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    positionPopover();
    setActiveAlias(null);
    setIsPopoverOpen(open => !open);
  };

  return (
    <div
      aria-label={`${roomUsers.length} participants`}
      onClick={event => event.stopPropagation()}
      ref={rosterRef}
      role="group"
      style={styles.roster}
    >
      {roster.visible.map((member, index) => {
        const active = activeAlias === member.alias;
        const label = member.alias === viewerAlias ? `${member.alias} (you)` : member.alias;

        return (
          <button
            aria-expanded={isPopoverOpen}
            aria-label={`Show all room participants. ${label}`}
            className="room-roster-trigger"
            key={member.alias}
            onBlur={() => setActiveAlias(null)}
            onClick={togglePopover}
            onFocus={() => setActiveAlias(member.alias)}
            onKeyDown={event => {
              if (event.key === "Escape") {
                setIsPopoverOpen(false);
                setActiveAlias(null);
              }
            }}
            onMouseEnter={() => setActiveAlias(member.alias)}
            onMouseLeave={() => setActiveAlias(null)}
            style={{
              ...styles.rosterMember,
              marginLeft: index === 0 ? 0 : "-8px",
              zIndex: active ? roster.visible.length + 1 : roster.visible.length - index,
            }}
            type="button"
            aria-controls="room-participants-popover"
          >
            <span style={styles.rosterAvatar}>
              <span style={styles.rosterInitials}>{member.initials}</span>
            </span>
            {active && !isPopoverOpen ? <span role="tooltip" style={styles.rosterTooltip}>{label}</span> : null}
          </button>
        );
      })}
      {roster.overflow > 0 && (
        <button
          aria-expanded={isPopoverOpen}
          aria-label={`Show all ${roomUsers.length} room participants`}
          className="room-roster-trigger"
          onClick={togglePopover}
          onFocus={() => setActiveAlias("__overflow__")}
          onKeyDown={event => {
            if (event.key === "Escape") {
              setIsPopoverOpen(false);
              setActiveAlias(null);
            }
          }}
          onMouseEnter={() => setActiveAlias("__overflow__")}
          onMouseLeave={() => setActiveAlias(null)}
          style={{
            ...styles.rosterMember,
            ...styles.rosterOverflowMember,
            marginLeft: roster.visible.length > 0 ? "-8px" : 0,
            zIndex: activeAlias === "__overflow__" ? roster.visible.length + 1 : 0,
          }}
          type="button"
          aria-controls="room-participants-popover"
        >
          <span style={{ ...styles.rosterAvatar, ...styles.rosterOverflow }}>+{roster.overflow}</span>
          {activeAlias === "__overflow__" && !isPopoverOpen ? (
            <span role="tooltip" style={styles.rosterTooltip}>{`${roster.overflow} more participants`}</span>
          ) : null}
        </button>
      )}
      {isPopoverOpen ? (
        <div
          aria-label="Room participants"
          aria-live="polite"
          id="room-participants-popover"
          role="region"
          style={{
            ...styles.rosterPopover,
            left: popoverPosition?.left ?? 16,
            top: popoverPosition?.top ?? 0,
          }}
        >
          {roomUsers.length ? roomUsers.join(", ") : "No users online"}
        </div>
      ) : null}
    </div>
  );
}

function RoomTtlMeter({
  meter,
}: {
  meter: ReturnType<typeof getRoomTtlMeter>;
}) {
  const meterColor = meter.warning ? "var(--red)" : "var(--accent)";
  const timeColor = meter.warning ? "var(--red)" : "var(--room-accent-text)";
  const [showTimeBar, setShowTimeBar] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
  }, []);

  const toggleTimeBar = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;

    if (showTimeBar) {
      setShowTimeBar(false);
      return;
    }

    setShowTimeBar(true);
    timeoutRef.current = window.setTimeout(() => {
      setShowTimeBar(false);
      timeoutRef.current = null;
    }, 3000);
  };

  return (
    <button
      aria-label={`Room expires in ${meter.time}. Tap to toggle the remaining time bar, which hides after three seconds.`}
      aria-pressed={showTimeBar}
      className="room-ttl-trigger"
      onClick={toggleTimeBar}
      style={{
        ...styles.ttlMeter,
        color: timeColor,
      }}
      type="button"
    >
      <svg
        aria-hidden="true"
        className="room-ttl-hourglass"
        fill="currentColor"
        focusable="false"
        height="18"
        shapeRendering="crispEdges"
        viewBox="0 0 29 33"
        width="16"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g className="room-ttl-hourglass-frame">
          {[
            ...Array.from({ length: 7 }, (_, column) => [column, 0]),
            [1, 1], [5, 1], [2, 2], [4, 2], [3, 3], [3, 4],
            [2, 5], [4, 5], [1, 6], [5, 6],
            ...Array.from({ length: 7 }, (_, column) => [column, 7]),
          ].map(([column, row]) => (
            <rect height="3" key={`${column}-${row}`} width="3" x={1 + column * 4} y={1 + row * 4} />
          ))}
        </g>
        {[[3, 2], [2, 1], [4, 1], [3, 1]].map(([column, row], index) => (
          <rect
            className={`room-ttl-hourglass-sand room-ttl-hourglass-sand-${index + 1}`}
            height="3"
            key={`top-${column}-${row}`}
            width="3"
            x={1 + column * 4}
            y={1 + row * 4}
          />
        ))}
        {[[3, 6], [2, 6], [4, 6], [3, 5]].map(([column, row], index) => (
          <rect
            className={`room-ttl-hourglass-sand room-ttl-hourglass-sand-${index + 1} room-ttl-hourglass-sand-bottom`}
            height="3"
            key={`bottom-${column}-${row}`}
            width="3"
            x={1 + column * 4}
            y={1 + row * 4}
          />
        ))}
      </svg>
      {showTimeBar ? (
        <span
          aria-label="Room time remaining"
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={meter.percent}
          aria-valuetext={`${meter.percent}% remaining, ${meter.time} left`}
          role="meter"
          style={styles.ttlBarTrack}
        >
          <span style={{ ...styles.ttlBarFill, background: meterColor, width: `${meter.percent}%` }} />
        </span>
      ) : (
        <span style={{ ...styles.ttlTime, color: timeColor }}>{meter.time}</span>
      )}
      {meter.marker ? <span aria-hidden="true" style={styles.ttlMarker}>{meter.marker}</span> : null}
    </button>
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
  const creator = poll.createdByAlias?.trim();
  const questionId = `room-poll-question-${poll.pollId}`;

  return (
    <div aria-labelledby={questionId} role="group" style={styles.pollBlock}>
      <span style={styles.pollTitle}>poll --active{creator ? ` by ${creator}` : ""}</span>
      <p id={questionId} style={styles.pollQuestion}>{poll.question}</p>
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
              aria-label={`${option}, ${count} vote${count === 1 ? "" : "s"}`}
              aria-pressed={selected}
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
                border: selected
                  ? "1px solid color-mix(in srgb, var(--accent) 55%, var(--text) 45%)"
                  : "1px solid transparent",
                backgroundColor: selected
                  ? "color-mix(in srgb, var(--accent) 12%, transparent)"
                  : hovered
                    ? "color-mix(in srgb, var(--text) 6%, transparent)"
                    : "color-mix(in srgb, var(--text) 3%, transparent)",
                color: "var(--text)",
              }}
              type="button"
            >
              <span aria-hidden="true" style={styles.pollOptionMarker}>{selected || hovered ? ">" : ""}</span>
              <span
                aria-hidden="true"
                style={{
                  ...styles.pollOptionIndex,
                  color: selected ? "var(--room-accent-text)" : hovered ? "var(--text-muted)" : "var(--text-dim)",
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
                  color: hovered ? "var(--text)" : "var(--text-muted)",
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
  );
}

const styles: Record<string, CSSProperties> = {
  roomShell: {
    backgroundColor: "transparent",
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
    borderBottom: "1px solid color-mix(in srgb, var(--text-dim) 28%, transparent)",
    flexShrink: 0,
    padding: "var(--room-header-padding, 12px clamp(32px, calc(3vw + 16px), 48px))",
    position: "relative",
    zIndex: 10,
  },
  roomHeaderInner: {
    alignItems: "center",
    display: "flex",
    gap: "var(--room-header-gap, 16px)",
    justifyContent: "space-between",
    margin: "0 auto",
    maxWidth: "1200px",
    minHeight: "40px",
    width: "100%",
  },
  headerIdentity: {
    alignItems: "center",
    display: "flex",
    gap: "10px",
    minWidth: 0,
  },
  roomName: {
    fontSize: "var(--room-meta-size, 13px)",
    fontFamily: ROOM_FONT_FAMILY,
    fontWeight: 400,
    alignItems: "center",
    display: "flex",
    gap: "8px",
    margin: 0,
    minWidth: 0,
    overflow: "hidden",
    whiteSpace: "nowrap",
  },
  roomBrand: {
    color: "var(--text)",
    flexShrink: 0,
    fontSize: "var(--room-brand-size, 15px)",
    fontWeight: 700,
  },
  roomNameDivider: {
    color: "var(--text-dim)",
    flexShrink: 0,
  },
  roomTopic: {
    color: "var(--text-muted)",
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
  headerShareButton: {
    background: "color-mix(in srgb, var(--accent) 20%, var(--bg-2))",
    borderRadius: 0,
    color: "var(--text)",
    fontSize: "12px",
    lineHeight: "22px",
    minHeight: "32px",
    padding: "4px 8px",
  },
  metaItem: {
    alignItems: "center",
    color: "var(--text-muted)",
    display: "inline-flex",
    fontSize: "var(--room-meta-size, 13px)",
    gap: "6px",
    whiteSpace: "nowrap",
  },
  ttlMeter: {
    appearance: "none",
    alignItems: "center",
    background: "transparent",
    border: 0,
    color: "inherit",
    cursor: "pointer",
    display: "inline-flex",
    font: "inherit",
    gap: "6px",
    height: "32px",
    justifyContent: "center",
    minWidth: "56px",
    padding: 0,
    position: "relative",
    whiteSpace: "nowrap",
  },
  ttlTime: {
    fontSize: "var(--room-meta-size, 13px)",
    minWidth: "56px",
    textAlign: "right",
  },
  ttlBarTrack: {
    background: "var(--bg-3)",
    border: "1px solid var(--text-dim)",
    boxSizing: "border-box",
    display: "block",
    height: "8px",
    overflow: "hidden",
    width: "56px",
  },
  ttlBarFill: {
    display: "block",
    height: "100%",
    transition: "width 180ms ease",
  },
  ttlMarker: {
    color: "var(--red)",
    fontSize: "var(--room-meta-size, 13px)",
  },
  roster: {
    alignItems: "center",
    display: "inline-flex",
    marginRight: "6px",
    minHeight: "32px",
    position: "relative",
  },
  rosterMember: {
    alignItems: "center",
    appearance: "none",
    background: "transparent",
    border: 0,
    color: "inherit",
    cursor: "pointer",
    display: "inline-flex",
    font: "inherit",
    padding: 0,
    position: "relative",
  },
  rosterAvatar: {
    alignItems: "center",
    background: "var(--bg-3)",
    border: "1px solid var(--text-muted)",
    borderRadius: "999px",
    boxSizing: "border-box",
    color: "var(--text-muted)",
    display: "inline-flex",
    fontSize: "12px",
    height: "32px",
    justifyContent: "center",
    lineHeight: 1,
    minWidth: "32px",
    padding: "0 9px",
    transition: "border-color 140ms ease, background-color 140ms ease",
  },
  rosterInitials: {
    flexShrink: 0,
    minWidth: "14px",
    textAlign: "center",
  },
  rosterTooltip: {
    background: "var(--bg-2)",
    border: "1px solid var(--text-dim)",
    boxSizing: "border-box",
    boxShadow: "0 8px 20px rgba(0, 0, 0, 0.28)",
    color: "var(--text-muted)",
    left: "auto",
    lineHeight: 1.5,
    maxWidth: "min(240px, calc(100vw - 32px))",
    padding: "5px 8px",
    pointerEvents: "none",
    position: "absolute",
    top: "calc(100% + 8px)",
    right: 0,
    transform: "none",
    fontSize: "12px",
    overflowWrap: "anywhere",
    whiteSpace: "normal",
    width: "max-content",
    zIndex: 21,
  },
  rosterPopover: {
    background: "var(--bg)",
    border: "1px solid var(--text-dim)",
    boxShadow: "0 12px 28px rgba(0, 0, 0, 0.34)",
    boxSizing: "border-box",
    color: "var(--text)",
    fontFamily: ROOM_FONT_FAMILY,
    fontSize: "12px",
    lineHeight: 1.65,
    maxHeight: "min(60vh, 420px)",
    overflowY: "auto",
    overflowWrap: "anywhere",
    padding: "12px 14px",
    position: "fixed",
    width: "min(360px, calc(100vw - 32px))",
    zIndex: 20,
  },
  rosterOverflowMember: {
    flexShrink: 0,
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
    padding: "24px 0 12px",
    position: "relative",
    zIndex: 1,
  },
  transcriptInner: {
    backgroundColor: "transparent",
    backdropFilter: "none",
    margin: "0 auto",
    maxWidth: "1200px",
    width: "min(calc(100% - var(--room-chat-gutters, 5rem)), 1200px)",
  },
  emptyTranscript: {
    color: "var(--text-muted)",
    fontSize: "12px",
    lineHeight: "var(--room-body-line-height, 24px)",
    paddingTop: "8vh",
  },
  emptyLine: {
    margin: "0 0 8px",
  },
  gateTranscript: {
    color: "var(--text-muted)",
    fontSize: "var(--room-body-size, 14px)",
    lineHeight: "var(--room-body-line-height, 24px)",
    paddingTop: "8vh",
  },
  transcriptLine: {
    color: "var(--text)",
    fontSize: "var(--room-chat-font-size, 15px)",
    lineHeight: "var(--room-chat-line-height, 26px)",
    margin: 0,
    overflowWrap: "anywhere",
    whiteSpace: "pre-wrap" as const,
  },
  passwordRevealLine: {
    alignItems: "baseline",
    display: "flex",
    gap: "8px",
    minHeight: "20px",
    paddingBottom: "4px",
    width: "100%",
    flexWrap: "wrap",
  },
  passwordRevealLabel: {
    color: "var(--text-dim)",
    flexShrink: 0,
    fontSize: "13px",
    lineHeight: "20px",
  },
  passwordRevealValue: {
    animation: "room-password-shimmer 760ms linear 360ms 1 both",
    backgroundImage: "linear-gradient(100deg, var(--room-accent-text) 0%, var(--room-accent-text) 43%, var(--text) 50%, var(--room-accent-text) 57%, var(--room-accent-text) 100%)",
    backgroundPosition: "140% 0",
    backgroundSize: "220% 100%",
    color: "transparent",
    fontSize: "13px",
    lineHeight: "20px",
    overflowWrap: "anywhere",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  passwordRevealHint: {
    color: "var(--text-dim)",
    fontSize: "12px",
    lineHeight: "20px",
  },
  systemMessageLine: {
    alignItems: "center",
    backgroundColor: "transparent",
    backdropFilter: "none",
    color: "color-mix(in srgb, var(--text-muted) 88%, var(--text-dim) 12%)",
    display: "flex",
    fontSize: "var(--room-system-font-size, 14px)",
    gap: "10px",
    lineHeight: "var(--room-system-line-height, 20px)",
    margin: "var(--room-system-margin, 16px) 0",
    whiteSpace: "nowrap",
  },
  systemMessageRule: {
    backgroundImage: "repeating-linear-gradient(90deg, color-mix(in srgb, var(--text-dim) 68%, transparent) 0 2px, transparent 2px 8px)",
    flex: "1 1 72px",
    height: "2px",
    minWidth: "24px",
  },
  systemMessageText: {
    flex: "0 1 auto",
    minWidth: 0,
    overflow: "visible",
    overflowWrap: "anywhere",
    textOverflow: "clip",
    whiteSpace: "normal",
  },
  pollBlock: {
    backgroundColor: "transparent",
    backgroundImage: [
      "repeating-linear-gradient(90deg, color-mix(in srgb, var(--text-dim) 68%, transparent) 0 2px, transparent 2px 8px)",
      "repeating-linear-gradient(90deg, color-mix(in srgb, var(--text-dim) 68%, transparent) 0 2px, transparent 2px 8px)",
      "repeating-linear-gradient(0deg, color-mix(in srgb, var(--text-dim) 68%, transparent) 0 2px, transparent 2px 8px)",
      "repeating-linear-gradient(0deg, color-mix(in srgb, var(--text-dim) 68%, transparent) 0 2px, transparent 2px 8px)",
    ].join(", "),
    backgroundPosition: "left top, left bottom, left top, right top",
    backgroundRepeat: "repeat-x, repeat-x, repeat-y, repeat-y",
    backgroundSize: "100% 2px, 100% 2px, 2px 100%, 2px 100%",
    backgroundOrigin: "border-box",
    border: "2px solid transparent",
    borderRadius: 0,
    boxSizing: "border-box",
    boxShadow: "none",
    margin: "var(--room-poll-margin, 36px 0 32px)",
    maxWidth: "760px",
    padding: "var(--room-poll-padding, 10px clamp(18px, 3vw, 28px) 16px)",
    position: "relative",
    width: "100%",
  },
  pollTitle: {
    background: "transparent",
    color: "var(--text-muted)",
    fontSize: "var(--room-body-size, 14px)",
    lineHeight: "20px",
    margin: "0 0 8px",
    overflowWrap: "anywhere",
  },
  pollQuestion: {
    color: "var(--text)",
    fontSize: "var(--room-body-size, 14px)",
    lineHeight: "var(--room-body-line-height, 24px)",
    margin: "0 0 var(--room-poll-question-gap, 18px)",
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
    boxSizing: "border-box",
    cursor: "pointer",
    display: "grid",
    gridTemplateColumns: "18px 38px minmax(0, 1fr) clamp(88px, 18vw, 132px) 30px",
    fontFamily: ROOM_FONT_FAMILY,
    fontSize: "var(--room-body-size, 14px)",
    gap: "8px",
    lineHeight: "var(--room-body-line-height, 24px)",
    minHeight: "34px",
    padding: "0 12px",
    textAlign: "left",
    transition: "color 0.15s ease, opacity 0.15s ease, background-color 0.15s ease",
    width: "100%",
  },
  pollOptionLabel: {
    boxSizing: "border-box",
    minWidth: 0,
    overflowWrap: "anywhere",
    paddingLeft: "8px",
    whiteSpace: "normal",
  },
  pollOptionMarker: {
    color: "var(--accent)",
    flexShrink: 0,
    textAlign: "center",
    width: "18px",
  },
  pollOptionIndex: {
    color: "var(--text-dim)",
    flexShrink: 0,
    textAlign: "right",
  },
  pollOptionMeter: {
    fontSize: "12px",
    letterSpacing: "-0.02em",
    overflow: "hidden",
    textAlign: "right",
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
    fontSize: "var(--room-small-size, 12px)",
    lineHeight: "20px",
    margin: "18px 0 0",
  },
  composer: {
    alignItems: "center",
    display: "flex",
    flexDirection: "column",
    flexShrink: 0,
    padding: 0,
    position: "relative",
    zIndex: 1,
  },
  composerFrame: {
    background: "color-mix(in srgb, var(--color-panel) 92%, transparent)",
    backdropFilter: "blur(8px)",
    border: "1px solid var(--color-composer-border)",
    borderRadius: 0,
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: 0,
    justifyContent: "center",
    minHeight: "58px",
    overflow: "hidden",
    padding: "16px 12px",
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
    overflow: "hidden",
    pointerEvents: "auto",
    paddingBottom: "8px",
    transition: "max-height 200ms ease-out, opacity 200ms ease-out",
    width: "100%",
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
    gap: "6px",
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
    minHeight: "24px",
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
    fontSize: "var(--room-meta-size, 13px)",
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
    padding: "0 0 0 4px",
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
    padding: "var(--room-state-padding, 24px)",
    position: "relative",
  },
  statePanel: {
    maxWidth: "520px",
    position: "relative",
    textAlign: "center",
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
    fontSize: "var(--room-state-title-size, 20px)",
    lineHeight: "var(--room-state-title-line-height, 28px)",
    margin: "0 0 var(--room-state-title-gap, 14px)",
  },
  mutedLine: {
    color: "var(--text-muted)",
    fontSize: "var(--room-state-body-size, 14px)",
    lineHeight: "var(--room-state-body-line-height, 24px)",
    margin: "0 0 var(--room-state-body-gap, 16px)",
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
    borderBottom: "1px solid var(--color-composer-border)",
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
