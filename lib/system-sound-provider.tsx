"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  readSystemSoundMuted,
  writeSystemSoundMuted,
} from "./system-sound.mjs";
import {
  systemSoundMasterVolume,
  systemSoundSpecs,
} from "./system-sound-profile.mjs";

export type SystemSoundName =
  | "press"
  | "hover"
  | "messageSent"
  | "messageReceived"
  | "success"
  | "error"
  | "close"
  | "incoming"
  | "notify";

type SystemSoundStatus = "locked" | "ready" | "muted" | "unsupported";

type SystemSoundContextValue = {
  muted: boolean;
  play: (name: SystemSoundName) => void;
  setMuted: (nextMuted: boolean) => void;
  status: SystemSoundStatus;
};

type SystemSoundSpec = {
  frequency: number;
  gain: number;
  type?: string;
  duration: number;
  delay?: number;
};

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

const SystemSoundContext = createContext<SystemSoundContextValue>({
  muted: false,
  play: () => {},
  setMuted: () => {},
  status: "locked",
});

function getAudioContextConstructor() {
  if (typeof window === "undefined") return null;
  return window.AudioContext ?? window.webkitAudioContext ?? null;
}

function playOscillator(context: AudioContext, spec: SystemSoundSpec) {
  const startTime = context.currentTime + (spec.delay ?? 0);
  const duration = spec.duration;
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = (spec.type ?? "sine") as OscillatorType;
  oscillator.frequency.setValueAtTime(spec.frequency, startTime);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(Math.max(spec.gain * systemSoundMasterVolume, 0.0001), startTime + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.012);
}

export function SystemSoundProvider({ children }: { children: ReactNode }) {
  const contextRef = useRef<AudioContext | null>(null);
  const [muted, setMutedState] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isUnsupported, setIsUnsupported] = useState(false);

  const ensureAudioContext = useCallback(() => {
    if (muted) return null;
    if (contextRef.current) {
      if (contextRef.current.state === "suspended") {
        void contextRef.current.resume();
      }
      setIsUnlocked(contextRef.current.state !== "closed");
      return contextRef.current;
    }

    const AudioContextConstructor = getAudioContextConstructor();
    if (!AudioContextConstructor) {
      setIsUnsupported(true);
      return null;
    }

    const context = new AudioContextConstructor();
    contextRef.current = context;
    if (context.state === "suspended") {
      void context.resume();
    }
    setIsUnlocked(true);
    return context;
  }, [muted]);

  const play = useCallback(
    (name: SystemSoundName) => {
      if (muted) return;
      const context = ensureAudioContext();
      if (!context || context.state === "closed") return;

      for (const spec of systemSoundSpecs[name]) {
        playOscillator(context, spec);
      }
    },
    [ensureAudioContext, muted],
  );

  const setMuted = useCallback((nextMuted: boolean) => {
    setMutedState(nextMuted);
    if (typeof window !== "undefined") {
      writeSystemSoundMuted(window.localStorage, nextMuted);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setMutedState(readSystemSoundMuted(window.localStorage));
  }, []);

  useEffect(() => {
    if (muted) return;

    const unlock = () => {
      ensureAudioContext();
    };

    window.addEventListener("pointerdown", unlock, { once: true, passive: true });
    window.addEventListener("keydown", unlock, { once: true });

    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [ensureAudioContext, muted]);

  useEffect(() => {
    return () => {
      void contextRef.current?.close();
    };
  }, []);

  const value = useMemo<SystemSoundContextValue>(() => {
    const status = muted ? "muted" : isUnsupported ? "unsupported" : isUnlocked ? "ready" : "locked";
    return {
      muted,
      play,
      setMuted,
      status,
    };
  }, [isUnlocked, isUnsupported, muted, play, setMuted]);

  return (
    <SystemSoundContext.Provider value={value}>
      {children}
    </SystemSoundContext.Provider>
  );
}

export function useSystemSound() {
  return useContext(SystemSoundContext);
}
