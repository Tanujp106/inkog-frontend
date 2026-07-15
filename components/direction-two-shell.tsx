"use client";

import { CSSProperties, KeyboardEvent, PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useRouteTransition } from "@/components/route-transition-provider";
import {
  completeDirectionTwoCommand,
  completeDirectionTwoCommandArgument,
  completeDirectionTwoCreateField,
  directionTwoCommandReferenceLines,
  directionTwoThemes,
  getDirectionTwoCreateEditingStep,
  getDirectionTwoCreateAnswerError,
  getDirectionTwoCreateHint,
  getDirectionTwoInlineFeedbackMessage,
  getDirectionTwoInlineGhostText,
  getDirectionTwoCreatePromptPresentation,
  getDirectionTwoPasswordMask,
  getDirectionTwoSlashCommandSuggestions,
  getDirectionTwoCreateTimeArrowValue,
  getDirectionTwoCreateVisualSegments,
  getDirectionTwoCreateInlineInputError,
  getDirectionTwoInlinePromptPresentation,
  getDirectionTwoStyleGhostChoices,
  parseDirectionTwoInlineCommand,
  parseDirectionTwoCreateCommand,
  resolveDirectionTwoEnterAction,
  resolveDirectionTwoGhostTapCompletion,
  resolveDirectionTwoThemeChoice,
} from "@/lib/direction-two-shell.mjs";
import {
  buildDirectionTwoMarkPattern,
  directionTwoAmbientAtmosphere,
  directionTwoAmbientConfig,
  createDirectionTwoAmbientPixels,
  directionTwoMarkMotion,
  directionTwoMarkWords,
  getDirectionTwoScrambleFrame,
} from "@/lib/direction-two-intro.mjs";
import {
  formatSystemSoundStatus,
  parseSystemSoundCommand,
} from "@/lib/system-sound.mjs";
import { askInkogHelp } from "@/lib/inkog-help-api";
import { extractInkogHelpQuestion } from "@/lib/inkog-help.mjs";
import { setStoredRoomPassword } from "@/lib/room-password-command.mjs";
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

type ParsedCreateCommand =
  | { status: "not-create" }
  | { status: "partial"; nextStep: "topic" | "expiry" | "limit" | "password-choice" | "password"; draft: CreateDraft }
  | { status: "ready"; draft: CreateDraft }
  | { status: "invalid"; message: string };

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
const mobileIntroHeadline = "Create a temporary room for honest chats, quick votes, and no identity trail.";
const introScrambleDelayMs = 140;
const introScrambleDurationMs = 1080;
const terminalRevealDelayMs = 1640;

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
    mobileText: "private rooms for known people",
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
    mobileText: "temporary spaces that expire",
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
    mobileText: "quick prompts for decisions",
  },
];

const themePreviewColorById: Record<DirectionTwoTheme["id"], string> = {
  orange: "#ffb15c",
  blue: "#7cc7ff",
  green: "#c8ff57",
  purple: "#c792ff",
};
const slashMenuImmediateCommands = new Set(["/clear"]);

type DirectionTwoShimmerSettings = {
  durationMs: number;
  delayMaxMs: number;
  transitionMs: number;
  burstTailMs: number;
  titleDurationMs: number;
  titleDelayMaxMs: number;
  titleBurstTailMs: number;
  idleOpacity: number;
  peakOpacity: number;
  settleOpacity: number;
  idleBrightness: number;
  peakBrightness: number;
  settleBrightness: number;
  signalRadius: number;
  haloRadius: number;
  signalOpacity: number;
  haloOpacity: number;
  colorMixPercent: number;
  titleColorMixPercent: number;
  titlePeakBrightness: number;
  titleSettleBrightness: number;
  titleSignalRadius: number;
  titleHaloRadius: number;
  titleSignalOpacity: number;
  titleHaloOpacity: number;
};

const defaultDirectionTwoShimmerSettings: DirectionTwoShimmerSettings = {
  durationMs: 1040,
  delayMaxMs: 120,
  transitionMs: 360,
  burstTailMs: 120,
  titleDurationMs: 660,
  titleDelayMaxMs: 280,
  titleBurstTailMs: 130,
  idleOpacity: 1,
  peakOpacity: 1,
  settleOpacity: 1,
  idleBrightness: 1,
  peakBrightness: 1.16,
  settleBrightness: 1,
  signalRadius: 4,
  haloRadius: 11,
  signalOpacity: 38,
  haloOpacity: 46,
  colorMixPercent: 38,
  titleColorMixPercent: 62,
  titlePeakBrightness: 1.34,
  titleSettleBrightness: 1.08,
  titleSignalRadius: 6,
  titleHaloRadius: 16,
  titleSignalOpacity: 58,
  titleHaloOpacity: 64,
};

function percent(value: number) {
  return `${value}%`;
}

function buildDirectionTwoShimmerStyle(settings: DirectionTwoShimmerSettings) {
  return {
    "--highlight-shimmer-duration": `${settings.durationMs}ms`,
    "--direction-two-shimmer-transition-duration": `${settings.transitionMs}ms`,
    "--direction-two-shimmer-idle-opacity": settings.idleOpacity,
    "--direction-two-shimmer-peak-opacity": settings.peakOpacity,
    "--direction-two-shimmer-settle-opacity": settings.settleOpacity,
    "--direction-two-shimmer-idle-brightness": settings.idleBrightness,
    "--direction-two-shimmer-peak-brightness": settings.peakBrightness,
    "--direction-two-shimmer-settle-brightness": settings.settleBrightness,
    "--direction-two-shimmer-signal-radius": `${settings.signalRadius}px`,
    "--direction-two-shimmer-halo-radius": `${settings.haloRadius}px`,
    "--direction-two-shimmer-signal-opacity": percent(settings.signalOpacity),
    "--direction-two-shimmer-halo-opacity": percent(settings.haloOpacity),
    "--direction-two-shimmer-color-mix": percent(settings.colorMixPercent),
    "--direction-two-shimmer-foreground-mix": percent(100 - settings.colorMixPercent),
    "--direction-two-title-shimmer-duration": `${settings.titleDurationMs}ms`,
    "--direction-two-title-shimmer-color-mix": percent(settings.titleColorMixPercent),
    "--direction-two-title-shimmer-foreground-mix": percent(100 - settings.titleColorMixPercent),
    "--direction-two-title-shimmer-peak-brightness": settings.titlePeakBrightness,
    "--direction-two-title-shimmer-settle-brightness": settings.titleSettleBrightness,
    "--direction-two-title-shimmer-signal-radius": `${settings.titleSignalRadius}px`,
    "--direction-two-title-shimmer-halo-radius": `${settings.titleHaloRadius}px`,
    "--direction-two-title-shimmer-signal-opacity": percent(settings.titleSignalOpacity),
    "--direction-two-title-shimmer-halo-opacity": percent(settings.titleHaloOpacity),
  } as CSSProperties;
}

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
      return "room name";
    case "expiry":
      return "total minutes";
    case "limit":
      return "maximum participants";
    case "password-choice":
      return "add password?(y/n)";
    case "password":
      return "write password";
    case "confirm":
      return "tap enter to create";
  }
}

function placeholderFor(flow: SessionFlow | null) {
  if (!flow) return "write '/' to start";
  if (flow.type === "join") return "abc123 or room link";
  if (flow.type === "style") return "1, 2, 3, 4, or 5";

  switch (flow.step) {
    case "topic":
      return "what should we call the room?";
    case "expiry":
      return "how many minutes should the room stay open?";
    case "limit":
      return "maximum participants?";
    case "password-choice":
      return "add password?(y/n)";
    case "password":
      return "write password";
    case "confirm":
      return "tap enter to create";
  }
}

function createPromptPresentationForFlow(flow: SessionFlow | null) {
  if (!flow || flow.type !== "create") return null;

  switch (flow.step) {
    case "topic":
      return getDirectionTwoCreatePromptPresentation("/create");
    case "expiry":
      return getDirectionTwoCreatePromptPresentation("/create room");
    case "limit":
      return getDirectionTwoCreatePromptPresentation("/create room 60");
    case "password-choice":
      return getDirectionTwoCreatePromptPresentation("/create room 60 8");
    case "password":
      return getDirectionTwoCreatePromptPresentation("/create room 60 8 y");
    case "confirm":
      return getDirectionTwoCreatePromptPresentation("/create room 60 8 n");
  }
}

function commandCompletionFor(value: string, flow: SessionFlow | null) {
  if (flow) return null;
  return completeDirectionTwoCommand(value);
}

export function DirectionTwoShell() {
  const router = useRouter();
  const sound = useSystemSound();
  const { beginRoomHandoff } = useRouteTransition();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const inputMirrorRef = useRef<HTMLDivElement | null>(null);
  const promptRowRef = useRef<HTMLDivElement | null>(null);
  const slashMenuRef = useRef<HTMLDivElement | null>(null);
  const inputNudgeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const passwordRevealTimerRef = useRef<number | null>(null);
  const passwordFinalShimmerTimerRef = useRef<number | null>(null);
  const passwordSubmissionRef = useRef("");
  const [inputValue, setInputValue] = useState("");
  const [lines, setLines] = useState<TerminalLine[]>(initialLines);
  const [flow, setFlow] = useState<SessionFlow | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const [slashSuggestionIndex, setSlashSuggestionIndex] = useState(0);
  const [slashSelectionMode, setSlashSelectionMode] = useState<"pointer" | "keyboard">("pointer");
  const [creating, setCreating] = useState(false);
  const [helping, setHelping] = useState(false);
  const [keyboardStatus, setKeyboardStatus] = useState("Private terminal ready.");
  const [inputFeedbackMessage, setInputFeedbackMessage] = useState<string | null>(null);
  const [passwordRevealIndex, setPasswordRevealIndex] = useState<number | null>(null);
  const [passwordFinalShimmer, setPasswordFinalShimmer] = useState(false);
  const [activeThemeId, setActiveThemeId] = useState<DirectionTwoTheme["id"]>("green");
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isTerminalVisible, setIsTerminalVisible] = useState(false);
  const [isInputNudging, setIsInputNudging] = useState(false);
  const [hasMarkIntroPlayed, setHasMarkIntroPlayed] = useState(false);
  const shimmerSettings = defaultDirectionTwoShimmerSettings;
  const shimmerStyle = buildDirectionTwoShimmerStyle(shimmerSettings);
  const slashCommandSuggestions = !flow && !inputFeedbackMessage ? getDirectionTwoSlashCommandSuggestions(inputValue) : [];
  const ambientPixels = useMemo(() => {
    return createDirectionTwoAmbientPixels(Math.random, directionTwoAmbientConfig);
  }, []);
  const ambientAtmosphereStyle = {
    background: directionTwoAmbientAtmosphere.background,
    mixBlendMode: directionTwoAmbientAtmosphere.mixBlendMode,
    "--direction-two-ambient-signal": directionTwoAmbientAtmosphere.signalColor,
    "--direction-two-ambient-glow": directionTwoAmbientAtmosphere.signalGlow,
  } as CSSProperties;
  const headlineText = useDirectionTwoScrambleText(introHeadline, {
    durationMs: introScrambleDurationMs,
    startDelayMs: introScrambleDelayMs,
    disabled: prefersReducedMotion,
  });
  const mobileHeadlineText = useDirectionTwoScrambleText(mobileIntroHeadline, {
    durationMs: introScrambleDurationMs,
    startDelayMs: introScrambleDelayMs,
    disabled: prefersReducedMotion,
  });

  const appendLines = (...nextLines: TerminalLine[]) => {
    setLines(current => [...current, ...nextLines]);
  };

  const focusInput = () => {
    requestAnimationFrame(() => {
      const input = inputRef.current;
      if (!input) return;

      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    });
  };

  const syncInputMirrorScroll = () => {
    requestAnimationFrame(() => {
      const input = inputRef.current;
      const inputMirror = inputMirrorRef.current;
      if (!input || !inputMirror) return;

      inputMirror.scrollLeft = input.scrollLeft;
    });
  };

  const nudgeInput = (message: string) => {
    if (inputNudgeTimeoutRef.current) {
      clearTimeout(inputNudgeTimeoutRef.current);
    }

    setIsInputNudging(false);
    requestAnimationFrame(() => {
      setIsInputNudging(true);
      inputNudgeTimeoutRef.current = setTimeout(() => {
        setIsInputNudging(false);
        inputNudgeTimeoutRef.current = null;
      }, 260);
    });

    sound.play("error");
    setInputFeedbackMessage(getDirectionTwoInlineFeedbackMessage(message));
    setKeyboardStatus(message);
  };

  const rejectInputInline = (value: string, message: string) => {
    setInputValue(value);
    nudgeInput(message);
  };

  const cancelFlow = () => {
    sound.play("close");
    if (flow) appendLines(line("system", "cancelled current prompt"));
    setFlow(null);
    setInputValue("");
    setInputFeedbackMessage(null);
    setKeyboardStatus("Prompt cancelled.");
    focusInput();
  };

  const clearTerminal = () => {
    sound.play("press");
    setFlow(null);
    setInputValue("");
    setInputFeedbackMessage(null);
    setLines(initialLines);
    setKeyboardStatus("Terminal cleared.");
    focusInput();
  };

  useEffect(() => {
    focusInput();
  }, []);

  useEffect(() => {
    return () => {
      if (inputNudgeTimeoutRef.current) {
        clearTimeout(inputNudgeTimeoutRef.current);
      }
      if (passwordRevealTimerRef.current) {
        clearInterval(passwordRevealTimerRef.current);
      }
      if (passwordFinalShimmerTimerRef.current) {
        clearTimeout(passwordFinalShimmerTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      setHasMarkIntroPlayed(true);
      return;
    }

    const introTimer = window.setTimeout(() => {
      setHasMarkIntroPlayed(true);
    }, directionTwoMarkMotion.introShimmerMs + 1000);

    return () => window.clearTimeout(introTimer);
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const syncPreferences = () => {
      setPrefersReducedMotion(reduceMotionQuery.matches);
    };

    syncPreferences();
    reduceMotionQuery.addEventListener("change", syncPreferences);

    return () => {
      reduceMotionQuery.removeEventListener("change", syncPreferences);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mobileQuery = window.matchMedia("(max-width: 639px)");

    const syncViewport = () => {
      setIsMobileViewport(mobileQuery.matches);
    };

    syncViewport();
    mobileQuery.addEventListener("change", syncViewport);

    return () => {
      mobileQuery.removeEventListener("change", syncViewport);
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
    setIsTerminalVisible(prefersReducedMotion);

    if (prefersReducedMotion) return;

    const terminalTimer = window.setTimeout(() => {
      setIsTerminalVisible(true);
    }, terminalRevealDelayMs);

    return () => {
      window.clearTimeout(terminalTimer);
    };
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (!isTerminalVisible) return;
    focusInput();
  }, [isTerminalVisible]);

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
      if (event.key.length !== 1) return;

      event.preventDefault();
      setInputFeedbackMessage(null);
      setHistoryIndex(null);
      setInputValue(current => `${current}${event.key}`);
      focusInput();
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
      ...directionTwoCommandReferenceLines.map(referenceLine => line("output", referenceLine)),
    );
    setKeyboardStatus("Command list printed.");
  };

  const askProjectHelp = async (command: string, question: string) => {
    setHelping(true);
    appendLines(line("input", command), line("output", "asking inkog..."));

    try {
      const result = await askInkogHelp(API, question);
      appendLines(line("output", result.answer));
      sound.play("notify");
      setKeyboardStatus("inkog answered.");
    } catch {
      appendLines(line("error", "I could not reach the inkog help brain right now."));
      sound.play("error");
      setKeyboardStatus("Help request failed.");
    } finally {
      setHelping(false);
    }
  };

  const beginCreate = (command = "/create") => {
    appendLines(
      line("input", command),
      line("output", "starting private room setup"),
      line("output", "answer each prompt, or use: /create / room name / minutes / participants / y/n"),
    );
    setFlow({ type: "create", step: "topic", draft: initialDraft });
    sound.play("press");
    setKeyboardStatus("Create flow started. What should we call the room?");
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

  const answerStylePrompt = (rawAnswer: string, inputText = rawAnswer) => {
    const theme = resolveDirectionTwoThemeChoice(rawAnswer);
    if (!theme) {
      rejectInputInline(inputText, "Theme choice must be 1 through 5.");
      return;
    }

    commitThemeSelection(theme, inputText, rawAnswer.trim() === "5" ? "surprise" : "manual");
  };

  const openRoom = (rawRoomId: string, command = `join ${rawRoomId}`) => {
    const id = cleanRoomId(rawRoomId);

    if (!id) {
      rejectInputInline(command, "Missing room id.");
      return;
    }

    appendLines(line("input", command), line("output", `opening room: ${id}`));
    sound.play("success");
    beginRoomHandoff(id, promptRowRef.current);
    router.push(`/room/${id}`);
  };

  const createRoom = async (draft: CreateDraft, options: { confirmInput?: string | null } = {}) => {
    const confirmInput = options.confirmInput === undefined ? "y" : options.confirmInput;

    setCreating(true);
    appendLines(
      ...(confirmInput ? [line("input", confirmInput)] : []),
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
        rejectInputInline("", data.message || "Room creation failed.");
        return;
      }

      setStoredToken(data.id, data.creatorToken);
      setStoredRoomPassword(data.id, draft.password);
      appendLines(
        line("output", `room created: ${data.id}`),
        line("output", `opening /room/${data.id}`),
      );
      sound.play("success");
      beginRoomHandoff(data.id, promptRowRef.current);
      router.push(`/room/${data.id}`);
    } catch {
      rejectInputInline("", "Could not reach room server.");
    } finally {
      setCreating(false);
      setFlow(null);
    }
  };

  const revealPassword = (password: string, onComplete: () => void) => {
    if (passwordRevealTimerRef.current) {
      clearInterval(passwordRevealTimerRef.current);
    }
    if (passwordFinalShimmerTimerRef.current) {
      clearTimeout(passwordFinalShimmerTimerRef.current);
    }

    passwordSubmissionRef.current = password;
    setPasswordFinalShimmer(false);
    setPasswordRevealIndex(0);

    const frameDuration = Math.max(40, Math.round(500 / password.length));
    let revealIndex = 0;
    passwordRevealTimerRef.current = window.setInterval(() => {
      revealIndex += 1;

      if (revealIndex < password.length) {
        setPasswordRevealIndex(revealIndex);
        return;
      }

      if (passwordRevealTimerRef.current) {
        clearInterval(passwordRevealTimerRef.current);
        passwordRevealTimerRef.current = null;
      }
      setPasswordFinalShimmer(true);
      passwordFinalShimmerTimerRef.current = window.setTimeout(() => {
        passwordFinalShimmerTimerRef.current = null;
        passwordSubmissionRef.current = "";
        setPasswordFinalShimmer(false);
        setPasswordRevealIndex(null);
        onComplete();
      }, 180);
    }, frameDuration);
  };

  const applyInlineCreateCommand = (command: string, parsed: Exclude<ParsedCreateCommand, { status: "not-create" }>) => {
    if (parsed.status === "invalid") {
      rejectInputInline(command, parsed.message);
      return;
    }

    if (parsed.status === "partial") {
      appendLines(line("input", command), line("output", `continue setup: ${placeholderFor({ type: "create", step: parsed.nextStep, draft: parsed.draft })}`));
      setFlow({ type: "create", step: parsed.nextStep, draft: parsed.draft });
      sound.play("press");
      setKeyboardStatus(`Create command captured. Continue with ${promptFor({ type: "create", step: parsed.nextStep, draft: parsed.draft })}.`);
      return;
    }

    const createRoomFromInlineCommand = () => {
      setInputValue("");
      appendLines(
        line("input", command),
        line("output", `creating "${parsed.draft.topic}" for ${parsed.draft.expiry}m, ${parsed.draft.roomLimit} members`),
        line("output", parsed.draft.password ? "password: on" : "password: off"),
      );
      sound.play("press");
      void createRoom(parsed.draft, { confirmInput: null });
    };

    if (parsed.draft.password) {
      setInputValue(command);
      revealPassword(parsed.draft.password, createRoomFromInlineCommand);
      return;
    }

    createRoomFromInlineCommand();
  };

  const answerCreatePrompt = (flowState: Extract<SessionFlow, { type: "create" }>, rawAnswer: string) => {
    const answer = rawAnswer.trim();
    const answerError = getDirectionTwoCreateAnswerError(flowState.step, rawAnswer);

    if (answerError) {
      rejectInputInline(rawAnswer, answerError);
      return;
    }

    if (flowState.step === "topic") {
      appendLines(line("input", answer), line("output", "topic saved"));
      sound.play("success");
      setFlow({ type: "create", step: "expiry", draft: { ...flowState.draft, topic: answer } });
      setKeyboardStatus("How many minutes should the room stay open?");
      return;
    }

    if (flowState.step === "expiry") {
      const expiry = Number(answer);

      appendLines(line("input", answer), line("output", `expires in ${expiry}m`));
      sound.play("success");
      setFlow({ type: "create", step: "limit", draft: { ...flowState.draft, expiry } });
      setKeyboardStatus("Maximum participants?");
      return;
    }

    if (flowState.step === "limit") {
      const roomLimit = Number(answer);

      appendLines(line("input", answer), line("output", `member limit set: ${roomLimit}`));
      sound.play("success");
      setFlow({ type: "create", step: "password-choice", draft: { ...flowState.draft, roomLimit } });
      setKeyboardStatus("Add password? Answer y or n.");
      return;
    }

    if (flowState.step === "password-choice") {
      if (isNo(answer)) {
        appendLines(line("input", answer), line("output", "password: off"));
        sound.play("success");
        setFlow({ type: "create", step: "confirm", draft: { ...flowState.draft, password: "" } });
        setKeyboardStatus("Tap Enter to create.");
        return;
      }

      if (isYes(answer)) {
        appendLines(line("input", answer), line("output", "password: on"));
        sound.play("success");
        setFlow({ type: "create", step: "password", draft: flowState.draft });
        setKeyboardStatus("Write password.");
        return;
      }
    }

    if (flowState.step === "password") {
      revealPassword(answer, () => {
        appendLines(line("input", "********"), line("output", "password stored locally until room creation"));
        sound.play("success");
        setFlow({ type: "create", step: "confirm", draft: { ...flowState.draft, password: answer } });
        setKeyboardStatus("Tap Enter to create.");
        focusInput();
      });
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

      if (!answer || isYes(answer)) {
        void createRoom(flowState.draft, { confirmInput: answer || null });
        return;
      }

      rejectInputInline(rawAnswer, "Answer y or n.");
    }
  };

  const submitFlowAnswer = (rawAnswer: string) => {
    if (!flow) return;

    if (flow.type === "join") {
      const id = cleanRoomId(rawAnswer);
      if (!id) {
        rejectInputInline(rawAnswer, "Room id cannot be empty.");
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

  const handleSoundCommand = (rawCommand: string, transcriptCommand = rawCommand) => {
    const command = rawCommand.startsWith("/") ? rawCommand : `/${rawCommand}`;
    const parsed = parseSystemSoundCommand(command);

    if (parsed.type === "invalid") {
      rejectInputInline(rawCommand, parsed.message ?? "Use sound on, sound off, or sound status.");
      return;
    }

    if (parsed.type === "status") {
      const status = formatSystemSoundStatus(sound.muted);
      appendLines(line("input", transcriptCommand), line("output", status));
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
    appendLines(line("input", transcriptCommand), line("output", status));
    setKeyboardStatus(status);
  };

  const executeCommand = (rawCommand: string) => {
    const command = rawCommand.trim();
    const normalized = command.toLowerCase().replace(/^\/+/, "");

    if (creating || helping) return;

    if (!command) {
      if (flow?.type === "create" && flow.step === "confirm") {
        setInputValue("");
        setInputFeedbackMessage(null);
        submitFlowAnswer(command);
      }
      return;
    }

    setInputValue("");
    setInputFeedbackMessage(null);

    if (flow) {
      submitFlowAnswer(command);
      return;
    }

    pushHistory(command);

    const helpQuestion = extractInkogHelpQuestion(command);
    if (helpQuestion) {
      void askProjectHelp(command, helpQuestion);
      return;
    }

    if (!command.startsWith("/")) {
      rejectInputInline(command, `Command not found: ${command}. Try / for commands.`);
      return;
    }

    const parsedCreateCommand = parseDirectionTwoCreateCommand(command) as ParsedCreateCommand;
    if (parsedCreateCommand.status !== "not-create") {
      if (parsedCreateCommand.status === "partial" && parsedCreateCommand.nextStep === "topic") {
        beginCreate(command);
        return;
      }

      applyInlineCreateCommand(command, parsedCreateCommand);
      return;
    }

    const parsedInlineCommand = parseDirectionTwoInlineCommand(command);

    if (parsedInlineCommand?.command === "join") {
      if (parsedInlineCommand.argument) {
        openRoom(parsedInlineCommand.argument, command);
        return;
      }

      if (parsedInlineCommand.usesSlash) {
        rejectInputInline(command, "Room id cannot be empty.");
        return;
      }
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

    if (parsedInlineCommand?.command === "style") {
      if (parsedInlineCommand.argument) {
        answerStylePrompt(parsedInlineCommand.argument, command);
        return;
      }

      if (parsedInlineCommand.usesSlash) {
        rejectInputInline(command, "Choose 1, 2, 3, 4, or 5.");
        return;
      }
    }

    if (normalized === "style") {
      beginStyle(command);
      return;
    }

    if (normalized.startsWith("style ")) {
      answerStylePrompt(command.replace(/^\/?style\s+/i, ""), command);
      return;
    }

    if (parsedInlineCommand?.command === "sound") {
      handleSoundCommand(parsedInlineCommand.usesSlash ? `sound ${parsedInlineCommand.argument}` : command, command);
      return;
    }

    if (normalized === "sound" || normalized.startsWith("sound ")) {
      handleSoundCommand(command);
      return;
    }

    if (
      parsedInlineCommand?.command === "help" ||
      normalized === "?"
    ) {
      printHelp(command);
      return;
    }

    if (normalized === "help" || normalized.startsWith("help ")) {
      printHelp(command);
      return;
    }

    rejectInputInline(command, `Command not found: ${command}.`);
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (creating || passwordRevealIndex !== null) return;

    const createEditingStep = !flow ? getDirectionTwoCreateEditingStep(event.currentTarget.value) : null;

    if (!flow && createEditingStep === "expiry" && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
      event.preventDefault();
      const nextTimeValue = getDirectionTwoCreateTimeArrowValue(
        event.currentTarget.value,
        event.key === "ArrowUp" ? "up" : "down",
      );

      if (!nextTimeValue) {
        nudgeInput("Type a number for total time first.");
        return;
      }

      setInputValue(nextTimeValue);
      setInputFeedbackMessage(null);
      setHistoryIndex(null);
      sound.play("press");
      setKeyboardStatus(`Total time set to ${nextTimeValue.split("/").at(-1)?.trim()} minutes.`);
      return;
    }

    if (
      !flow &&
      createEditingStep === "expiry" &&
      event.key.length === 1 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey &&
      !/^\d$/.test(event.key)
    ) {
      event.preventDefault();
      nudgeInput("Total time only accepts numbers.");
      return;
    }

    if (!flow && slashCommandSuggestions.length > 0 && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      setSlashSelectionMode("keyboard");
      setSlashSuggestionIndex(currentIndex => {
        const direction = event.key === "ArrowDown" ? 1 : -1;
        return (currentIndex + direction + slashCommandSuggestions.length) % slashCommandSuggestions.length;
      });
      sound.play("hover");
      setKeyboardStatus("Slash command suggestion changed.");
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (!flow && slashCommandSuggestions.length > 0) {
        const selectedCommand = slashCommandSuggestions[slashSuggestionIndex]?.command ?? slashCommandSuggestions[0].command;
        handleSlashCommandSuggestionTap(selectedCommand);
        return;
      }

      if (!flow) {
        const enterAction = resolveDirectionTwoEnterAction(event.currentTarget.value);

        if (enterAction?.type === "continue-inline" && enterAction.value) {
          setInputValue(enterAction.value);
          setInputFeedbackMessage(null);
          sound.play("press");
          setKeyboardStatus(enterAction.hint);
          return;
        }

        if (enterAction?.type === "hold-inline") {
          sound.play("press");
          setKeyboardStatus(enterAction.hint);
          return;
        }
      }

      executeCommand(event.currentTarget.value);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!history.length) return;

      const nextIndex = historyIndex === null ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIndex);
      setInputValue(history[nextIndex]);
      setInputFeedbackMessage(null);
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
        setInputFeedbackMessage(null);
        sound.play("press");
        setKeyboardStatus("Command history cleared from prompt.");
        return;
      }

      setHistoryIndex(nextIndex);
      setInputValue(history[nextIndex]);
      setInputFeedbackMessage(null);
      sound.play("press");
      setKeyboardStatus("Next command loaded.");
      return;
    }

    if (event.key === "Tab" && !flow) {
      event.preventDefault();
      const commandCompletion = completeDirectionTwoCommand(inputValue);
      const commandOptionCompletion = completeDirectionTwoCommandArgument(inputValue);
      const createFieldCompletion = completeDirectionTwoCreateField(inputValue);

      if (commandCompletion) {
        setInputValue(commandCompletion);
        setInputFeedbackMessage(null);
        sound.play("press");
        setKeyboardStatus(`${commandCompletion.replace(/^\/+/, "")} autocompleted.`);
        return;
      }

      if (commandOptionCompletion) {
        setInputValue(commandOptionCompletion);
        setInputFeedbackMessage(null);
        sound.play("press");
        setKeyboardStatus("Command option autocompleted.");
        return;
      }

      if (createFieldCompletion) {
        setInputValue(createFieldCompletion);
        setInputFeedbackMessage(null);
        sound.play("press");
        setKeyboardStatus("Create field autocompleted.");
      }
    }
  };

  const handleInputValueChange = (nextValue: string) => {
    const createInlineInputError = !flow ? getDirectionTwoCreateInlineInputError(nextValue) : null;
    if (createInlineInputError) {
      nudgeInput(createInlineInputError);
      return;
    }

    setInputValue(nextValue);
    setInputFeedbackMessage(null);
    setHistoryIndex(null);
  };

  const activePrompt = promptFor(flow);
  const completionSuggestion = commandCompletionFor(inputValue, flow);
  useEffect(() => {
    setSlashSuggestionIndex(0);
  }, [inputValue, slashCommandSuggestions.length]);

  const createFieldSuggestion = !completionSuggestion && !flow ? getDirectionTwoInlineGhostText(inputValue) : null;
  const createFieldHint = createFieldSuggestion ? getDirectionTwoCreateHint(inputValue) : null;
  const createFieldPresentation = createFieldSuggestion ? getDirectionTwoInlinePromptPresentation(inputValue) : null;
  const styleGhostChoices = createFieldSuggestion ? getDirectionTwoStyleGhostChoices(inputValue) : null;
  const activePromptPresentation = createPromptPresentationForFlow(flow);
  const visibleCreateFieldSuggestion = inputFeedbackMessage ? null : createFieldSuggestion;
  const visibleCommandCompletion = inputFeedbackMessage ? null : completionSuggestion;
  const visibleGhostCompletionText =
    visibleCommandCompletion && visibleCommandCompletion.startsWith(inputValue)
      ? visibleCommandCompletion.slice(inputValue.length)
      : null;
  const ghostTapCompletion = resolveDirectionTwoGhostTapCompletion(inputValue, Boolean(flow));
  const inlineHint = inputFeedbackMessage ?? createFieldHint;
  const isGuidedPasswordEntry = flow?.type === "create" && flow.step === "password";
  const passwordDisplayValue = passwordRevealIndex === null ? inputValue : passwordSubmissionRef.current;
  const visualInputText = isGuidedPasswordEntry
    ? getDirectionTwoPasswordMask(passwordDisplayValue, passwordRevealIndex ?? passwordDisplayValue.length - 1)
    : inputValue || (creating ? "creating room..." : placeholderFor(flow));
  const visualCreateSegments = !isGuidedPasswordEntry && inputValue
    ? getDirectionTwoCreateVisualSegments(inputValue, passwordRevealIndex ?? undefined)
    : null;
  const hasVisibleInput = Boolean(inputValue) || passwordRevealIndex !== null;
  const slashCommandHoverClass = slashSelectionMode === "pointer"
    ? "hover:bg-[color-mix(in_srgb,var(--color-signal)_10%,transparent)] hover:text-[var(--color-signal)]"
    : "";
  const slashCommandLabelHoverClass = slashSelectionMode === "pointer"
    ? "group-hover:text-[var(--color-signal)]/75"
    : "";
  const handleGhostSuggestionTap = (event: PointerEvent<HTMLElement>) => {
    if (!ghostTapCompletion) return;

    event.preventDefault();
    event.stopPropagation();
    setInputValue(ghostTapCompletion);
    setInputFeedbackMessage(null);
    sound.play("press");
    setKeyboardStatus(
      visibleCommandCompletion
        ? `${ghostTapCompletion.replace(/^\/+/, "")} autocompleted.`
        : "Create field autocompleted.",
    );
    focusInput();
  };

  const handleSlashCommandSuggestionTap = (command: string) => {
    if (slashMenuImmediateCommands.has(command)) {
      executeCommand(command);
      focusInput();
      return;
    }

    const enterAction = resolveDirectionTwoEnterAction(command);
    const nextCommandValue =
      enterAction?.type === "continue-inline" && enterAction.value
        ? enterAction.value
        : command;

    setInputValue(nextCommandValue);
    setInputFeedbackMessage(null);
    setHistoryIndex(null);
    sound.play("press");
    setKeyboardStatus(enterAction?.hint ?? `${command} selected.`);
    focusInput();
  };

  return (
    <main
      className="direction-two-pixel-cursor relative isolate min-h-[100dvh] overflow-x-hidden bg-[var(--background)] px-6 py-5 font-mono text-[var(--foreground)] sm:px-10 sm:py-10"
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
                "--pixel-opacity-peak": String(Math.min(pixel.opacity * 1.38, 1)),
                "--pixel-drift-x": `${pixel.driftX}px`,
                "--pixel-drift-y": `${pixel.driftY}px`,
                "--pixel-field-delay": `${pixel.fieldDelay}s`,
                "--pixel-field-duration": `${pixel.fieldDuration}s`,
                "--pixel-glow-delay": `${pixel.glowDelay}s`,
                "--pixel-glow-duration": `${pixel.glowDuration}s`,
                "--pixel-drift-delay": `${pixel.driftDelay}s`,
                "--pixel-drift-duration": `${pixel.driftDuration}s`,
                "--pixel-glow-strength": `${directionTwoAmbientAtmosphere.glowStrength}px`,
                "--pixel-glow-soft": `${directionTwoAmbientAtmosphere.glowStrength * 0.45}px`,
                "--direction-two-ambient-signal": directionTwoAmbientAtmosphere.signalColor,
                "--direction-two-ambient-glow": directionTwoAmbientAtmosphere.signalGlow,
              } as CSSProperties
            }
          >
            <span className="direction-two-ambient-pixel-core block h-full w-full rounded-[1px]" />
          </span>
        ))}
      </div>
      <p id="direction-two-keyboard-shortcuts" className="sr-only">
        Enter submits a command or answer. Arrow up and arrow down move through command history. Tab autocompletes commands. Escape cancels the current prompt.
      </p>
      <p aria-live="polite" className="sr-only">
        {keyboardStatus}
      </p>

      <section
        aria-describedby="direction-two-keyboard-shortcuts"
        className="relative z-10 mx-auto flex min-h-[calc(100dvh-40px)] w-full max-w-[1120px] flex-col sm:min-h-[calc(100dvh-80px)]"
      >
        <header className="sm:hidden direction-two-mobile-landing flex flex-col gap-3 pb-2 pt-4">
          <div>
            <InkPatternMark
              reducedMotion={prefersReducedMotion}
              shimmerSettings={shimmerSettings}
              shimmerStyle={shimmerStyle}
              showIntro={!hasMarkIntroPlayed && !prefersReducedMotion}
              size="mobile"
              word={directionTwoMarkWords[0]}
            />
          </div>
          <div className="max-w-[360px] space-y-6 text-[12px] leading-[18px] text-[var(--muted-foreground)]">
            <p className="direction-two-intro-copy pt-2">
              {mobileHeadlineText}
            </p>
            <div className="space-y-3 pt-2 text-[12px] leading-[18px] text-[var(--muted-foreground)]">
              {introHighlights.map((item, index) => (
                <DirectionTwoIntroRow
                  key={item.text}
                  pattern={item.icon}
                  reducedMotion={prefersReducedMotion}
                  rowClassName="flex items-center gap-3"
                  shimmerSettings={shimmerSettings}
                  shimmerStyle={shimmerStyle}
                  size="mobile"
                  startDelayMs={420 + index * 55}
                  text={item.mobileText}
                />
              ))}
            </div>
          </div>
        </header>

        <header className="hidden flex-col gap-4 pb-5 pt-5 sm:flex sm:pt-6">
          <div>
            <InkPatternMark
              reducedMotion={prefersReducedMotion}
              shimmerSettings={shimmerSettings}
              shimmerStyle={shimmerStyle}
              showIntro={!hasMarkIntroPlayed && !prefersReducedMotion}
              word={directionTwoMarkWords[0]}
            />
          </div>
          <div className="max-w-[680px] space-y-4 text-[13px] leading-[22px] text-[var(--muted-foreground)] sm:text-[14px]">
            <p className="direction-two-intro-copy pt-5">
              {headlineText}
            </p>
            <div className="space-y-[20px] pt-8 text-[12px] leading-[18px] text-[var(--muted-foreground)] sm:text-[13px]">
              {introHighlights.map((item, index) => (
                <DirectionTwoIntroRow
                  key={item.text}
                  pattern={item.icon}
                  reducedMotion={prefersReducedMotion}
                  rowClassName="flex items-center gap-[16px] text-[13px] leading-[22px] sm:text-[14px]"
                  shimmerSettings={shimmerSettings}
                  shimmerStyle={shimmerStyle}
                  startDelayMs={620 + index * 70}
                  text={item.text}
                />
              ))}
            </div>
          </div>
        </header>

        <div
          className={`direction-two-mobile-terminal sticky bottom-0 mt-auto flex flex-col pb-3 pt-11 transition-[opacity,transform] duration-300 [transition-timing-function:var(--ease-out-strong)] sm:pt-12 ${
            isTerminalVisible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
          }`}
        >
          <div className="flex flex-col gap-2" aria-label="Terminal output">
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

          <div className="relative w-full shrink-0">
            <div
              data-route-composer="landing"
              ref={promptRowRef}
              className={`direction-two-terminal-frame ${lines.length > 0 ? "mt-2 " : ""}${isInputNudging ? "direction-two-input-nudge " : ""}flex min-w-0 flex-col text-[length:var(--route-composer-font-size)] leading-[var(--route-composer-line-height)] text-[var(--foreground)]`}
              style={{
                background: "transparent",
                border: "1px solid color-mix(in srgb, var(--border-light) 92%, var(--accent) 8%)",
                borderRadius: 0,
                padding: "var(--route-composer-frame-padding)",
              }}
            >
              <div
                aria-hidden={slashCommandSuggestions.length === 0}
                className="overflow-hidden transition-[max-height,opacity] duration-200 ease-out motion-reduce:transition-none"
                style={{
                  maxHeight: slashCommandSuggestions.length > 0 ? "240px" : "0px",
                  opacity: slashCommandSuggestions.length > 0 ? 1 : 0,
                  pointerEvents: slashCommandSuggestions.length > 0 ? "auto" : "none",
                }}
              >
                <div
                  aria-label="Slash command suggestions"
                  className="direction-two-slash-menu mb-2 flex w-full flex-col gap-1 pb-2 text-[14px] leading-[24px]"
                  ref={slashMenuRef}
                  role="listbox"
                >
                  {slashCommandSuggestions.map((item, index) => {
                    const selected = slashSuggestionIndex === index;

                    return (
                      <button
                        aria-label={`${item.command} ${item.label}`}
                        aria-selected={selected}
                        className={`group flex min-h-7 w-full items-center gap-2 rounded-[3px] px-2 py-1 text-left font-mono transition-colors duration-150 ${slashCommandHoverClass} ${
                          selected ? "bg-[color-mix(in_srgb,var(--color-signal)_10%,transparent)] text-[var(--color-signal)]" : "bg-transparent text-[var(--foreground)]"
                        }`}
                        key={item.command}
                        onPointerDown={event => event.preventDefault()}
                        onClick={event => {
                          event.stopPropagation();
                          handleSlashCommandSuggestionTap(item.command);
                        }}
                        onMouseEnter={() => {
                          setSlashSelectionMode("pointer");
                          setSlashSuggestionIndex(index);
                          sound.play("hover");
                        }}
                        onMouseMove={() => {
                          setSlashSelectionMode("pointer");
                          setSlashSuggestionIndex(index);
                        }}
                        role="option"
                        type="button"
                      >
                        <span aria-hidden="true" className="w-3 shrink-0 text-[var(--color-signal)]">
                          {selected ? ">" : ""}
                        </span>
                        <span className="shrink-0">{item.command}</span>
                        <span
                          className={`min-w-0 flex-1 truncate text-right transition-colors duration-150 ${slashCommandLabelHoverClass} ${
                            selected ? "text-[var(--color-signal)]/75" : "text-[var(--color-dim)]"
                          }`}
                        >
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="direction-two-terminal-input-row flex min-w-0 items-center">
              <label className="sr-only" htmlFor="terminal-command">{activePrompt}</label>
              <span
                className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap ${
                  activePromptPresentation?.tone === "accent" ? "text-[var(--color-signal)]" : "text-[var(--foreground)]"
                }`}
                aria-hidden="true"
              >
                {activePrompt === "$" ? (
                  <span className="text-[var(--color-signal)]">$</span>
                ) : (
                  <>
                    <span>{">"}</span>
                    {activePromptPresentation && <PromptPixelGlyph pattern={activePromptPresentation.pattern} />}
                    <span>{activePrompt}:</span>
                  </>
                )}
              </span>
              <div className="relative ml-2 min-w-0 flex-1">
                <div ref={inputMirrorRef} className="flex min-h-[24px] min-w-0 items-center overflow-hidden pl-[4px] text-[14px] leading-[24px]">
                {!hasVisibleInput && !creating && (
                  <span aria-hidden="true" className="direction-two-visual-caret mr-px h-[22px] w-[3px] shrink-0 bg-[var(--foreground)]" />
                )}
                {isGuidedPasswordEntry && passwordDisplayValue ? (
                  <span
                    aria-hidden="true"
                    className={
                      passwordFinalShimmer
                        ? "direction-two-password-complete-shimmer shrink-0 whitespace-pre"
                        : passwordRevealIndex !== null
                          ? "direction-two-password-reveal shrink-0 whitespace-pre text-[var(--foreground)]"
                          : "shrink-0 whitespace-pre text-[var(--foreground)]"
                    }
                    key={`password-mask-${passwordRevealIndex ?? "typing"}`}
                  >
                    {visualInputText}
                  </span>
                ) : inputValue && visualCreateSegments ? (
                  <span className="shrink-0 whitespace-pre" aria-hidden="true">
                    {visualCreateSegments.map((segment, index) => (
                      <span
                        className={
                          segment.tone === "topic"
                            ? "text-[var(--color-signal)]"
                            : segment.tone === "password" && passwordFinalShimmer
                              ? "direction-two-password-complete-shimmer"
                              : segment.tone === "password" && passwordRevealIndex !== null
                                ? "direction-two-password-reveal text-[var(--foreground)]"
                              : "text-[var(--foreground)]"
                        }
                        data-create-segment-tone={segment.tone}
                        key={`${segment.tone}-${index}`}
                      >
                        {segment.text}
                      </span>
                    ))}
                  </span>
                ) : (
                  <span
                    aria-hidden="true"
                    className={`shrink-0 whitespace-pre ${
                      inputValue ? "text-[var(--foreground)]" : "text-[var(--color-dim)]"
                    }`}
                  >
                    {visualInputText}
                  </span>
                )}
                {hasVisibleInput && !creating && passwordRevealIndex === null && (
                  <span aria-hidden="true" className="direction-two-visual-caret ml-px h-[22px] w-[3px] shrink-0 bg-[var(--foreground)]" />
                )}
                {visibleGhostCompletionText && (
                  <button
                    aria-label="Autocomplete suggestion"
                    className="relative z-10 ml-0 shrink-0 whitespace-pre bg-transparent p-0 font-mono text-[14px] leading-[24px] text-[var(--foreground)] opacity-[0.38] pointer-events-auto sm:pointer-events-none"
                    onPointerDown={handleGhostSuggestionTap}
                    tabIndex={-1}
                    type="button"
                  >
                    {visibleGhostCompletionText}
                  </button>
                )}
                {inputFeedbackMessage && (
                  <span
                    className="pointer-events-none ml-2 shrink-0 whitespace-pre text-[14px] leading-[24px] text-[var(--color-dim)] opacity-80"
                    id="terminal-inline-hint"
                  >
                    {inputFeedbackMessage}
                  </span>
                )}
                {visibleCreateFieldSuggestion && (
                  <button
                    aria-label="Autocomplete suggestion"
                    className={`relative z-10 ml-2 inline-flex shrink-0 items-center gap-2 whitespace-pre bg-transparent p-0 font-mono text-[14px] leading-[24px] pointer-events-auto sm:pointer-events-none ${
                      createFieldPresentation?.tone === "accent" ? "text-[var(--color-signal)]" : "text-[var(--foreground)]"
                    } opacity-[0.55]`}
                    id="terminal-inline-hint"
                    onPointerDown={handleGhostSuggestionTap}
                    tabIndex={-1}
                    type="button"
                  >
                    {createFieldPresentation && (
                      <span className="inline-flex h-[24px] shrink-0 items-center opacity-80">
                        <PromptPixelGlyph pattern={createFieldPresentation.pattern} />
                      </span>
                    )}
                    {styleGhostChoices ? (
                      <span className="inline-flex items-center gap-3">
                        {styleGhostChoices.map(choice => {
                          const color =
                            choice.id === "surprise"
                              ? `conic-gradient(from 45deg, ${themePreviewColorById.orange}, ${themePreviewColorById.blue}, ${themePreviewColorById.green}, ${themePreviewColorById.purple}, ${themePreviewColorById.orange})`
                              : themePreviewColorById[choice.id];

                          return (
                            <span className="inline-flex items-center gap-1.5" key={choice.selection} aria-label={`${choice.selection}. ${choice.label}`}>
                              <span>{choice.selection}.</span>
                              <span
                                className="inline-block size-[10px] shrink-0 rounded-[1px] border border-current/25"
                                style={{ background: color }}
                              />
                            </span>
                          );
                        })}
                      </span>
                    ) : (
                      <span>{visibleCreateFieldSuggestion}</span>
                    )}
                  </button>
                )}
                </div>
                <input
                  ref={inputRef}
                  aria-describedby={inlineHint ? "terminal-inline-hint" : undefined}
                  aria-label={activePrompt}
                  autoCapitalize="off"
                  autoComplete="off"
                  autoCorrect="off"
                  className="absolute inset-0 h-[24px] w-full appearance-none pt-[0px] pr-[0px] pb-[0px] pl-[4px] font-mono text-[14px] leading-[24px] text-transparent caret-transparent placeholder:text-transparent disabled:cursor-wait disabled:opacity-60"
                  disabled={creating || passwordRevealIndex !== null}
                  id="terminal-command"
                  name="command"
                  onBeforeInput={event => {
                    const insertedText = (event.nativeEvent as InputEvent).data ?? "";
                    const createEditingStep = getDirectionTwoCreateEditingStep(inputValue);
                    if (
                      !flow &&
                      (createEditingStep === "expiry" || createEditingStep === "limit") &&
                      insertedText &&
                      /\D/.test(insertedText)
                    ) {
                      event.preventDefault();
                      nudgeInput(createEditingStep === "expiry" ? "Total time only accepts numbers." : "Member limit only accepts numbers.");
                      return;
                    }

                    if (
                      !flow &&
                      createEditingStep === "password-choice" &&
                      insertedText &&
                      !/^[ynoes]+$/i.test(insertedText)
                    ) {
                      event.preventDefault();
                      nudgeInput("Answer y or n.");
                    }
                  }}
                  onChange={event => {
                    handleInputValueChange(event.target.value);
                    syncInputMirrorScroll();
                  }}
                  onKeyDown={handleInputKeyDown}
                  onKeyUp={syncInputMirrorScroll}
                  onScroll={syncInputMirrorScroll}
                  placeholder=""
                  spellCheck={false}
                  style={{
                    background: "transparent",
                    border: 0,
                    boxShadow: "none",
                    color: "transparent",
                    outline: "none",
                    WebkitTextFillColor: "transparent",
                  }}
                  type={flow?.type === "create" && flow.step === "password" ? "password" : "text"}
                  value={inputValue}
                />
              </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function PromptPixelGlyph({ pattern }: { pattern: string[] }) {
  const columnCount = pattern[0]?.length ?? 0;
  const rowCount = pattern.length;

  return (
    <span
      aria-hidden="true"
      className="grid shrink-0 -translate-y-px gap-[1px]"
      style={{
        gridTemplateColumns: `repeat(${columnCount}, 2px)`,
        gridTemplateRows: `repeat(${rowCount}, 2px)`,
      }}
    >
      {pattern.flatMap((row, rowIndex) =>
        [...row].map((cell, columnIndex) => (
          <span
            className={cell === "1" ? "block size-[2px] bg-current opacity-95" : "block size-[2px] bg-current opacity-[0.12]"}
            key={`${rowIndex}-${columnIndex}`}
          />
        )),
      )}
    </span>
  );
}

function InkPatternMark({
  word,
  reducedMotion,
  shimmerSettings,
  shimmerStyle,
  showIntro,
  size = "desktop",
}: {
  word: string;
  reducedMotion: boolean;
  shimmerSettings: DirectionTwoShimmerSettings;
  shimmerStyle: CSSProperties;
  showIntro: boolean;
  size?: "desktop" | "mobile";
}) {
  const [isMarkShimmering, setIsMarkShimmering] = useState(false);
  const shimmerFrameRef = useRef<number | null>(null);
  const shimmerTimeoutRef = useRef<number | null>(null);
  const markScaleClass =
    size === "mobile"
      ? "[--cell:clamp(3.2px,0.84vw,3.6px)] [--gap:1px] [--letter-gap:4px]"
      : "[--cell:clamp(4.4px,0.62vw,7.8px)] [--gap:clamp(1px,0.14vw,2.2px)] [--letter-gap:clamp(5.5px,0.5vw,10px)]";

  useEffect(() => {
    return () => {
      if (shimmerFrameRef.current !== null) {
        window.cancelAnimationFrame(shimmerFrameRef.current);
      }
      if (shimmerTimeoutRef.current !== null) {
        window.clearTimeout(shimmerTimeoutRef.current);
      }
    };
  }, []);

  function triggerMarkShimmer() {
    if (reducedMotion || typeof window === "undefined") return;
    if (shimmerFrameRef.current !== null) {
      window.cancelAnimationFrame(shimmerFrameRef.current);
    }
    if (shimmerTimeoutRef.current !== null) {
      window.clearTimeout(shimmerTimeoutRef.current);
    }

    setIsMarkShimmering(false);
    shimmerFrameRef.current = window.requestAnimationFrame(() => {
      shimmerFrameRef.current = null;
      setIsMarkShimmering(true);
      shimmerTimeoutRef.current = window.setTimeout(() => {
        shimmerTimeoutRef.current = null;
        setIsMarkShimmering(false);
      }, Math.max(
        shimmerSettings.durationMs + shimmerSettings.delayMaxMs + shimmerSettings.burstTailMs,
        shimmerSettings.titleDurationMs + shimmerSettings.titleDelayMaxMs + shimmerSettings.titleBurstTailMs,
      ));
    });
  }

  return (
    <div
      aria-label={word}
      className={`direction-two-mark relative flex w-fit max-w-full items-start overflow-hidden ${isMarkShimmering ? "direction-two-mark-shimmering" : ""} ${markScaleClass}`}
      onPointerEnter={triggerMarkShimmer}
      role="img"
      style={
        {
          ...shimmerStyle,
          "--mark-intro-shimmer-duration": `${directionTwoMarkMotion.introShimmerMs}ms`,
          "--mark-intro-shimmer-count": directionTwoMarkMotion.introShimmerIterationCount,
          "--mark-hover-shimmer-duration": `${shimmerSettings.durationMs}ms`,
          "--mark-hover-shimmer-count": directionTwoMarkMotion.hoverShimmerIterationCount,
        } as CSSProperties
      }
    >
      <InkPatternMarkLayer
        className={`${showIntro ? "direction-two-mark-layer-entering" : ""} direction-two-mark-word`}
        key={word}
        shimmerDelayMaxMs={shimmerSettings.titleDelayMaxMs}
        word={word}
      />
    </div>
  );
}

function InkPatternMarkLayer({
  word,
  className = "",
  shimmerDelayMaxMs,
}: {
  word: string;
  className?: string;
  shimmerDelayMaxMs: number;
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
          shimmerDelayMaxMs={shimmerDelayMaxMs}
        />
      ))}
    </div>
  );
}

function PixelPatternGrid({
  density = 1,
  pattern,
  letterIndex,
  shimmerDelayMaxMs = directionTwoMarkMotion.markHoverMaxDelayMs,
}: {
  density?: number;
  pattern: string[];
  letterIndex: number;
  shimmerDelayMaxMs?: number;
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
          const shimmerDelay = Math.min(
            shimmerColumn * 10 + rowIndex * 5,
            shimmerDelayMaxMs,
          );

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

function DirectionTwoIntroRow({
  pattern,
  reducedMotion,
  rowClassName,
  shimmerSettings,
  shimmerStyle,
  size = "desktop",
  startDelayMs,
  text,
}: {
  pattern: string[];
  reducedMotion: boolean;
  rowClassName: string;
  shimmerSettings: DirectionTwoShimmerSettings;
  shimmerStyle: CSSProperties;
  size?: "desktop" | "mobile";
  startDelayMs: number;
  text: string;
}) {
  const displayText = useDirectionTwoScrambleText(text, {
    durationMs: introScrambleDurationMs,
    startDelayMs,
    disabled: reducedMotion,
  });

  return (
    <div
      className={`direction-two-intro-row ${rowClassName} ${reducedMotion ? "" : "direction-two-intro-item"}`}
      style={
        reducedMotion
          ? undefined
          : ({
              animationDelay: `${startDelayMs}ms`,
              ...shimmerStyle,
            } as CSSProperties)
      }
    >
      <PixelIcon pattern={pattern} shimmerDelayMaxMs={shimmerSettings.delayMaxMs} size={size} />
      <span>{displayText}</span>
    </div>
  );
}

function PixelIcon({
  pattern,
  shimmerDelayMaxMs = directionTwoMarkMotion.highlightHoverMaxDelayMs,
  size = "desktop",
}: {
  pattern: string[];
  shimmerDelayMaxMs?: number;
  size?: "desktop" | "mobile";
}) {
  const columnCount = pattern[0]?.length ?? 0;
  const rowCount = pattern.length;
  const cellSize = size === "mobile" ? 1.5 : 2;

  return (
    <div
      aria-hidden="true"
      className="direction-two-highlight-icon grid shrink-0 gap-[1px]"
      style={{
        gridTemplateColumns: `repeat(${columnCount}, ${cellSize}px)`,
        gridTemplateRows: `repeat(${rowCount}, ${cellSize}px)`,
      }}
    >
      {pattern.flatMap((row, rowIndex) =>
        [...row].map((cell, columnIndex) => {
          const highlightDelay = Math.min(
            columnIndex * 10 + rowIndex * 6,
            shimmerDelayMaxMs,
          );

          return (
            <span
              className={cell === "1" ? "direction-two-highlight-pixel-active block bg-[var(--color-signal)] opacity-80" : "direction-two-highlight-pixel-idle block bg-[var(--color-border)] opacity-10"}
              key={`${rowIndex}-${columnIndex}`}
              style={
                cell === "1"
                  ? ({
                      height: `${cellSize}px`,
                      width: `${cellSize}px`,
                      "--highlight-shimmer-delay": `${highlightDelay}ms`,
                    } as CSSProperties)
                  : {
                      height: `${cellSize}px`,
                      width: `${cellSize}px`,
                    }
              }
            />
          );
        }),
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
