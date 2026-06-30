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
