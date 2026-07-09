const ROOM_PASSWORD_STORAGE_PREFIX = "room_password_";

function getStorage(storage) {
  if (storage) return storage;
  if (typeof window === "undefined") return null;
  return window.localStorage ?? null;
}

export function getStoredRoomPassword(roomId, storage) {
  const targetStorage = getStorage(storage);
  if (!targetStorage || !roomId) return null;

  const value = targetStorage.getItem(`${ROOM_PASSWORD_STORAGE_PREFIX}${roomId}`);
  return value?.trim() || null;
}

export function setStoredRoomPassword(roomId, password, storage) {
  const targetStorage = getStorage(storage);
  const nextPassword = password?.trim();
  if (!targetStorage || !roomId || !nextPassword) return;

  targetStorage.setItem(`${ROOM_PASSWORD_STORAGE_PREFIX}${roomId}`, nextPassword);
}

export function resolveRoomPasswordCommand({ isCreator, password }) {
  if (!isCreator) {
    return {
      ok: false,
      message: "only the creator can view this room password",
    };
  }

  const revealedPassword = password?.trim();
  if (!revealedPassword) {
    return {
      ok: false,
      message: "room password is not stored in this browser",
    };
  }

  return {
    ok: true,
    password: revealedPassword,
    hint: "type c to copy",
  };
}
