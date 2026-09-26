const ROOM_PEER_THEME_HUES = {
  orange: 28,
  blue: 208,
  green: 142,
  purple: 282,
  rose: 345,
  amber: 44,
  cyan: 185,
  teal: 163,
  red: 0,
  pink: 320,
  indigo: 235,
  lime: 88,
};
const ROOM_PEER_COLOR_COUNT = 5;

function resolveRoomPeerColor(index, themeId) {
  const themeHue = ROOM_PEER_THEME_HUES[themeId] ?? ROOM_PEER_THEME_HUES.green;
  const hue = (themeHue + index * 137.508) % 360;
  return `hsl(${hue.toFixed(2)} 74% 70%)`;
}

export const ROOM_PEER_COLOR_THEMES = Object.fromEntries(
  Object.keys(ROOM_PEER_THEME_HUES).map(themeId => [
    themeId,
    Array.from({ length: ROOM_PEER_COLOR_COUNT }, (_, index) => resolveRoomPeerColor(index, themeId)),
  ]),
);

export const ROOM_PEER_COLORS = ROOM_PEER_COLOR_THEMES.green;

function hashText(value) {
  let hash = 5381;

  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(index);
  }

  return Math.abs(hash);
}

export function buildRoomPeerColorMap(aliases, viewerAlias, themeId = "green") {
  const peers = Array.from(new Set(
    aliases.filter(peerAlias => (
      peerAlias &&
      peerAlias !== viewerAlias &&
      peerAlias.toLowerCase() !== "system"
    )),
  ));
  return peers
    .sort((a, b) => hashText(`${viewerAlias}:${a}`) - hashText(`${viewerAlias}:${b}`))
    .reduce((colors, peerAlias, index) => ({
      ...colors,
      [peerAlias]: resolveRoomPeerColor(index, themeId),
    }), {});
}

export function classifyRoomMessage(message, viewerAlias) {
  if (message.isSystem) {
    return {
      align: "left",
      kind: "system",
      tone: "muted",
      prefix: "system:",
    };
  }

  if (message.alias === viewerAlias) {
    return {
      align: "left",
      kind: "outgoing",
      tone: "muted",
      prefix: `${message.alias} (you):`,
    };
  }

  return {
    align: "left",
    kind: "incoming",
    tone: "accent",
    prefix: `${message.alias}:`,
  };
}

export function buildRoomGateTranscriptLines({ topic, state }) {
  const roomTopic = topic?.trim() || "this room";

  if (state === "unlocked") {
    return [
      `system: welcome to ${roomTopic}`,
      "system: password accepted",
      "--------",
    ];
  }

  return [
    `system: welcome to ${roomTopic}`,
    "system: write password below to enter chat",
  ];
}

/** @returns {"joined"} */
export function resolveRoomStageAfterAuthenticatedJoin() {
  return "joined";
}

export function isRoomComposerInteractive(stage, isRealtimeReady) {
  if (stage === "password") return true;
  return stage === "joined" && isRealtimeReady;
}
