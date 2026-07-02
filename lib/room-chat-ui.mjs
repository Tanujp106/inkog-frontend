export const ROOM_PEER_COLORS = [
  "#ffb15c",
  "#7cc7ff",
  "#c792ff",
  "#ffde71",
  "#5eead4",
  "#ff8a8a",
  "#c8ff57",
];

function hashText(value) {
  let hash = 5381;

  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(index);
  }

  return Math.abs(hash);
}

export function buildRoomPeerColorMap(aliases, viewerAlias) {
  const peers = Array.from(new Set(
    aliases.filter(peerAlias => (
      peerAlias &&
      peerAlias !== viewerAlias &&
      peerAlias.toLowerCase() !== "system"
    )),
  ));
  const paletteOffset = hashText(viewerAlias || "viewer") % ROOM_PEER_COLORS.length;

  return peers
    .sort((a, b) => hashText(`${viewerAlias}:${a}`) - hashText(`${viewerAlias}:${b}`))
    .reduce((colors, peerAlias, index) => ({
      ...colors,
      [peerAlias]: ROOM_PEER_COLORS[(paletteOffset + index) % ROOM_PEER_COLORS.length],
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
      prefix: "$",
    };
  }

  return {
    align: "left",
    kind: "incoming",
    tone: "accent",
    prefix: `${message.alias}:`,
  };
}
