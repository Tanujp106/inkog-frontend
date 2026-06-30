"use client";

import { CSSProperties, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  commands,
  completeDirectionTwoCommand,
  directionTwoThemes,
  resolveDirectionTwoThemeChoice,
} from "@/lib/direction-two-shell.mjs";
import {
  buildDirectionTwoMarkPattern,
  directionTwoAmbientConfig,
  createDirectionTwoAmbientPixels,
  directionTwoMarkIcons,
  directionTwoMarkWords,
  getDirectionTwoScrambleFrame,
} from "@/lib/direction-two-intro.mjs";
import {
  getDirectionTwoAutoScrollTop,
  getDirectionTwoScrollReserveHeight,
} from "@/lib/direction-two-scroll.mjs";
import {
  formatSystemSoundStatus,
  parseSystemSoundCommand,
} from "@/lib/system-sound.mjs";
import { useSystemSound } from "@/lib/system-sound-provider";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:3001/api";
const roomIdPattern = /([a-z0-9]{6})$/i;
const themeStorageKey = "inkog-theme";
type DirectionTwoTheme = (typeof directionTwoThemes)[number];

type TerminalLine = {
  id: string;
  kind: "input" | "output" | "error" | "system";
  text: string;
};

type CreateDraft = {
  topic: string;
  expiry: number;
  roomLimit: number;
  password: string;
};

type SessionFlow =
  | { type: "create"; step: "topic"; draft: CreateDraft }
  | { type: "create"; step: "expiry"; draft: CreateDraft }
  | { type: "create"; step: "limit"; draft: CreateDraft }
  | { type: "create"; step: "password-choice"; draft: CreateDraft }
  | { type: "create"; step: "password"; draft: CreateDraft }
  | { type: "create"; step: "confirm"; draft: CreateDraft }
  | { type: "style"; step: "choice" }
  | { type: "join"; step: "room" };

const initialDraft: CreateDraft = {
  topic: "",
  expiry: 60,
  roomLimit: 10,
  password: "",
};

const initialLines: TerminalLine[] = [];
const introHeadline = "Create a temporary room where friends can speak honestly, vote quickly, and disappear without leaving identity trails behind.";
const introScrambleDelayMs = 140;
const introScrambleDurationMs = 1080;
const terminalRevealDelayMs = 1640;
const markFlipDelayMs = 2800;
const markSwapDurationMs = 560;
type DirectionTwoMarkIcon = (typeof directionTwoMarkIcons)[number];

const directionTwoAmbientAtmosphere = {
  glowStrength: 12,
  glowOpacity: 0.08,
  blendMode: "screen",
} as const;

const introHighlights = [
  {
    icon: [
      "0011100",
      "0100010",
      "0100010",
      "1111111",
      "1101011",
      "1100011",
      "1111111",
    ],
    text: "private rooms for people who already know each other",
  },
  {
    icon: [
      "1111111",
      "0100010",
      "0010100",
      "0001000",
      "0010100",
      "0100010",
      "1111111",
    ],
    text: "temporary spaces that expire on their own",
  },
  {
    icon: [
      "1111110",
      "1000010",
      "1010010",
      "1001010",
      "1000110",
      "1000010",
      "1111110",
    ],
    text: "quick prompts for polls and lightweight decisions",
  },
];

const themePreviewColorById: Record<DirectionTwoTheme["id"], string> = {
  orange: "#ffb15c",
  blue: "#7cc7ff",
  green: "#c8ff57",
  purple: "#c792ff",
};

function setStoredToken(roomId: string, token: string) {
  if (typeof window === "undefined" || typeof window.localStorage?.setItem !== "function") return;
  window.localStorage.setItem(`token_${roomId}`, token);
}

function applyTheme(themeId: DirectionTwoTheme["id"]) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-inkog-theme", themeId);
  if (typeof window !== "undefined" && typeof window.localStorage?.setItem === "function") {
    window.localStorage.setItem(themeStorageKey, themeId);
  }
}

function line(kind: TerminalLine["kind"], text: string): TerminalLine {
  return {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    kind,
    text,
  };
}

function cleanRoomId(rawValue: string) {
  const trimmed = rawValue.trim();
  const match = trimmed.match(roomIdPattern);
  return match ? match[1] : trimmed;
}

function isYes(value: string) {
  return ["y", "yes"].includes(value.trim().toLowerCase());
}

function isNo(value: string) {
  return ["n", "no"].includes(value.trim().toLowerCase());
}

function promptFor(flow: SessionFlow | null) {
  if (!flow) return "$";
  if (flow.type === "join") return "room id";
  if (flow.type === "style") return "style";

  switch (flow.step) {
    case "topic":
      return "topic";
    case "expiry":
      return "expires";
    case "limit":
      return "limit";
    case "password-choice":
      return "password?";
    case "password":
      return "password";
    case "confirm":
      return "confirm";
  }
}

function placeholderFor(flow: SessionFlow | null) {
  if (!flow) return "create a room";
  if (flow.type === "join") return "abc123 or room link";
  if (flow.type === "style") return "1, 2, 3, 4, or 5";

  switch (flow.step) {
    case "topic":
      return "Should we go to Goa this December?";
    case "expiry":
      return "60";
    case "limit":
      return "10";
    case "password-choice":
      return "n";
    case "password":
      return "optional room password";
    case "confirm":
      return "y";
  }
}

function commandCompletionFor(value: string, flow: SessionFlow | null) {
  if (flow) return null;
  return completeDirectionTwoCommand(value);
}

export function DirectionTwoShell() {
  const router = useRouter();
  const sound = useSystemSound();
  const mainRef = useRef<HTMLElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const promptRowRef = useRef<HTMLDivElement | null>(null);
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [lines, setLines] = useState<TerminalLine[]>(initialLines);
  const [flow, setFlow] = useState<SessionFlow | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [keyboardStatus, setKeyboardStatus] = useState("Private terminal ready.");
  const [scrollReserveHeight, setScrollReserveHeight] = useState(0);
  const [activeThemeId, setActiveThemeId] = useState<DirectionTwoTheme["id"]>("green");
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [supportsCustomCursor, setSupportsCustomCursor] = useState(false);
  const [isCursorVisible, setIsCursorVisible] = useState(false);
  const [isCursorPressed, setIsCursorPressed] = useState(false);
  const [isTerminalVisible, setIsTerminalVisible] = useState(false);
  const [markIconState, setMarkIconState] = useState({
    current: directionTwoMarkIcons[0],
    previous: null as DirectionTwoMarkIcon | null,
    swapId: 0,
  });
  const ambientPixels = useMemo(() => {
    return createDirectionTwoAmbientPixels(Math.random, directionTwoAmbientConfig);
  }, []);
  const ambientAtmosphereStyle = {
    background: [
      `radial-gradient(ellipse at 52% 0%, rgba(200, 255, 87, ${directionTwoAmbientAtmosphere.glowOpacity}) 0%, rgba(200, 255, 87, ${directionTwoAmbientAtmosphere.glowOpacity * 0.42}) 30%, rgba(0, 0, 0, 0) 62%)`,
      "linear-gradient(180deg, rgba(200, 255, 87, 0.045) 0%, rgba(0, 0, 0, 0) 42%)",
      "radial-gradient(circle at 18% 6%, var(--color-signal-glow) 0%, rgba(0, 0, 0, 0) 38%)",
    ].join(", "),
    mixBlendMode: directionTwoAmbientAtmosphere.blendMode,
  } as CSSProperties;
  const headlineText = useDirectionTwoScrambleText(introHeadline, {
    durationMs: introScrambleDurationMs,
    startDelayMs: introScrambleDelayMs,
    disabled: prefersReducedMotion,
  });

  const appendLines = (...nextLines: TerminalLine[]) => {
    setLines(current => [...current, ...nextLines]);
  };

  const focusInput = () => {
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const cancelFlow = () => {
    sound.play("close");
    if (flow) appendLines(line("system", "cancelled current prompt"));
    setFlow(null);
    setInputValue("");
    setKeyboardStatus("Prompt cancelled.");
    focusInput();
  };

  const clearTerminal = () => {
    sound.play("press");
    setFlow(null);
    setInputValue("");
    setLines(initialLines);
    setKeyboardStatus("Terminal cleared.");
    focusInput();
  };

  useEffect(() => {
    focusInput();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointerQuery = window.matchMedia("(hover: hover) and (pointer: fine)");

    const syncPreferences = () => {
      setPrefersReducedMotion(reduceMotionQuery.matches);
      setSupportsCustomCursor(finePointerQuery.matches);
    };

    syncPreferences();
    reduceMotionQuery.addEventListener("change", syncPreferences);
    finePointerQuery.addEventListener("change", syncPreferences);

    return () => {
      reduceMotionQuery.removeEventListener("change", syncPreferences);
      finePointerQuery.removeEventListener("change", syncPreferences);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.localStorage?.getItem !== "function") return;

    const storedTheme = window.localStorage.getItem(themeStorageKey);
    const savedTheme = directionTwoThemes.find(theme => theme.id === storedTheme);
    if (!savedTheme) return;

    setActiveThemeId(savedTheme.id);
    applyTheme(savedTheme.id);
  }, []);

  useEffect(() => {
    setMarkIconState({
      current: directionTwoMarkIcons[0],
      previous: null,
      swapId: 0,
    });
    setIsTerminalVisible(prefersReducedMotion);

    if (prefersReducedMotion) return;

    let markIconIndex = 0;
    const clearTimers: number[] = [];
    const markIntervalId = window.setInterval(() => {
      markIconIndex = (markIconIndex + 1) % directionTwoMarkIcons.length;
      const nextIcon = directionTwoMarkIcons[markIconIndex];

      setMarkIconState(current => ({
        current: nextIcon,
        previous: current.current,
        swapId: current.swapId + 1,
      }));

      const clearTimer = window.setTimeout(() => {
        setMarkIconState(current => ({
          ...current,
          previous: null,
        }));
      }, markSwapDurationMs);
      clearTimers.push(clearTimer);
    }, markFlipDelayMs);
    const terminalTimer = window.setTimeout(() => {
      setIsTerminalVisible(true);
    }, terminalRevealDelayMs);

    return () => {
      window.clearInterval(markIntervalId);
      window.clearTimeout(terminalTimer);
      clearTimers.forEach(timer => window.clearTimeout(timer));
    };
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncScrollReserve = () => {
      const promptHeight = promptRowRef.current?.offsetHeight ?? 24;
      setScrollReserveHeight(
        getDirectionTwoScrollReserveHeight({
          viewportHeight: window.innerHeight,
          promptHeight,
        }),
      );
    };

    syncScrollReserve();
    window.addEventListener("resize", syncScrollReserve);
    return () => window.removeEventListener("resize", syncScrollReserve);
  }, [flow, inputValue, lines.length]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!lines.length || !promptRowRef.current) return;

    const nextScrollTop = getDirectionTwoAutoScrollTop({
      currentScrollY: window.scrollY,
      promptTop: promptRowRef.current.getBoundingClientRect().top,
      viewportHeight: window.innerHeight,
    });

    if (nextScrollTop <= window.scrollY + 1) return;

    window.scrollTo({
      top: nextScrollTop,
      behavior: "smooth",
    });
  }, [flow, lines.length]);

  useEffect(() => {
    if (!supportsCustomCursor || !mainRef.current || !cursorRef.current) return;

    const shell = mainRef.current;
    const cursor = cursorRef.current;
    let frameId = 0;
    let position = { x: 0, y: 0 };

    const renderCursor = () => {
      cursor.style.transform = `translate3d(${position.x}px, ${position.y}px, 0)`;
      frameId = 0;
    };

    const handlePointerMove = (event: PointerEvent) => {
      position = {
        x: event.clientX - 5,
        y: event.clientY - 5,
      };
      setIsCursorVisible(true);
      if (!frameId) frameId = window.requestAnimationFrame(renderCursor);
    };

    const handlePointerDown = () => setIsCursorPressed(true);
    const handlePointerUp = () => setIsCursorPressed(false);
    const handlePointerLeave = () => {
      setIsCursorVisible(false);
      setIsCursorPressed(false);
    };

    shell.addEventListener("pointermove", handlePointerMove);
    shell.addEventListener("pointerdown", handlePointerDown);
    shell.addEventListener("pointerup", handlePointerUp);
    shell.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      shell.removeEventListener("pointermove", handlePointerMove);
      shell.removeEventListener("pointerdown", handlePointerDown);
      shell.removeEventListener("pointerup", handlePointerUp);
      shell.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, [supportsCustomCursor]);

  useEffect(() => {
    const handleDocumentKeyDown = (event: globalThis.KeyboardEvent) => {
      const target = event.target;
      const isEditableTarget =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable);

      if (event.key === "Escape") {
        event.preventDefault();
        cancelFlow();
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey || isEditableTarget) return;
      if (event.key.length === 1) focusInput();
    };

    document.addEventListener("keydown", handleDocumentKeyDown);
    return () => document.removeEventListener("keydown", handleDocumentKeyDown);
  });

  const pushHistory = (value: string) => {
    if (!value.trim()) return;
    setHistory(current => [...current.filter(command => command !== value), value].slice(-25));
    setHistoryIndex(null);
  };

  const printHelp = (command = "help") => {
    appendLines(
      line("input", command),
      line("output", "inkog creates temporary rooms without public profiles."),
      line("output", "create       start a guided private room setup"),
      line("output", "join <code>  enter a shared room"),
      line("output", "style        switch the live app theme"),
      line("output", "sound        show sound status, or use sound on/off"),
      line("output", "clear        reset this local transcript"),
      line("output", "keys         Enter submit, Up/Down history, Tab complete, Esc cancel"),
    );
    setKeyboardStatus("Help printed.");
  };

  const beginCreate = (command = "create") => {
    appendLines(
      line("input", command),
      line("output", "starting private room setup"),
      line("output", "answer each prompt, or press Esc to cancel"),
    );
    setFlow({ type: "create", step: "topic", draft: initialDraft });
    sound.play("press");
    setKeyboardStatus("Create flow started. Enter the room topic.");
  };

  const beginJoin = (command = "join") => {
    appendLines(
      line("input", command),
      line("output", "waiting for room id or link"),
    );
    setFlow({ type: "join", step: "room" });
    sound.play("press");
    setKeyboardStatus("Join flow started. Enter the room id.");
  };

  const beginStyle = (command = "/style") => {
    appendLines(
      line("input", command),
      line("output", "pick a theme by number or tap an option below"),
    );
    setFlow({ type: "style", step: "choice" });
    sound.play("press");
    setKeyboardStatus("Style picker opened.");
  };

  const commitThemeSelection = (theme: DirectionTwoTheme, inputText: string, source = "manual") => {
    applyTheme(theme.id);
    setActiveThemeId(theme.id);
    appendLines(
      line("input", inputText),
      line("output", source === "surprise" ? `theme set: ${theme.label} (surprise me)` : `theme set: ${theme.label}`),
    );
    setFlow(null);
    sound.play("success");
    setKeyboardStatus(`Theme set: ${theme.label}.`);
    focusInput();
  };

  const answerStylePrompt = (rawAnswer: string) => {
    const theme = resolveDirectionTwoThemeChoice(rawAnswer);
    if (!theme) {
      appendLines(line("input", rawAnswer), line("error", "choose 1, 2, 3, 4, or 5"));
      sound.play("error");
      setKeyboardStatus("Theme choice must be 1 through 5.");
      return;
    }

    commitThemeSelection(theme, rawAnswer, rawAnswer.trim() === "5" ? "surprise" : "manual");
  };

  const openRoom = (rawRoomId: string, command = `join ${rawRoomId}`) => {
    const id = cleanRoomId(rawRoomId);

    if (!id) {
      appendLines(line("input", command), line("error", "missing room id"));
      sound.play("error");
      setKeyboardStatus("Missing room id.");
      return;
    }

    appendLines(line("input", command), line("output", `opening room: ${id}`));
    sound.play("success");
    router.push(`/room/${id}`);
  };

  const createRoom = async (draft: CreateDraft) => {
    setCreating(true);
    appendLines(
      line("input", "y"),
      line("output", "creating room..."),
    );

    try {
      const body: Record<string, unknown> = {
        topic: draft.topic,
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
        appendLines(line("error", data.message || "room creation failed"));
        sound.play("error");
        setKeyboardStatus("Room creation failed.");
        return;
      }

      setStoredToken(data.id, data.creatorToken);
      appendLines(
        line("output", `room created: ${data.id}`),
        line("output", `opening /room/${data.id}`),
      );
      sound.play("success");
      router.push(`/room/${data.id}`);
    } catch {
      appendLines(line("error", "could not reach room server"));
      sound.play("error");
      setKeyboardStatus("Could not reach room server.");
    } finally {
      setCreating(false);
      setFlow(null);
    }
  };

  const answerCreatePrompt = (flowState: Extract<SessionFlow, { type: "create" }>, rawAnswer: string) => {
    const answer = rawAnswer.trim();

    if (flowState.step === "topic") {
      if (!answer) {
        appendLines(line("error", "topic cannot be empty"));
        sound.play("error");
        setKeyboardStatus("Topic cannot be empty.");
        return;
      }

      appendLines(line("input", answer), line("output", "topic saved"));
      sound.play("success");
      setFlow({ type: "create", step: "expiry", draft: { ...flowState.draft, topic: answer } });
      setKeyboardStatus("Enter expiry in minutes.");
      return;
    }

    if (flowState.step === "expiry") {
      const expiry = Number(answer);
      if (!Number.isFinite(expiry) || expiry < 15) {
        appendLines(line("input", answer), line("error", "expiry must be 15 minutes or more"));
        sound.play("error");
        setKeyboardStatus("Expiry must be 15 minutes or more.");
        return;
      }

      appendLines(line("input", answer), line("output", `expires in ${expiry}m`));
      sound.play("success");
      setFlow({ type: "create", step: "limit", draft: { ...flowState.draft, expiry } });
      setKeyboardStatus("Enter member limit.");
      return;
    }

    if (flowState.step === "limit") {
      const roomLimit = Number(answer);
      if (!Number.isInteger(roomLimit) || roomLimit < 1 || roomLimit > 30) {
        appendLines(line("input", answer), line("error", "member limit must be a whole number from 1 to 30"));
        sound.play("error");
        setKeyboardStatus("Member limit must be from 1 to 30.");
        return;
      }

      appendLines(line("input", answer), line("output", `member limit set: ${roomLimit}`));
      sound.play("success");
      setFlow({ type: "create", step: "password-choice", draft: { ...flowState.draft, roomLimit } });
      setKeyboardStatus("Choose whether the room needs a password.");
      return;
    }

    if (flowState.step === "password-choice") {
      if (isNo(answer)) {
        appendLines(line("input", answer), line("output", "password: off"));
        sound.play("success");
        setFlow({ type: "create", step: "confirm", draft: { ...flowState.draft, password: "" } });
        setKeyboardStatus("Confirm room creation.");
        return;
      }

      if (isYes(answer)) {
        appendLines(line("input", answer), line("output", "password: on"));
        sound.play("success");
        setFlow({ type: "create", step: "password", draft: flowState.draft });
        setKeyboardStatus("Enter the room password.");
        return;
      }

      appendLines(line("input", answer), line("error", "answer y or n"));
      sound.play("error");
      setKeyboardStatus("Answer y or n.");
      return;
    }

    if (flowState.step === "password") {
      if (!answer) {
        appendLines(line("error", "password cannot be empty when password protection is on"));
        sound.play("error");
        setKeyboardStatus("Password cannot be empty.");
        return;
      }

      appendLines(line("input", "********"), line("output", "password stored locally until room creation"));
      sound.play("success");
      setFlow({ type: "create", step: "confirm", draft: { ...flowState.draft, password: answer } });
      setKeyboardStatus("Confirm room creation.");
      return;
    }

    if (flowState.step === "confirm") {
      if (isNo(answer)) {
        appendLines(line("input", answer), line("system", "room creation cancelled"));
        sound.play("close");
        setFlow(null);
        setKeyboardStatus("Room creation cancelled.");
        return;
      }

      if (isYes(answer)) {
        void createRoom(flowState.draft);
        return;
      }

      appendLines(line("input", answer), line("error", "answer y or n"));
      sound.play("error");
      setKeyboardStatus("Answer y or n.");
    }
  };

  const submitFlowAnswer = (rawAnswer: string) => {
    if (!flow) return;

    if (flow.type === "join") {
      const id = cleanRoomId(rawAnswer);
      if (!id) {
        appendLines(line("error", "room id cannot be empty"));
        sound.play("error");
        setKeyboardStatus("Room id cannot be empty.");
        return;
      }

      setFlow(null);
      openRoom(id, id);
      return;
    }

    if (flow.type === "style") {
      answerStylePrompt(rawAnswer);
      return;
    }

    answerCreatePrompt(flow, rawAnswer);
  };

  const handleSoundCommand = (rawCommand: string) => {
    const command = rawCommand.startsWith("/") ? rawCommand : `/${rawCommand}`;
    const parsed = parseSystemSoundCommand(command);

    if (parsed.type === "invalid") {
      appendLines(line("input", command), line("error", parsed.message ?? "usage: /sound on, /sound off, or /sound status"));
      sound.play("error");
      setKeyboardStatus("Sound command usage printed.");
      return;
    }

    if (parsed.type === "status") {
      const status = formatSystemSoundStatus(sound.muted);
      appendLines(line("input", command), line("output", status));
      sound.play("notify");
      setKeyboardStatus(status);
      return;
    }

    const nextMuted = parsed.muted === true;
    if (nextMuted) {
      sound.play("close");
    }
    sound.setMuted(nextMuted);
    const status = formatSystemSoundStatus(nextMuted);
    appendLines(line("input", command), line("output", status));
    setKeyboardStatus(status);
  };

  const executeCommand = (rawCommand: string) => {
    const command = rawCommand.trim();
    const normalized = command.toLowerCase().replace(/^\/+/, "");

    if (!command || creating) return;

    setInputValue("");

    if (flow) {
      submitFlowAnswer(command);
      return;
    }

    pushHistory(command);

    if (normalized === "create" || normalized === "start" || normalized === "new") {
      beginCreate(command);
      return;
    }

    if (normalized === "join" || normalized === "open") {
      beginJoin(command);
      return;
    }

    if (normalized.startsWith("join ")) {
      openRoom(command.replace(/^\/?join\s+/i, ""), command);
      return;
    }

    if (normalized === "clear") {
      clearTerminal();
      return;
    }

    if (normalized === "style") {
      beginStyle(command.startsWith("/") ? command : "/style");
      return;
    }

    if (normalized === "sound" || normalized.startsWith("sound ")) {
      handleSoundCommand(command);
      return;
    }

    if (normalized === "help" || normalized === "?") {
      printHelp(command);
      return;
    }

    appendLines(
      line("input", command),
      line("error", `command not found: ${command}`),
      line("output", "try help"),
    );
    sound.play("error");
    setKeyboardStatus(`Command not found: ${command}.`);
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (creating) return;

    if (event.key === "Enter") {
      event.preventDefault();
      executeCommand(event.currentTarget.value);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!history.length) return;

      const nextIndex = historyIndex === null ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIndex);
      setInputValue(history[nextIndex]);
      sound.play("press");
      setKeyboardStatus("Previous command loaded.");
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!history.length || historyIndex === null) return;

      const nextIndex = historyIndex + 1;
      if (nextIndex >= history.length) {
        setHistoryIndex(null);
        setInputValue("");
        sound.play("press");
        setKeyboardStatus("Command history cleared from prompt.");
        return;
      }

      setHistoryIndex(nextIndex);
      setInputValue(history[nextIndex]);
      sound.play("press");
      setKeyboardStatus("Next command loaded.");
      return;
    }

    if (event.key === "Tab" && !flow) {
      event.preventDefault();
      const partial = inputValue.trim().toLowerCase().replace(/^\/+/, "");
      if (!partial) return;

      const match = commands.find(command => command.startsWith(partial));
      if (match) {
        setInputValue(inputValue.trim().startsWith("/") ? `/${match}` : match);
        sound.play("press");
        setKeyboardStatus(`${match} autocompleted.`);
      }
    }
  };

  const activePrompt = promptFor(flow);
  const completionSuggestion = commandCompletionFor(inputValue, flow);

  return (
    <main
      ref={mainRef}
      className={`relative isolate min-h-screen overflow-hidden bg-[var(--background)] px-5 py-7 font-mono text-[var(--foreground)] sm:px-10 sm:py-10 ${
        supportsCustomCursor ? "direction-two-cursor-scope" : ""
      }`}
      onClick={focusInput}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-0 h-screen overflow-hidden">
        <div className="direction-two-ambient-glow absolute inset-0" style={ambientAtmosphereStyle} />
        {ambientPixels.map(pixel => (
          <span
            key={pixel.id}
            className="direction-two-ambient-pixel absolute"
            style={
              {
                left: `${pixel.left}%`,
                top: `${pixel.top}%`,
                width: `${pixel.size}px`,
                height: `${pixel.size}px`,
                "--pixel-opacity": String(pixel.opacity),
                "--pixel-opacity-peak": String(Math.min(pixel.opacity * 1.14, 1)),
                "--pixel-drift-x": `${pixel.driftX}px`,
                "--pixel-drift-y": `${pixel.driftY}px`,
                "--pixel-drift-x-mid": `${pixel.driftX * 0.34}px`,
                "--pixel-drift-y-mid": `${pixel.driftY * 0.34}px`,
                "--pixel-drift-x-late": `${pixel.driftX * 0.78}px`,
                "--pixel-drift-y-late": `${pixel.driftY * 0.78}px`,
                "--pixel-wave-delay": `${pixel.waveDelay}s`,
                "--pixel-sweep-duration": `${pixel.sweepDuration}s`,
                "--pixel-shimmer-delay": `${pixel.shimmerDelay}s`,
                "--pixel-shimmer-duration": `${pixel.duration}s`,
                "--pixel-shimmer-phase": `${pixel.shimmerPhase}s`,
                "--pixel-glow-strength": `${directionTwoAmbientAtmosphere.glowStrength}px`,
                "--pixel-glow-soft": `${directionTwoAmbientAtmosphere.glowStrength * 0.45}px`,
              } as CSSProperties
            }
          >
            <span className="direction-two-ambient-pixel-core block h-full w-full rounded-[1px] bg-[var(--color-signal)]" />
          </span>
        ))}
      </div>
      {supportsCustomCursor && (
        <div
          ref={cursorRef}
          aria-hidden="true"
          className={`pointer-events-none fixed left-0 top-0 z-40 h-[10px] w-[10px] transition-opacity duration-100 ${
            isCursorVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          <div
            className={`h-full w-full transition-[transform,background-color,box-shadow] duration-100 [transition-timing-function:var(--ease-out-strong)] ${
              isCursorPressed ? "scale-[0.72]" : "scale-100"
            }`}
            style={{
              backgroundColor: isCursorPressed ? "var(--color-signal-dim)" : "var(--color-signal)",
              boxShadow: isCursorPressed
                ? "0 0 0 1px rgba(0,0,0,0.28), 0 0 12px var(--color-signal-glow)"
                : "0 0 0 1px rgba(0,0,0,0.22), 0 0 10px var(--color-signal-glow)",
            }}
          />
        </div>
      )}
      <p id="direction-two-keyboard-shortcuts" className="sr-only">
        Enter submits a command or answer. Arrow up and arrow down move through command history. Tab autocompletes commands. Escape cancels the current prompt.
      </p>
      <p aria-live="polite" className="sr-only">
        {keyboardStatus}
      </p>

      <section
        aria-describedby="direction-two-keyboard-shortcuts"
        className="relative z-10 mx-auto flex min-h-[calc(100vh-56px)] w-full max-w-[1120px] flex-col"
      >
        <header className="flex flex-col gap-4 pb-5 pt-8 sm:pt-12">
          <div>
            <InkPatternMark
              icon={markIconState.current}
              previousIcon={markIconState.previous}
              reducedMotion={prefersReducedMotion}
              swapId={markIconState.swapId}
              word={directionTwoMarkWords[0]}
            />
          </div>
          <div className="max-w-[680px] space-y-4 text-[13px] leading-[22px] text-[var(--muted-foreground)] sm:text-[14px]">
            <p className="direction-two-intro-copy pt-4">
              {headlineText}
            </p>
            <div className="space-y-6 pt-6 text-[12px] leading-[18px] text-[var(--muted-foreground)] sm:text-[13px]">
              {introHighlights.map((item, index) => (
                <div
                  className={`direction-two-intro-row flex items-center gap-3 ${prefersReducedMotion ? "" : "direction-two-intro-item"}`}
                  key={item.text}
                  style={
                    prefersReducedMotion
                      ? undefined
                      : ({
                          animationDelay: `${620 + index * 70}ms`,
                        } as CSSProperties)
                  }
                >
                  <PixelIcon pattern={item.icon} />
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </header>

        <div
          className={`pb-6 pt-12 transition-[opacity,transform] duration-300 [transition-timing-function:var(--ease-out-strong)] ${
            isTerminalVisible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
          }`}
        >
          <div className="space-y-2" aria-label="Terminal output">
            {lines.map(entry => (
              <TerminalLine key={entry.id} {...entry} />
            ))}
          </div>

          {flow?.type === "style" && (
            <div className="mt-4 flex flex-wrap items-center gap-3" role="group" aria-label="Theme choices">
              {directionTwoThemes.map(theme => {
                const isActive = theme.id === activeThemeId;

                return (
                  <button
                    key={theme.id}
                    type="button"
                    className="rounded-[4px] border px-3 py-1 font-mono text-[13px] leading-[22px] transition-colors duration-150"
                    onClick={() => commitThemeSelection(theme, theme.selection)}
                    onMouseEnter={() => sound.play("hover")}
                    style={{
                      background: isActive ? "rgba(255,255,255,0.04)" : "transparent",
                      borderColor: isActive ? themePreviewColorById[theme.id] : "var(--color-border)",
                      color: themePreviewColorById[theme.id],
                    }}
                  >
                    {theme.selection} {theme.label}
                  </button>
                );
              })}
              <button
                type="button"
                className="rounded-[4px] border border-[var(--color-border)] px-3 py-1 font-mono text-[13px] leading-[22px] text-[var(--foreground)] transition-colors duration-150 hover:border-[var(--color-border-strong)]"
                onClick={() => answerStylePrompt("5")}
                onMouseEnter={() => sound.play("hover")}
              >
                5 surprise me
              </button>
            </div>
          )}

          <div
            ref={promptRowRef}
            className={`${lines.length > 0 ? "mt-2 " : ""}flex min-w-0 items-baseline text-[14px] leading-[24px] text-[var(--foreground)]`}
          >
            <label className="sr-only" htmlFor="terminal-command">{activePrompt}</label>
            <span className="shrink-0 whitespace-nowrap text-[var(--foreground)]" aria-hidden="true">
              {activePrompt === "$" ? "$" : `> ${activePrompt}:`}
            </span>
            <div className="relative ml-2 flex min-w-0 flex-1 items-baseline">
              <input
                ref={inputRef}
                aria-describedby={completionSuggestion ? "terminal-completion-hint" : undefined}
                aria-label={activePrompt}
                autoCapitalize="off"
                autoComplete="off"
                autoCorrect="off"
                className="min-w-0 flex-1 appearance-none p-0 font-mono text-[14px] leading-[24px] text-[var(--foreground)] caret-[var(--foreground)] placeholder:text-[var(--color-dim)] disabled:cursor-wait disabled:opacity-60"
                disabled={creating}
                id="terminal-command"
                name="command"
                onChange={event => {
                  setInputValue(event.target.value);
                  setHistoryIndex(null);
                }}
                onKeyDown={handleInputKeyDown}
                placeholder={creating ? "creating room..." : placeholderFor(flow)}
                spellCheck={false}
                style={{
                  background: "transparent",
                  border: 0,
                  boxShadow: "none",
                  outline: "none",
                }}
                type={flow?.type === "create" && flow.step === "password" ? "password" : "text"}
                value={inputValue}
              />
              {completionSuggestion && (
                <span
                  className="ml-3 shrink-0 text-[12px] leading-[24px] text-[var(--color-dim)]"
                  id="terminal-completion-hint"
                >
                  tab {`->`} {completionSuggestion}
                </span>
              )}
            </div>
          </div>

          <div aria-hidden="true" style={{ height: lines.length > 0 ? `${scrollReserveHeight}px` : "0px" }} />
        </div>
      </section>
    </main>
  );
}

function InkPatternMark({
  word,
  icon,
  previousIcon,
  reducedMotion,
  swapId,
}: {
  word: string;
  icon: DirectionTwoMarkIcon;
  previousIcon: DirectionTwoMarkIcon | null;
  reducedMotion: boolean;
  swapId: number;
}) {
  const isSwapping = Boolean(previousIcon) && !reducedMotion;

  return (
    <div
      aria-label={`${word}, ${icon.label}`}
      className="direction-two-mark relative flex w-fit max-w-full items-start gap-[calc(var(--letter-gap)*2)] overflow-hidden [--cell:clamp(4px,0.56vw,7px)] [--gap:clamp(1px,0.12vw,2px)] [--letter-gap:clamp(5px,0.44vw,9px)]"
      role="img"
    >
      <InkPatternMarkLayer
        className={reducedMotion ? "" : "direction-two-mark-layer-entering"}
        key={word}
        word={word}
      />
      <div aria-hidden="true" className="direction-two-mark-icon relative shrink-0 overflow-hidden">
        <InkPatternIconLayer
          className={isSwapping ? "direction-two-mark-layer-entering" : ""}
          key={`current-icon-${icon.id}-${swapId}`}
          pattern={icon.pattern}
        />
        {isSwapping && previousIcon && (
          <InkPatternIconLayer
            className="direction-two-mark-layer-exiting"
            key={`previous-icon-${previousIcon.id}-${swapId}`}
            pattern={previousIcon.pattern}
          />
        )}
      </div>
    </div>
  );
}

function InkPatternIconLayer({
  pattern,
  className = "",
}: {
  pattern: string[];
  className?: string;
}) {
  return (
    <div className={`direction-two-mark-layer flex w-fit origin-left items-start gap-[var(--letter-gap)] ${className}`}>
      <PixelPatternGrid density={2} letterIndex={0} pattern={pattern} />
    </div>
  );
}

function InkPatternMarkLayer({
  word,
  className = "",
}: {
  word: string;
  className?: string;
}) {
  const patterns: string[][] = buildDirectionTwoMarkPattern(word);

  return (
    <div className={`direction-two-mark-layer flex w-fit origin-left items-start gap-[var(--letter-gap)] ${className}`}>
      {patterns.map((letter, letterIndex) => (
        <PixelPatternGrid
          density={2}
          key={letterIndex}
          letterIndex={letterIndex}
          pattern={letter}
        />
      ))}
    </div>
  );
}

function PixelPatternGrid({
  density = 1,
  pattern,
  letterIndex,
}: {
  density?: number;
  pattern: string[];
  letterIndex: number;
}) {
  const densePattern = density > 1 ? createDensePixelPattern(pattern, density) : pattern;
  const columnCount = densePattern[0]?.length ?? 0;
  const rowCount = densePattern.length;

  return (
    <div
      aria-hidden="true"
      className="grid shrink-0 gap-[var(--gap)]"
      style={{
        gridTemplateColumns: `repeat(${columnCount}, var(--cell))`,
        gridTemplateRows: `repeat(${rowCount}, var(--cell))`,
      }}
    >
      {densePattern.flatMap((row: string, rowIndex: number) =>
        [...row].map((cell, columnIndex) => {
          const active = cell === "1";
          const shimmerColumn = letterIndex * (columnCount + 2) + columnIndex;
          const resolveDelay = Math.min(shimmerColumn * 14 + rowIndex * 5, 520);
          const shimmerDelay = shimmerColumn * 5 + rowIndex * 3;

          return (
            <span
              className={`direction-two-mark-pixel block size-[var(--cell)] ${
                active ? "direction-two-mark-pixel-active" : "direction-two-mark-pixel-idle"
              }`}
              key={`${rowIndex}-${columnIndex}`}
              style={
                {
                  "--mark-pixel-delay": `${resolveDelay}ms`,
                  "--mark-shimmer-delay": `${shimmerDelay}ms`,
                } as CSSProperties
              }
            />
          );
        }),
      )}
    </div>
  );
}

function createDensePixelPattern(pattern: string[], density: number) {
  return pattern.flatMap(row => {
    const expandedRow = [...row].map(cell => cell.repeat(density)).join("");
    return Array.from({ length: density }, () => expandedRow);
  });
}

function PixelIcon({ pattern }: { pattern: string[] }) {
  const columnCount = pattern[0]?.length ?? 0;
  const rowCount = pattern.length;

  return (
    <div
      aria-hidden="true"
      className="direction-two-highlight-icon grid shrink-0 gap-[1px]"
      style={{
        gridTemplateColumns: `repeat(${columnCount}, 2px)`,
        gridTemplateRows: `repeat(${rowCount}, 2px)`,
      }}
    >
      {pattern.flatMap((row, rowIndex) =>
        [...row].map((cell, columnIndex) => (
          <span
            className={cell === "1" ? "direction-two-highlight-pixel-active block size-[2px] bg-[var(--color-signal)] opacity-80" : "direction-two-highlight-pixel-idle block size-[2px] bg-[var(--color-border)] opacity-10"}
            key={`${rowIndex}-${columnIndex}`}
            style={
              cell === "1"
                ? ({
                    "--highlight-shimmer-delay": `${columnIndex * 18 + rowIndex * 8}ms`,
                  } as CSSProperties)
                : undefined
            }
          />
        )),
      )}
    </div>
  );
}

function TerminalLine({ kind, text }: TerminalLine) {
  const prefix = kind === "input" ? "$" : kind === "error" ? "error:" : kind === "system" ? "system:" : ">";
  const tone =
    kind === "error"
      ? "text-[var(--destructive)]"
      : kind === "input"
        ? "text-[var(--color-signal)]"
        : kind === "system"
          ? "text-[var(--foreground)]"
          : "text-[var(--muted-foreground)]";

  return (
    <p className={`break-words text-[14px] leading-[24px] ${tone}`}>
      <span aria-hidden="true">{prefix} </span>
      {text}
    </p>
  );
}

function useDirectionTwoScrambleText(
  target: string,
  {
    durationMs,
    startDelayMs = 0,
    disabled = false,
  }: {
    durationMs: number;
    startDelayMs?: number;
    disabled?: boolean;
  },
) {
  const [frame, setFrame] = useState(disabled ? target : getDirectionTwoScrambleFrame(target, 0));

  useEffect(() => {
    if (disabled || typeof window === "undefined") {
      setFrame(target);
      return;
    }

    let timeoutId = 0;
    let frameId = 0;
    let startTime = 0;

    setFrame(getDirectionTwoScrambleFrame(target, 0));

    const tick = (timestamp: number) => {
      if (!startTime) startTime = timestamp;

      const progress = Math.min(1, (timestamp - startTime) / durationMs);
      setFrame(getDirectionTwoScrambleFrame(target, progress));

      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    timeoutId = window.setTimeout(() => {
      frameId = window.requestAnimationFrame(tick);
    }, startDelayMs);

    return () => {
      window.clearTimeout(timeoutId);
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, [disabled, durationMs, startDelayMs, target]);

  return frame;
}
