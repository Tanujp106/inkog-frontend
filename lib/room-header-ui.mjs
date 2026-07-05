const ROOM_ROSTER_LIMIT = 4;

function initialsForAlias(alias) {
  const trimmed = alias.trim();
  if (!trimmed) return "?";

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }

  return trimmed.slice(0, 2).toUpperCase();
}

export function formatRoomCountdown(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "00:00";

  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainder = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

export function getRoomTtlMeter({ secondsLeft, totalSeconds }) {
  const safeTotal = Number.isFinite(totalSeconds) && totalSeconds > 0 ? totalSeconds : secondsLeft;
  const percent = safeTotal > 0
    ? Math.max(0, Math.min(100, Math.round((Math.max(0, secondsLeft) / safeTotal) * 100)))
    : 0;
  const warning = secondsLeft > 0 && secondsLeft < 300;

  return {
    label: "ttl",
    time: formatRoomCountdown(secondsLeft),
    percent,
    warning,
    marker: warning ? "!" : "",
  };
}

export function getRoomRoster(roomUsers) {
  const visible = roomUsers.slice(0, ROOM_ROSTER_LIMIT).map(alias => ({
    alias,
    initials: initialsForAlias(alias),
  }));

  return {
    visible,
    overflow: Math.max(0, roomUsers.length - visible.length),
  };
}
