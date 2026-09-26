export function getSlashCommandTokenDeletionRange(value, selectionStart, selectionEnd, direction) {
  const command = /^\/[a-z][a-z0-9_-]*/i.exec(value);
  if (!command) return null;

  const delimiter = /^(?:\s*\/\s*|\s+)/.exec(value.slice(command[0].length))?.[0] ?? "";
  const commandEnd = command[0].length + delimiter.length;
  const start = Math.min(selectionStart ?? value.length, selectionEnd ?? value.length);
  const end = Math.max(selectionStart ?? value.length, selectionEnd ?? value.length);

  if (start === end) {
    const cursorTouchesCommand = direction === "backward"
      ? start > 0 && start <= commandEnd
      : start < commandEnd;

    return cursorTouchesCommand ? { start: 0, end: commandEnd } : null;
  }

  if (start >= commandEnd || end <= 0) return null;

  return {
    start: 0,
    end: Math.max(commandEnd, end),
  };
}
