export const ROOM_OG_WIDTH = 1208;
export const ROOM_OG_HEIGHT = 630;
export const ROOM_OG_DEFAULT_TOPIC = "Private room";

export function normalizeRoomOgTopic(topic) {
  const normalized = typeof topic === "string" ? topic.trim().replace(/\s+/g, " ") : "";
  if (!normalized) return ROOM_OG_DEFAULT_TOPIC;
  return normalized.length > 72 ? `${normalized.slice(0, 69)}...` : normalized;
}

export function formatRoomOgPasswordLabel(hasPassword) {
  return hasPassword ? "password protected" : "no password";
}

export function buildRoomOgTitle(topic) {
  return `${normalizeRoomOgTopic(topic)} - Inkog room`;
}

export function buildRoomOgDescription(room) {
  if (room?.secondsLeft <= 0) return "This Inkog room has expired.";
  const passwordState = formatRoomOgPasswordLabel(Boolean(room?.hasPassword));
  return `Join this ${passwordState} honest chat before it disappears.`;
}

export function buildRoomOgImagePath(roomId) {
  return `/room/${encodeURIComponent(roomId)}/og-image.gif`;
}

export function buildRoomOgFallback(roomId) {
  return {
    id: roomId,
    topic: ROOM_OG_DEFAULT_TOPIC,
    hasPassword: false,
    secondsLeft: -1,
  };
}

export async function fetchRoomOgData(roomId, apiBaseUrl, fetchImpl = fetch) {
  try {
    const response = await fetchImpl(`${apiBaseUrl}/rooms/${encodeURIComponent(roomId)}`, {
      next: { revalidate: 15 },
    });
    if (!response.ok) return buildRoomOgFallback(roomId);
    const room = await response.json();
    return {
      id: typeof room.id === "string" ? room.id : roomId,
      topic: normalizeRoomOgTopic(room.topic),
      hasPassword: Boolean(room.hasPassword),
      secondsLeft: Number.isFinite(room.secondsLeft) ? room.secondsLeft : -1,
    };
  } catch {
    return buildRoomOgFallback(roomId);
  }
}

export function getRoomOgApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:3001/api";
}
