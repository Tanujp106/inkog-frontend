export function getRoomComposerChrome({ composerStatus, pendingCommand }) {
  const expanded = pendingCommand?.type === "style";

  return {
    expanded,
    statusMode: composerStatus?.message ? (expanded ? "inline" : "overlay") : "hidden",
  };
}
