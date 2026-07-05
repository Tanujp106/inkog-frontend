export const ROOM_PEER_COLOR_THEMES = {
  orange: ["#c39a6b", "#8ea782", "#b48f7b", "#8f9db0", "#a8899f"],
  blue: ["#8ca8c7", "#b59a7a", "#7f9e95", "#9d91b8", "#ba8f88"],
  green: ["#96ab70", "#b4956d", "#809e95", "#9b93b8", "#b38777"],
  purple: ["#a690c8", "#c19b71", "#819fa0", "#8ca5c2", "#b7889d"],
};

export const ROOM_PEER_COLORS = ROOM_PEER_COLOR_THEMES.green;

function hashText(value) {
  let hash = 5381;

  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(index);
  }

  return Math.abs(hash);
}

function resolveRoomPeerPalette(themeId) {
  return ROOM_PEER_COLOR_THEMES[themeId] ?? ROOM_PEER_COLORS;
}

export function buildRoomPeerColorMap(aliases, viewerAlias, themeId = "green") {
  const peers = Array.from(new Set(
    aliases.filter(peerAlias => (
      peerAlias &&
      peerAlias !== viewerAlias &&
      peerAlias.toLowerCase() !== "system"
    )),
  ));
  const palette = resolveRoomPeerPalette(themeId);

  return peers
    .sort((a, b) => hashText(`${viewerAlias}:${a}`) - hashText(`${viewerAlias}:${b}`))
    .reduce((colors, peerAlias, index) => ({
      ...colors,
      [peerAlias]: palette[index % palette.length],
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
