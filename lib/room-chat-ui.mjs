export const ROOM_PEER_COLOR_THEMES = {
  orange: ["#c39a6b", "#8ea782", "#b48f7b", "#8f9db0", "#a8899f"],
  blue: ["#8ca8c7", "#b59a7a", "#7f9e95", "#9d91b8", "#ba8f88"],
  crimson: ["#d67a86", "#b9878e", "#c18b74", "#a78b9d", "#c57982"],
  purple: ["#a690c8", "#c19b71", "#819fa0", "#8ca5c2", "#b7889d"],
};

export const ROOM_PEER_COLORS = ROOM_PEER_COLOR_THEMES.crimson;

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

export function buildRoomPeerColorMap(aliases, viewerAlias, themeId = "crimson") {
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

export function isRoomReadyForHandoff({
  stage,
  historyHydrated,
  socketJoined,
  passwordGate,
}) {
  return (
    stage === "joined"
    && historyHydrated
    && socketJoined
    && !passwordGate
  );
}
