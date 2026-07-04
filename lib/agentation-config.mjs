export const DEFAULT_AGENTATION_ENDPOINT = "http://localhost:4747";

export function getAgentationConfig({
  enabled = false,
  endpoint = DEFAULT_AGENTATION_ENDPOINT,
  isMounted,
  nodeEnv,
  pathname,
}) {
  if (nodeEnv !== "development" || !isMounted || !enabled) {
    return null;
  }

  const className = pathname?.startsWith("/room/")
    ? "inkog-agentation-toolbar inkog-agentation-toolbar-room"
    : "inkog-agentation-toolbar";

  return {
    className,
    endpoint,
  };
}
