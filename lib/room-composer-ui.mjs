export function getRoomComposerChrome({ composerStatus, pendingCommand }) {
  const hasStatus = Boolean(composerStatus?.message);
  const expanded = hasStatus || pendingCommand?.type === "style" || pendingCommand?.type === "poll";
  const statusMode = pendingCommand?.type === "poll" && composerStatus?.tone !== "error"
    ? "hidden"
    : composerStatus?.message
      ? "inline"
      : "hidden";

  return {
    expanded,
    statusMode,
  };
}

export function getRoomSlashCommandSuggestions({ isCreator, query }) {
  if (!query.startsWith("/")) return [];

  const typed = query.slice(1).trim().toLowerCase();
  const suggestions = [
    { id: "poll", command: "/poll", label: "create poll" },
    { id: "style", command: "/style", label: "change color" },
    { id: "sound", command: "/sound", label: "sound settings" },
    { id: "share", command: "/share", label: "copy link" },
    { id: "help", command: "/help", label: "show commands" },
    { id: "leave", command: "/leave", label: "leave room" },
  ];

  if (isCreator) {
    suggestions.unshift({ id: "password", command: "/password", label: "show password" });
    suggestions.push({ id: "close", command: "/close", label: "close chat" });
  }

  suggestions.sort((left, right) => left.command.localeCompare(right.command));

  if (!typed) return suggestions;

  return suggestions.filter(item => item.command.slice(1).startsWith(typed));
}
