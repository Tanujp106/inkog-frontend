export const systemSoundStorageKey = "inkog-system-sound-muted";

const usageMessage = "usage: /sound on, /sound off, or /sound status";

export function parseSystemSoundCommand(rawCommand) {
  const normalized = rawCommand.trim().toLowerCase().replace(/^\/+/, "");
  const [name = "", action = "status", ...rest] = normalized.split(/\s+/);

  if (name !== "sound" || rest.length > 0) {
    return {
      type: "invalid",
      message: usageMessage,
    };
  }

  if (action === "on") {
    return {
      type: "set",
      muted: false,
    };
  }

  if (action === "off") {
    return {
      type: "set",
      muted: true,
    };
  }

  if (action === "status") {
    return {
      type: "status",
    };
  }

  return {
    type: "invalid",
    message: usageMessage,
  };
}

export function formatSystemSoundStatus(muted) {
  return muted ? "sound: off" : "sound: on";
}

export function readSystemSoundMuted(storage) {
  if (!storage || typeof storage.getItem !== "function") return false;
  return storage.getItem(systemSoundStorageKey) === "true";
}

export function writeSystemSoundMuted(storage, muted) {
  if (!storage || typeof storage.setItem !== "function") return;
  storage.setItem(systemSoundStorageKey, muted ? "true" : "false");
}
