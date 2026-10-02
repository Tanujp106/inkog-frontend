/** Room ids are six base36 characters from the create-room path. */
export function isValidRoomId(roomId) {
  return typeof roomId === "string" && /^[a-z0-9]{6}$/i.test(roomId.trim());
}

/** Extract a room id from a bare code or a shared /room/:id URL. */
export function parseRoomId(value) {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (isValidRoomId(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed, "https://inkog.local");
    const match = url.pathname.match(/^\/room\/([a-z0-9]{6})\/?$/i);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

/**
 * Classify a GET /rooms/:id response into the room page boot outcome.
 * Missing and gone rooms share the expired experience — rooms are ephemeral.
 */
export function resolveRoomLookupOutcome({ ok, status, secondsLeft }) {
  if (!ok) {
    if (status === 404 || status === 410) {
      return { stage: "expired" };
    }

    return {
      stage: "error",
      message: "We couldn't load this room. Try opening it again.",
    };
  }

  if (!Number.isFinite(secondsLeft) || secondsLeft <= 0) {
    return { stage: "expired" };
  }

  return { stage: "ready" };
}

/** Join/API failures that mean the room is gone should match the expired UI. */
export function resolveRoomAccessFailureStage(status) {
  if (status === 404 || status === 410) return "expired";
  return "error";
}
