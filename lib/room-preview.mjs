export function isExpiredRoomPreview({ nodeEnv = "", search = "" } = {}) {
  if (nodeEnv !== "development") return false;
  return new URLSearchParams(search).get("preview") === "expired";
}
