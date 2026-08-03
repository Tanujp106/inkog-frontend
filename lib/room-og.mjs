import { getInkogApiBaseUrl } from "./api-config.mjs";

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

export function buildRoomOgTitle() {
  return "Inkog room invite";
}

export function buildRoomOgDescription() {
  return "Join an anonymous, time-bound chat room on Inkog.";
}

export function buildRoomOgImagePath() {
  return "/og-image.png";
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
  return getInkogApiBaseUrl({ nodeEnv: "production" });
}
