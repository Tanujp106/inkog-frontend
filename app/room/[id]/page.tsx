"use client";

import type { ChangeEvent, CSSProperties, KeyboardEvent as ReactKeyboardEvent, MouseEvent } from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createPortal } from "react-dom";
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
import { buildRoomShareMessage, getRoomTtlMeter } from "@/lib/room-header-ui.mjs";
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
import { copyTextToClipboard } from "@/lib/copy-to-clipboard.mjs";
import { observeMobileViewport } from "@/lib/mobile-viewport.mjs";
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

const ROOM_HEADER_CSS = `
.room-screen { position: relative; }
.room-composer-entry-track::-webkit-scrollbar { display: none; }
.room-header-pixel-icon {
  display: block;
  flex: none;
  fill: currentColor;
  height: 17px;
  width: 17px;
}
.room-topic-trigger {
  appearance: none;
  background: transparent;
  border: 0;
  color: var(--text-muted);
  cursor: default;
  display: block;
  flex: 0 1 auto;
  font: inherit;
  max-width: 100%;
  min-width: 0;
  overflow: hidden;
  padding: 0;
  position: relative;
  text-align: left;
  white-space: nowrap;
}
.room-topic-trigger[data-overflowing="true"] { cursor: pointer; }
.room-topic-trigger:focus-visible { outline: 1px solid var(--accent); outline-offset: -1px; }
.room-topic-static {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.room-topic-moving {
  display: block;
  left: 0;
  position: absolute;
  top: 0;
  visibility: hidden;
  white-space: nowrap;
  width: max-content;
}
.room-topic-trigger[data-active="true"] .room-topic-static { visibility: hidden; }
.room-topic-trigger[data-active="true"] .room-topic-moving {
  animation: room-topic-marquee var(--room-topic-duration) linear infinite;
  visibility: visible;
}
@keyframes room-topic-marquee {
  0%, 10% { transform: translateX(0); }
  45%, 55% { transform: translateX(var(--room-topic-travel)); }
  90%, 100% { transform: translateX(0); }
}
@media (prefers-reduced-motion: reduce) {
  .room-topic-trigger[data-active="true"] {
    overflow-x: auto;
    touch-action: pan-x;
  }
  .room-topic-trigger[data-active="true"] .room-topic-static {
    overflow: visible;
    text-overflow: clip;
    visibility: visible;
    width: max-content;
  }
  .room-topic-trigger[data-active="true"] .room-topic-moving {
    animation: none;
    visibility: hidden;
  }
}
.room-header-roster {
  align-items: center;
  color: var(--text-muted);
  display: inline-flex;
  font: inherit;
  font-size: var(--room-meta-size, 13px);
  gap: 7px;
  min-height: 34px;
  white-space: nowrap;
}
.room-header-roster .room-header-pixel-icon {
  height: 18px;
  width: 16px;
}
.room-header-exit-menu-trigger .room-header-exit-icon-kebab .room-header-pixel-icon {
  color: var(--text);
  height: 14px;
  width: 12px;
}
.room-header-pill,
.room-header-exit {
  align-items: center;
  background: color-mix(in srgb, var(--accent) 10%, var(--bg-2));
  border: 1px solid var(--color-composer-border);
  border-radius: 999px;
  box-sizing: border-box;
  color: var(--text-muted);
  display: inline-flex;
  font-family: inherit;
  font-size: var(--room-meta-size, 13px);
  min-height: 34px;
  white-space: nowrap;
}
.room-header-pill {
  cursor: pointer;
  gap: 7px;
  padding: 0 12px;
}
.room-header-pill--invite {
  background: color-mix(in srgb, var(--accent) 19%, var(--bg-2));
  color: var(--text);
}
.room-header-exit-icon-kebab,
.room-composer-send {
  display: none;
}
.room-header-pill:hover,
.room-header-exit:hover {
  background: color-mix(in srgb, var(--accent) 25%, var(--bg-2));
  color: var(--text);
}
.room-header-exit { position: relative; }
.room-header-exit-primary,
.room-header-exit-menu-trigger {
  align-items: center;
  appearance: none;
  background: transparent;
  border: 0;
  color: inherit;
  cursor: pointer;
  display: inline-flex;
  font: inherit;
  min-height: 32px;
}
.room-header-exit-primary { gap: 7px; padding: 0 12px; }
.room-header-exit-menu-trigger {
  border-left: 1px solid var(--color-composer-border);
  justify-content: center;
  padding: 0 6px;
}
.room-header-exit-menu-trigger.room-header-exit-menu-trigger--guest {
  display: none;
}
.room-header-exit-menu-trigger .room-header-pixel-icon {
  height: 14px;
  width: 14px;
}
.room-header-exit-menu {
  background: var(--bg-3);
  border: 1px solid var(--border);
  border-radius: 3px;
  box-sizing: border-box;
  color: var(--text);
  min-width: 152px;
  padding: 4px;
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  z-index: 30;
}
.room-header-end-action {
  appearance: none;
  background: transparent;
  border: 0;
  border-radius: 2px;
  color: var(--text);
  cursor: pointer;
  display: block;
  font: inherit;
  line-height: 20px;
  padding: 8px 10px;
  text-align: left;
  width: 100%;
}
.room-header-end-action:hover,
.room-header-end-action:focus-visible {
  background: color-mix(in srgb, var(--text) 8%, var(--bg-3));
}
.room-header-menu-end:hover,
.room-header-menu-end:focus-visible {
  color: var(--red);
}
.room-header-end-action.room-header-menu-leave,
.room-header-end-action.room-header-menu-invite {
  display: none;
}
.room-leave-sheet-handle { display: none; }
.room-leave-backdrop {
  align-items: center;
  background: rgba(0, 0, 0, 0.72);
  display: flex;
  inset: 0;
  justify-content: center;
  padding: 16px;
  position: fixed;
  z-index: 100;
}
.room-leave-dialog {
  background: var(--bg-2);
  border: 1px solid var(--color-composer-border);
  border-radius: 6px;
  box-sizing: border-box;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  color: var(--text);
  font-family: "Departure Mono", monospace;
  max-width: 100%;
  padding: 20px;
  width: 360px;
}
.room-leave-eyebrow {
  color: var(--text-muted);
  font-size: 11px;
  margin: 0 0 12px;
}
.room-leave-dialog h2 { font-size: 16px; font-weight: 600; line-height: 24px; margin: 0 0 8px; }
.room-leave-dialog p#room-leave-description { color: var(--text-muted); font-size: 12px; line-height: 20px; margin: 0; }
.room-leave-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 24px; }
.room-leave-actions button {
  appearance: none;
  border: 1px solid var(--color-composer-border);
  border-radius: 4px;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  min-height: 34px;
  padding: 6px 10px;
}
.room-leave-stay { background: transparent; color: var(--text); }
.room-leave-confirm { background: color-mix(in srgb, var(--red) 16%, var(--bg-2)); color: var(--red); }
.room-leave-actions button:hover { border-color: var(--text-muted); }
@media (max-width: 380px) {
  .room-leave-actions { flex-direction: column; }
  .room-leave-actions button { width: 100%; }
}
@media (max-width: 640px), (max-width: 1024px) and (max-height: 500px) {
  html:has(.room-screen),
  body:has(.room-screen) {
    height: 100%;
    overflow: hidden;
  }

  .room-floating-composer {
    --route-composer-inline-gutter: 32px;
    position: absolute !important;
    bottom: max(12px, env(safe-area-inset-bottom)) !important;
  }

  .room-screen {
    --room-composer-input-size: 16px;
    --room-command-description-wrap: normal;
    --room-header-columns: minmax(0, 1fr) auto auto;
    position: fixed;
    top: var(--room-viewport-top, 0px);
    left: 0;
    width: 100%;
    --room-header-divider-display: none;
    --room-header-actions-column: auto;
    --room-header-action-gap: 8px;
    --room-header-status-gap: 2px;
    --room-header-separator-size: 13px;
    --room-ttl-min-width: 0px;
    --room-brand-size: 16px;
    --room-title-size: 16px;
  }

  .room-composer-send {
    align-items: center;
    appearance: none;
    background: transparent;
    border: 1px solid color-mix(in srgb, var(--accent) 35%, var(--bg) 65%);
    border-radius: 3px;
    color: var(--accent);
    cursor: pointer;
    display: inline-flex;
    flex: none;
    height: 28px;
    justify-content: center;
    margin-left: 8px;
    padding: 0;
    width: 28px;
  }

  .room-composer-send svg {
    display: block;
    fill: currentColor;
    height: 16px;
    width: 16px;
  }

  .room-composer-send:disabled {
    cursor: default;
    opacity: 0.4;
    pointer-events: none;
  }

  .room-header-pill--invite {
    display: none;
  }

  .room-header-exit,
  .room-header-exit:hover {
    background: transparent;
    border: 0;
    border-radius: 0;
    justify-content: center;
    min-height: 0;
    min-width: 0;
  }

  .room-header-exit-primary {
    display: none;
  }

  .room-header-exit-menu-trigger,
  .room-header-exit-menu-trigger.room-header-exit-menu-trigger--guest {
    border-left: 0;
    display: inline-flex;
    min-height: 0;
    min-width: 0;
    padding: 4px;
  }

  .room-leave-backdrop {
    align-items: flex-end;
    padding: 0;
  }

  .room-leave-dialog {
    border-bottom: 0;
    border-radius: 16px 16px 0 0;
    max-width: none;
    padding: 12px 16px calc(16px + env(safe-area-inset-bottom));
    width: 100%;
  }

  .room-leave-sheet-handle {
    background: var(--text-dim);
    border-radius: 999px;
    display: block;
    height: 4px;
    margin: 0 auto 16px;
    width: 36px;
  }

  .room-leave-actions {
    flex-direction: column;
  }

  .room-leave-actions button {
    width: 100%;
  }

  .room-header-exit-icon-chevron {
    display: none;
  }

  .room-header-exit-icon-kebab {
    display: block;
  }

  .room-header-end-action.room-header-menu-leave,
  .room-header-end-action.room-header-menu-invite {
    display: flex;
  }
}
`;

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
      makeMessage("stress-message-04", "system", "37 more people joined", 46, true),
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

function clearStoredToken(roomId: string) {
  if (typeof window === "undefined" || typeof window.localStorage?.removeItem !== "function") return;
  window.localStorage.removeItem(`token_${roomId}`);
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
  const [isRealtimeReady, setIsRealtimeReady] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [composerStatus, setComposerStatus] = useState<ComposerStatus | null>(null);
  const [pendingCommand, setPendingCommand] = useState<PendingComposerCommand>(null);
  const [passwordReveal, setPasswordReveal] = useState<PasswordReveal | null>(null);
  const [slashSuggestionIndex, setSlashSuggestionIndex] = useState(0);
  const [shareCopied, setShareCopied] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const composerRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const composerTrackRef = useRef<HTMLDivElement | null>(null);
  const roomShellRef = useRef<HTMLElement | null>(null);
  const composerFormRef = useRef<HTMLFormElement | null>(null);
  const slashMenuRef = useRef<HTMLDivElement | null>(null);
  const tabFocusPendingRef = useRef(false);
  const [isComposerTabFocused, setIsComposerTabFocused] = useState(false);
  const transcriptViewportRef = useRef<HTMLElement | null>(null);
  const shouldFollowTranscriptRef = useRef(true);
  const soundRef = useRef(sound);
  const composerStatusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shareCopiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousSecondsLeftRef = useRef<number | null>(null);
  const pendingPollRequestRef = useRef<ReturnType<typeof createPendingRoomPollRequest> | null>(null);
  const reconnectErrorReportedRef = useRef(false);
  const ttlTotalSecondsRef = useRef(0);

  const focusComposer = () => {
    requestAnimationFrame(() => {
      const input = composerRef.current;
      if (!input) return;

      tabFocusPendingRef.current = false;
      setIsComposerTabFocused(false);
      input.focus({ preventScroll: true });
      input.setSelectionRange(input.value.length, input.value.length);
    });
  };

  useEffect(() => {
    const shell = roomShellRef.current;
    if (!shell) return;

    return observeMobileViewport({
      window,
      mediaQuery: "(max-width: 640px), (max-width: 1024px) and (max-height: 500px)",
      isFocused: () => document.activeElement === composerRef.current,
      onChange: metrics => {
        if (!metrics) {
          shell.style.removeProperty("--room-viewport-height");
          shell.style.removeProperty("--room-viewport-top");
          return;
        }
        shell.style.setProperty("--room-viewport-height", `${metrics.height}px`);
        shell.style.setProperty("--room-viewport-top", `${metrics.top}px`);
        if (shouldFollowTranscriptRef.current && transcriptViewportRef.current) {
          transcriptViewportRef.current.scrollTop = transcriptViewportRef.current.scrollHeight;
        }
      },
    });
  }, []);

  useEffect(() => {
    const shell = roomShellRef.current;
    const form = composerFormRef.current;
    if (!shell || !form) return;
    const reserveComposerSpace = () => {
      const formBounds = form.getBoundingClientRect();
      const bottomGap = Math.max(0, shell.getBoundingClientRect().bottom - formBounds.bottom);
      shell.style.setProperty("--room-composer-reserve", `${Math.ceil(formBounds.height + bottomGap + 12)}px`);
      const transcriptViewport = transcriptViewportRef.current;
      if (transcriptViewport && shouldFollowTranscriptRef.current) transcriptViewport.scrollTop = transcriptViewport.scrollHeight;
    };
    const observer = new ResizeObserver(reserveComposerSpace);
    observer.observe(form);
    observer.observe(shell);
    reserveComposerSpace();
    return () => observer.disconnect();
  }, [stage, routeHandoffState.phase]);

  useEffect(() => {
    const trackTabNavigation = (event: KeyboardEvent) => {
      tabFocusPendingRef.current = event.key === "Tab";
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Tab" || stage !== "joined" || event.defaultPrevented || event.isComposing) return;
      if (event.metaKey || event.ctrlKey || event.altKey || event.key.length !== 1) return;

      const target = event.target;
      const isEditableTarget = target instanceof HTMLInputElement
        || target instanceof HTMLTextAreaElement
        || target instanceof HTMLSelectElement
        || (target instanceof HTMLElement && target.isContentEditable)
        || (target instanceof Element && Boolean(target.closest('[role="textbox"]')));
      if (isEditableTarget) return;

      const isInteractiveTarget = target instanceof Element
        && Boolean(target.closest('button, a[href], [role="button"], [role="link"]'));
      if (event.key === " " && isInteractiveTarget) return;

      const input = composerRef.current;
      if (!input || input.disabled) return;

      event.preventDefault();
      setIsComposerTabFocused(false);
      setComposerValue(current => `${current}${event.key}`);
      input.focus({ preventScroll: true });
      requestAnimationFrame(() => {
        const currentInput = composerRef.current;
        currentInput?.setSelectionRange(currentInput.value.length, currentInput.value.length);
      });
    };

    const handlePointerDown = () => {
      tabFocusPendingRef.current = false;
      setIsComposerTabFocused(false);
    };

    document.addEventListener("keydown", trackTabNavigation, true);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => {
      document.removeEventListener("keydown", trackTabNavigation, true);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [stage]);

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
    if (composerStatusTimeoutRef.current) {
      clearTimeout(composerStatusTimeoutRef.current);
      composerStatusTimeoutRef.current = null;
    }
    if (tone === "error") {
      setComposerStatus(null);
      appendEvent("error", message);
      return;
    }
    setComposerStatus({ message, tone });
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

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    transcriptViewport.scrollTo({ top: transcriptViewport.scrollHeight, behavior: reducedMotion ? "auto" : "smooth" });
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
    reconnectErrorReportedRef.current = false;
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
      if (reconnectErrorReportedRef.current) return;
      reconnectErrorReportedRef.current = true;
      soundRef.current.play("error");
      appendEvent("error", "Chat is reconnecting. Your messages will catch up in a moment.");
    });

    socket.on("join_room_success", ({ onlineCount, roomUsers }: { onlineCount: number; roomUsers: string[] }) => {
      reconnectErrorReportedRef.current = false;
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
      if (message === "This room is already open in another tab. Pick up where you left off there.") {
        socket.disconnect();
        socketRef.current = null;
        setIsRealtimeReady(false);
      }

      if (pendingPollRequestRef.current) {
        pendingPollRequestRef.current = null;
        appendEvent("error", `That poll didn't go through: ${message}`);
      } else {
        appendEvent("error", message);
      }
      soundRef.current.play("error");
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
          cancelRoomHandoff();
          router.replace(`/?join=${encodeURIComponent(roomId)}`);
          return;
        }

        let joinData: JoinRoomData;
        try {
          joinData = await doJoin();
        } catch (err: unknown) {
          const e = err as { status?: number; message?: string };
          if (roomData.hasPassword && e.status === 403) {
            clearStoredToken(roomId);
            cancelRoomHandoff();
            router.replace(`/?join=${encodeURIComponent(roomId)}`);
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

  const printHelp = (commandType = "commands") => {
    const base = "commands: /commands /style /sound /poll /share /leave /exit";
    const creator = isCreator ? " /password /close" : "";
    setComposerStatusMessage(
      commandType === "commands" ? `${base}${creator}` : `try ${base}${creator}`,
      "muted",
    );
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
  const pollInlinePrompt = !isRoomBooting && !isPasswordGate && pendingCommand?.type === "poll" ? getRoomPollInlinePrompt(pendingCommand) : null;
  const isCommandEntry = Boolean(pendingCommand) || composerValue.trimStart().startsWith("/");
  const showIdleCursor = composerValue.length === 0 && !pollInlinePrompt;
  const soundCommandHint = /^\/sound(?:\s|$)/i.test(composerValue)
    ? { message: "sound: on / off / status", tone: "muted" as const }
    : null;
  const visibleComposerStatus = soundCommandHint ?? composerStatus;
  const composerChrome = getRoomComposerChrome({
    composerStatus: isRoomBooting || isPasswordGate ? null : visibleComposerStatus,
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
    visibleComposerStatus?.tone === "error"
      ? "var(--red)"
      : visibleComposerStatus?.tone === "accent"
        ? "var(--room-accent-text)"
        : "var(--text-muted)";
  useLayoutEffect(() => {
    const field = composerRef.current;
    if (!(field instanceof HTMLTextAreaElement)) return;
    field.style.height = "24px";
    field.style.overflowY = "hidden";
    if (isCommandEntry) return;

    const maxHeight = 168;
    field.style.height = `${Math.min(field.scrollHeight, maxHeight)}px`;
    field.style.overflowY = field.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [composerValue, isCommandEntry, stage]);

  useLayoutEffect(() => {
    if (!pollInlinePrompt) return;
    const track = composerTrackRef.current;
    if (track) track.scrollLeft = track.scrollWidth - track.clientWidth;
  }, [pollInlinePrompt?.prefix, composerValue]);

  const handleComposerKeyDown = (event: ReactKeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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

    const cancelActiveCommand = !isPasswordGate && !passwordReveal && (
      (event.key === "Escape" && Boolean(pendingCommand || composerValue))
      || (Boolean(pendingCommand) && !composerValue && Boolean(slashCommandDeletionDirection))
    );
    if (cancelActiveCommand) {
      event.preventDefault();
      event.stopPropagation();
      setPendingCommand(null);
      setComposerValue("");
      clearComposerStatus();
      setSlashSuggestionIndex(0);
      sound.play("close");
      return;
    }

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

    if (showSlashSuggestions) {
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

      if (event.key === "Enter") {
        event.preventDefault();
        runSlashSuggestion(slashSuggestions[slashSuggestionIndex]?.command ?? slashSuggestions[0].command);
        return;
      }
    }

    if (event.currentTarget instanceof HTMLTextAreaElement && event.key === "Enter" && !event.nativeEvent.isComposing) {
      if (isCommandEntry || !event.shiftKey) {
        event.preventDefault();
        if (!event.shiftKey) runComposer();
      }
    }
  };

  const composerFieldProps = {
    autoCapitalize: "off",
    autoComplete: "off",
    autoCorrect: "off",
    "aria-activedescendant": showSlashSuggestions ? `room-slash-option-${slashSuggestionIndex}` : undefined,
    "aria-autocomplete": isPasswordGate ? undefined : "list",
    "aria-describedby": "room-composer-status",
    "aria-expanded": isPasswordGate ? undefined : showSlashSuggestions,
    "aria-controls": isPasswordGate ? undefined : "room-slash-command-suggestions",
    enterKeyHint: isPasswordGate ? "go" : "send",
    id: "room-terminal-input",
    onBlur: () => setIsComposerTabFocused(false),
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setComposerValue(event.target.value);
      setSlashSuggestionIndex(0);
    },
    onFocus: () => {
      setIsComposerTabFocused(tabFocusPendingRef.current);
      tabFocusPendingRef.current = false;
    },
    onKeyDown: handleComposerKeyDown,
    spellCheck: false,
    disabled: stage !== "joined" && stage !== "password",
    placeholder: isRoomBooting ? "opening chat" : isPasswordGate ? "write password" : pollInlinePrompt?.placeholder,
    role: isPasswordGate ? undefined : "combobox",
    value: composerValue,
  } as const;

  useEffect(() => {
    setSlashSuggestionIndex(index => {
      if (!showSlashSuggestions) return 0;
      return Math.min(index, Math.max(slashSuggestions.length - 1, 0));
    });
  }, [showSlashSuggestions, slashSuggestions.length]);

  useEffect(() => {
    if (!showSlashSuggestions) return;
    const menu = slashMenuRef.current;
    if (!menu) return;
    let frame = 0;
    const keepSelectedVisible = () => {
      frame = 0;
      const selected = menu.querySelector<HTMLElement>(`#room-slash-option-${slashSuggestionIndex}`);
      if (!selected) return;
      const menuBounds = menu.getBoundingClientRect();
      const selectedBounds = selected.getBoundingClientRect();
      if (selectedBounds.top < menuBounds.top) menu.scrollTop += selectedBounds.top - menuBounds.top;
      else if (selectedBounds.bottom > menuBounds.bottom) menu.scrollTop += selectedBounds.bottom - menuBounds.bottom;
    };
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(keepSelectedVisible); };
    const observer = new ResizeObserver(schedule);
    observer.observe(menu);
    schedule();
    return () => {
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [showSlashSuggestions, slashSuggestionIndex]);

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
      ref={roomShellRef}
      style={styles.roomShell}
    >
      <style>{ROOM_HEADER_CSS}</style>
      <header className="room-sticky-header" style={{ ...styles.roomHeader, ...getRoomPartStyle(roomId, "header") }}>
        <div style={styles.roomHeaderInner}>
          <div style={styles.headerIdentity}>
            <h1 style={styles.roomName} title={`inkog / ${topic}`}>
              <span style={styles.roomBrand}>inkog</span>
              <span style={styles.roomNameDivider}>/</span>
              <RoomTopicTitle topic={topic} />
            </h1>
          </div>
          <div style={styles.headerStatus}>
            <RoomTtlMeter meter={ttlMeter} secondsLeft={secondsLeft} totalSeconds={ttlTotalSecondsRef.current} />
            <span aria-hidden="true" style={styles.headerSeparator}>·</span>
            <RoomRosterCount roomUsers={roomUsers} />
          </div>
          <span aria-hidden="true" style={styles.headerDivider} />
          <div style={styles.headerActions}>
            <button
              aria-label="Copy room invite"
              className="room-header-pill room-header-pill--invite"
              onClick={() => void copyShareLinkFromButton()}
              onMouseEnter={() => sound.play("hover")}
              type="button"
            >
              <RoomHeaderPixelIcon kind="invite" />
              <span>{shareCopied ? "copied!" : "Invite"}</span>
            </button>
            {shareCopied ? <span aria-live="polite" role="status" style={styles.srOnly}>Room link copied.</span> : null}
            <RoomExitActions
              isCreator={isCreator}
              onEndRoom={closeRoom}
              onHover={() => sound.play("hover")}
              onInvite={() => void copyShareLinkFromButton()}
              onLeave={handleLeave}
            />
          </div>
        </div>
      </header>

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
        className="room-floating-composer"
        ref={composerFormRef}
        onSubmit={event => {
          event.preventDefault();
          runComposer();
        }}
        style={{ ...styles.composer, ...composerStyle, ...getRoomPartStyle(roomId, "composer") }}
      >
        <div
          data-route-composer="room"
          data-tab-focused={isComposerTabFocused ? "true" : undefined}
          onClick={event => {
            if (event.target instanceof Element && event.target.closest('input, textarea, [role="option"]')) return;
            tabFocusPendingRef.current = false;
            setIsComposerTabFocused(false);
            composerRef.current?.focus({ preventScroll: true });
          }}
          style={{
            ...styles.composerFrame,
          }}
        >
          <div
            aria-hidden={!showSlashSuggestions}
            aria-label="Room command suggestions"
            id="room-slash-command-suggestions"
            ref={slashMenuRef}
            role="listbox"
            style={{
              ...styles.slashCommandMenu,
              maxHeight: showSlashSuggestions ? "min(220px, max(44px, calc(var(--room-viewport-height, 100dvh) - 200px)))" : "0px",
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
              {composerChrome.statusMode === "inline" ? (visibleComposerStatus?.message ?? "") : ""}
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
            <div className="room-composer-entry-track" ref={composerTrackRef} style={styles.composerEntryTrack}>
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
              {isPasswordGate ? (
                <input
                  {...composerFieldProps}
                  ref={node => { composerRef.current = node; }}
                  style={{
                    ...styles.composerInput,
                    caretColor: showIdleCursor ? "transparent" : "var(--text)",
                    color: "var(--room-message-text)",
                  }}
                  type="password"
                />
              ) : (
                <textarea
                  {...composerFieldProps}
                  ref={node => { composerRef.current = node; }}
                  rows={1}
                  style={{
                    ...styles.composerInput,
                    ...styles.composerTextArea,
                    caretColor: showIdleCursor ? "transparent" : "var(--text)",
                    color: "var(--room-message-text)",
                    minWidth: pollInlinePrompt ? "min(160px, 70%)" : 0,
                  }}
                  wrap={isCommandEntry ? "off" : "soft"}
                />
              )}
            </div>
            <button
              aria-label="Send"
              className="room-composer-send"
              disabled={stage !== "joined" && stage !== "password"}
              onMouseEnter={() => sound.play("hover")}
              type="submit"
            >
              <svg aria-hidden="true" viewBox="0 0 16 16">
                <path d="M2.25 7.35 13.75 2.65 10.65 12.75 7.6 8.7Z" />
              </svg>
            </button>
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

const roomHeaderPixelPatterns = {
  people: ["..###..", ".#...#.", ".#.#.#.", ".#...#.", "..###..", ".#...#.", "#.....#", "#.....#"],
  invite: [".........", "..###....", ".#...#...", ".#..###..", "..###..#.", "...#...#.", "....###..", "........."],
  leave: ["######...", "#....#...", "#....#.#.", "#......##", "#.......#", "#......##", "#....#.#.", "#....#...", "######..."],
  chevron: [".......", ".......", ".#...#.", "..#.#..", "...#...", ".......", "......."],
  kebab: ["..##...", "..##...", ".......", "..##...", "..##...", ".......", "..##...", "..##..."],
} as const;

function RoomHeaderPixelIcon({ kind }: { kind: keyof typeof roomHeaderPixelPatterns }) {
  const pattern = roomHeaderPixelPatterns[kind];
  return (
    <svg
      aria-hidden="true"
      className="room-header-pixel-icon"
      fill="currentColor"
      focusable="false"
      height="17"
      shapeRendering="crispEdges"
      viewBox={`0 0 ${pattern[0].length * 4 + 1} ${pattern.length * 4 + 1}`}
      width="17"
      xmlns="http://www.w3.org/2000/svg"
    >
      {pattern.flatMap((row, y) =>
        [...row].map((pixel, x) => pixel === "#" ? (
          <rect className="room-header-pixel" height="3" key={`${x}-${y}`} width="3" x={1 + x * 4} y={1 + y * 4} />
        ) : null)
      )}
    </svg>
  );
}

function RoomTopicTitle({ topic }: { topic: string }) {
  const viewportRef = useRef<HTMLButtonElement | null>(null);
  const fullTextRef = useRef<HTMLSpanElement | null>(null);
  const [overflow, setOverflow] = useState(0);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const viewport = viewportRef.current;
    const fullText = fullTextRef.current;
    if (!viewport || !fullText) return;

    let mounted = true;
    const measure = () => {
      if (!mounted) return;
      const nextOverflow = Math.max(0, Math.ceil(fullText.scrollWidth - viewport.clientWidth));
      setOverflow(nextOverflow);
      if (nextOverflow === 0) setIsActive(false);
    };
    setIsActive(false);
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(fullText);
    measure();
    void document.fonts?.ready.then(measure);
    return () => {
      mounted = false;
      observer.disconnect();
    };
  }, [topic]);

  const isOverflowing = overflow > 1;
  const duration = Math.max(7, overflow / 25 + 4);
  return (
    <button
      aria-label={isOverflowing ? `Room name: ${topic}. ${isActive ? "Stop scrolling" : "Scroll to read full name"}.` : `Room name: ${topic}`}
      aria-pressed={isActive}
      className="room-topic-trigger"
      data-active={isActive && isOverflowing}
      data-overflowing={isOverflowing}
      onClick={() => {
        if (!isOverflowing) return;
        if (isActive) viewportRef.current?.scrollTo({ left: 0 });
        setIsActive(active => !active);
      }}
      ref={viewportRef}
      style={{
        "--room-topic-duration": `${duration}s`,
        "--room-topic-travel": `-${overflow}px`,
      } as CSSProperties}
      tabIndex={isOverflowing ? 0 : -1}
      title={topic}
      type="button"
    >
      <span className="room-topic-static">{topic}</span>
      <span aria-hidden="true" className="room-topic-moving" ref={fullTextRef}>{topic}</span>
    </button>
  );
}

function RoomRosterCount({ roomUsers }: { roomUsers: string[] }) {
  const countLabel = `${roomUsers.length} ${roomUsers.length === 1 ? "person" : "people"}`;
  return (
    <span className="room-header-roster">
      <RoomHeaderPixelIcon kind="people" />
      <span>{countLabel}</span>
    </span>
  );
}

function RoomExitActions({
  isCreator,
  onEndRoom,
  onHover,
  onInvite,
  onLeave,
}: {
  isCreator: boolean;
  onEndRoom: () => void;
  onHover: () => void;
  onInvite: () => void;
  onLeave: () => void;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<null | "leave" | "end">(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const leaveRef = useRef<HTMLButtonElement | null>(null);
  const stayRef = useRef<HTMLButtonElement | null>(null);
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  const closeLeaveConfirm = () => {
    setConfirmAction(null);
    requestAnimationFrame(() => {
      const leaveButton = leaveRef.current;
      const leaveIsVisible = Boolean(leaveButton && getComputedStyle(leaveButton).display !== "none");
      (leaveIsVisible ? leaveButton : triggerRef.current)?.focus();
    });
  };

  const openLeaveConfirm = () => {
    setIsMenuOpen(false);
    setConfirmAction("leave");
  };

  const openEndConfirm = () => {
    setIsMenuOpen(false);
    setConfirmAction("end");
  };

  useEffect(() => {
    if (!isMenuOpen) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setIsMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setIsMenuOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    if (!confirmAction) return;
    stayRef.current?.focus();
    const handleDialogKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeLeaveConfirm();
      } else if (event.key === "Tab") {
        if (event.shiftKey && document.activeElement === stayRef.current) {
          event.preventDefault();
          confirmRef.current?.focus();
        } else if (!event.shiftKey && document.activeElement === confirmRef.current) {
          event.preventDefault();
          stayRef.current?.focus();
        }
      }
    };
    document.addEventListener("keydown", handleDialogKeyDown);
    return () => document.removeEventListener("keydown", handleDialogKeyDown);
  }, [confirmAction]);

  return (
    <>
      <div className="room-header-exit" ref={menuRef}>
        <button
          aria-label="Leave room"
          className="room-header-exit-primary"
          onClick={openLeaveConfirm}
          onMouseEnter={onHover}
          ref={leaveRef}
          type="button"
        >
          <RoomHeaderPixelIcon kind="leave" />
          <span>Leave</span>
        </button>
        <button
          aria-controls="room-exit-menu"
          aria-expanded={isMenuOpen}
          aria-haspopup="menu"
          aria-label="Room options"
          className={`room-header-exit-menu-trigger${isCreator ? "" : " room-header-exit-menu-trigger--guest"}`}
          onClick={() => setIsMenuOpen(open => !open)}
          onMouseEnter={onHover}
          ref={triggerRef}
          type="button"
        >
          <span className="room-header-exit-icon-chevron">
            <RoomHeaderPixelIcon kind="chevron" />
          </span>
          <span className="room-header-exit-icon-kebab">
            <RoomHeaderPixelIcon kind="kebab" />
          </span>
        </button>
        {isMenuOpen ? (
          <div aria-label="Room options" className="room-header-exit-menu" id="room-exit-menu" role="menu">
            <button
              className="room-header-end-action room-header-menu-invite"
              onClick={() => {
                setIsMenuOpen(false);
                onInvite();
              }}
              role="menuitem"
              type="button"
            >
              <span>Invite</span>
            </button>
            <button
              className="room-header-end-action room-header-menu-leave"
              onClick={openLeaveConfirm}
              role="menuitem"
              type="button"
            >
              <span>Leave</span>
            </button>
            {isCreator ? (
              <button
                className="room-header-end-action room-header-menu-end"
                onClick={openEndConfirm}
                role="menuitem"
                type="button"
              >
                <span>End room</span>
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      {confirmAction ? createPortal(
        <div
          className="room-leave-backdrop"
          onPointerDown={event => {
            if (event.target === event.currentTarget) closeLeaveConfirm();
          }}
        >
          <div
            aria-describedby="room-leave-description"
            aria-labelledby="room-leave-title"
            aria-modal="true"
            className="room-leave-dialog"
            role="dialog"
          >
            <span aria-hidden="true" className="room-leave-sheet-handle" />
            <p className="room-leave-eyebrow">Room action</p>
            <h2 id="room-leave-title">{confirmAction === "end" ? "Close this room?" : "Leave this room?"}</h2>
            <p id="room-leave-description">
              {confirmAction === "end"
                ? "This closes the room for everyone and cannot be undone."
                : "You’ll return to the home screen. This room will stay open."}
            </p>
            <div className="room-leave-actions">
              <button className="room-leave-stay" onClick={closeLeaveConfirm} ref={stayRef} type="button">Stay here</button>
              <button
                className="room-leave-confirm"
                onClick={() => {
                  const action = confirmAction;
                  setConfirmAction(null);
                  if (action === "end") onEndRoom();
                  else onLeave();
                }}
                ref={confirmRef}
                type="button"
              >
                {confirmAction === "end" ? "Close room" : "Leave room"}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      ) : null}
    </>
  );
}

function RoomTtlMeter({
  meter,
  secondsLeft,
  totalSeconds,
}: {
  meter: ReturnType<typeof getRoomTtlMeter>;
  secondsLeft: number;
  totalSeconds: number;
}) {
  const meterColor = meter.warning ? "var(--red)" : "var(--accent)";
  const timeColor = meter.warning ? "var(--red)" : "var(--room-accent-text)";
  const remainingSeconds = Math.max(0, Math.floor(secondsLeft));
  const turns = Math.max(0, Math.ceil(Math.max(totalSeconds, remainingSeconds) / 6) - Math.ceil(remainingSeconds / 6));
  const isInverted = turns % 2 === 1;
  const movedSand = Math.min(4, (6 - remainingSeconds % 6) % 6);
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
        style={{
          color: timeColor,
          transform: `rotate(${turns * 180}deg)`,
        }}
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
            <rect
              className="room-ttl-hourglass-pixel"
              height="3"
              key={`${column}-${row}`}
              style={{ "--highlight-shimmer-delay": `${column * 10 + row * 6}ms` } as CSSProperties}
              width="3"
              x={1 + column * 4}
              y={1 + row * 4}
            />
          ))}
        </g>
        {[[3, 2], [2, 1], [4, 1], [3, 1]].map(([column, row], index) => (
          <rect
            className="room-ttl-hourglass-pixel room-ttl-hourglass-sand"
            height="3"
            key={`top-${column}-${row}`}
            style={{
              opacity: isInverted ? Number(index >= 4 - movedSand) : Number(index >= movedSand),
              "--highlight-shimmer-delay": `${column * 10 + row * 6}ms`,
            } as CSSProperties}
            width="3"
            x={1 + column * 4}
            y={1 + row * 4}
          />
        ))}
        {[[3, 6], [2, 6], [4, 6], [3, 5]].map(([column, row], index) => (
          <rect
            className="room-ttl-hourglass-pixel room-ttl-hourglass-sand"
            height="3"
            key={`bottom-${column}-${row}`}
            style={{
              opacity: isInverted ? Number(index < 4 - movedSand) : Number(index < movedSand),
              "--highlight-shimmer-delay": `${column * 10 + row * 6}ms`,
            } as CSSProperties}
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
    height: "var(--room-viewport-height, 100dvh)",
    isolation: "isolate",
    overscrollBehavior: "none",
    overflow: "hidden",
  },
  roomHeader: {
    borderBottom: "1px solid color-mix(in srgb, var(--text-dim) 28%, transparent)",
    flexShrink: 0,
    padding: "var(--room-header-padding, 12px clamp(32px, calc(3vw + 16px), 48px))",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  roomHeaderInner: {
    alignItems: "center",
    columnGap: "var(--room-header-gap, 24px)",
    display: "grid",
    gridTemplateColumns: "var(--room-header-columns, minmax(0, 1fr) auto 1px auto)",
    margin: "0 auto",
    maxWidth: "1200px",
    minHeight: "40px",
    rowGap: "10px",
    width: "100%",
  },
  headerIdentity: {
    alignItems: "center",
    display: "flex",
    gap: "10px",
    minWidth: 0,
  },
  roomName: {
    fontSize: "var(--room-title-size, var(--room-meta-size, 13px))",
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
  headerStatus: {
    alignItems: "center",
    display: "inline-flex",
    gap: "var(--room-header-status-gap, 12px)",
    whiteSpace: "nowrap",
  },
  headerSeparator: {
    color: "var(--text-dim)",
    fontSize: "var(--room-header-separator-size, 20px)",
    lineHeight: 1,
  },
  headerDivider: {
    alignSelf: "center",
    background: "var(--text-dim)",
    display: "var(--room-header-divider-display, block)",
    height: "28px",
    opacity: 0.65,
    width: "1px",
  },
  headerActions: {
    alignItems: "center",
    display: "inline-flex",
    gap: "var(--room-header-action-gap, 12px)",
    gridColumn: "var(--room-header-actions-column, auto)",
    justifySelf: "end",
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
    gap: "3px",
    height: "32px",
    justifyContent: "center",
    minWidth: "var(--room-ttl-min-width, 56px)",
    padding: 0,
    position: "relative",
    whiteSpace: "nowrap",
  },
  ttlTime: {
    fontSize: "var(--room-meta-size, 13px)",
    minWidth: "var(--room-ttl-min-width, 56px)",
    textAlign: "left",
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
    width: "min(280px, calc(100vw - 32px))",
    zIndex: 20,
  },
  transcript: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    minHeight: 0,
    gap: "6px",
    overscrollBehaviorY: "contain",
    overflowY: "auto",
    padding: "var(--room-transcript-top-padding, 24px) 0 var(--room-composer-reserve, 96px)",
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
    color: "var(--accent)",
    fontSize: "var(--room-poll-question-size, 18px)",
    fontWeight: 600,
    lineHeight: "26px",
    margin: "0 0 var(--room-poll-question-gap, 18px)",
    overflowWrap: "anywhere",
    paddingTop: "var(--room-poll-question-padding-top, 0px)",
  },
  pollOptions: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    marginLeft: "var(--room-poll-options-margin-left, 0px)",
  },
  pollOption: {
    alignItems: "center",
    backgroundColor: "transparent",
    border: 0,
    borderRadius: 0,
    boxSizing: "border-box",
    cursor: "pointer",
    display: "grid",
    gridTemplateColumns: "var(--room-poll-option-columns, 18px 26px minmax(0, 1fr) clamp(88px, 18vw, 132px) 30px)",
    fontFamily: ROOM_FONT_FAMILY,
    fontSize: "var(--room-body-size, 14px)",
    gap: "8px",
    lineHeight: "var(--room-body-line-height, 24px)",
    minHeight: "34px",
    padding: "var(--room-poll-option-padding, 0 12px)",
    textAlign: "left",
    transition: "color 0.15s ease, opacity 0.15s ease, background-color 0.15s ease",
    width: "100%",
  },
  pollOptionLabel: {
    boxSizing: "border-box",
    minWidth: 0,
    overflowWrap: "anywhere",
    paddingLeft: "4px",
    whiteSpace: "normal",
  },
  pollOptionMarker: {
    color: "var(--accent)",
    display: "var(--room-poll-option-marker-display, inline)",
    flexShrink: 0,
    textAlign: "center",
    width: "18px",
  },
  pollOptionIndex: {
    color: "var(--text-dim)",
    flexShrink: 0,
    textAlign: "var(--room-poll-option-index-align, right)",
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
    overflowY: "auto",
    overscrollBehaviorY: "contain",
    pointerEvents: "auto",
    paddingBottom: "8px",
    transition: "max-height 200ms ease-out, opacity 200ms ease-out",
    width: "100%",
    willChange: "opacity",
  },
  slashCommandItem: {
    flexShrink: 0,
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
    whiteSpace: "var(--room-command-description-wrap, nowrap)",
  },
  composerRow: {
    alignItems: "center",
    display: "flex",
    gap: "8px",
    minHeight: "24px",
    width: "100%",
  },
  composerEntryTrack: {
    alignItems: "center",
    display: "flex",
    flex: 1,
    gap: "8px",
    minWidth: 0,
    overflowX: "auto",
    overflowY: "hidden",
    scrollbarWidth: "none",
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
    fontSize: "var(--room-composer-input-size, 14px)",
    lineHeight: "24px",
    minWidth: 0,
    padding: "0 0 0 4px",
  },
  composerTextArea: {
    boxSizing: "border-box",
    height: "24px",
    maxHeight: "168px",
    resize: "none",
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
