export const commands = ["create", "join", "help", "clear", "style", "sound"];

const defaultCreateDraft = {
  topic: "",
  expiry: 60,
  roomLimit: 10,
  password: "",
};

const noPasswordAnswers = new Set(["n", "no", "none", "off", "open"]);

export const directionTwoThemes = [
  { id: "orange", label: "orange", selection: "1" },
  { id: "blue", label: "blue", selection: "2" },
  { id: "green", label: "green", selection: "3" },
  { id: "purple", label: "purple", selection: "4" },
];

export function completeDirectionTwoCommand(value) {
  const trimmedValue = value.trim();
  if (!trimmedValue || trimmedValue.includes(" ")) return null;

  const hasSlash = trimmedValue.startsWith("/");
  const partial = trimmedValue.toLowerCase().replace(/^\/+/, "");
  const match = commands.find(command => command.startsWith(partial) && command !== partial);

  return match ? `${hasSlash ? "/" : ""}${match}` : null;
}

export function getDirectionTwoCreateHint(value) {
  const parsed = parseDirectionTwoCreateCommand(value);

  if (parsed.status === "not-create" || parsed.status === "ready" || parsed.status === "invalid") {
    return null;
  }

  switch (parsed.nextStep) {
    case "topic":
      return "write the title of the room";
    case "expiry":
      return "add minutes";
    case "limit":
      return "add members";
    case "password-choice":
      return "add password or no";
    default:
      return null;
  }
}

export function parseDirectionTwoCreateCommand(value) {
  const trimmedValue = value.trim();
  const commandMatch = trimmedValue.match(/^\/?(create|start|new)(?:\s+(.+))?$/i);

  if (!commandMatch) return { status: "not-create" };

  const tokens = tokenizeCommandArguments(commandMatch[2] ?? "");

  if (!tokens.length) {
    return {
      status: "partial",
      nextStep: "topic",
      draft: { ...defaultCreateDraft },
    };
  }

  const completeWithPassword = parseCompleteCreateTokens(tokens, true);
  if (completeWithPassword) return completeWithPassword;

  const completeWithoutPassword = parseCompleteCreateTokens(tokens, false);
  if (completeWithoutPassword) return completeWithoutPassword;

  const partialWithExpiry = parsePartialCreateTokens(tokens);
  if (partialWithExpiry) return partialWithExpiry;

  return {
    status: "partial",
    nextStep: "expiry",
    draft: {
      ...defaultCreateDraft,
      topic: tokens.join(" ").trim(),
    },
  };
}

function tokenizeCommandArguments(value) {
  const tokens = [];
  const tokenPattern = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match = tokenPattern.exec(value);

  while (match) {
    tokens.push(match[1] ?? match[2] ?? match[3] ?? "");
    match = tokenPattern.exec(value);
  }

  return tokens.map(token => token.trim()).filter(Boolean);
}

function parseCompleteCreateTokens(tokens, hasPasswordAnswer) {
  const minimumLength = hasPasswordAnswer ? 4 : 3;
  if (tokens.length < minimumLength) return null;

  const passwordOffset = hasPasswordAnswer ? 1 : 0;
  const expiryToken = tokens[tokens.length - 2 - passwordOffset];
  const limitToken = tokens[tokens.length - 1 - passwordOffset];
  const titleTokens = tokens.slice(0, tokens.length - 2 - passwordOffset);

  if (!titleTokens.length) return null;
  if (!looksNumeric(expiryToken) || !looksNumeric(limitToken)) return null;

  const expiryResult = parseExpiry(expiryToken);
  if (!expiryResult.valid) return { status: "invalid", message: expiryResult.message };

  const limitResult = parseRoomLimit(limitToken);
  if (!limitResult.valid) return { status: "invalid", message: limitResult.message };

  const password = hasPasswordAnswer ? normalizeInlinePassword(tokens[tokens.length - 1]) : "";

  return {
    status: hasPasswordAnswer ? "ready" : "partial",
    ...(hasPasswordAnswer ? {} : { nextStep: "password-choice" }),
    draft: {
      ...defaultCreateDraft,
      topic: titleTokens.join(" ").trim(),
      expiry: expiryResult.value,
      roomLimit: limitResult.value,
      password,
    },
  };
}

function parsePartialCreateTokens(tokens) {
  if (tokens.length < 2) return null;

  const expiryToken = tokens[tokens.length - 1];
  const titleTokens = tokens.slice(0, -1);
  if (!titleTokens.length || !looksNumeric(expiryToken)) return null;

  const expiryResult = parseExpiry(expiryToken);
  if (!expiryResult.valid) return { status: "invalid", message: expiryResult.message };

  return {
    status: "partial",
    nextStep: "limit",
    draft: {
      ...defaultCreateDraft,
      topic: titleTokens.join(" ").trim(),
      expiry: expiryResult.value,
    },
  };
}

function looksNumeric(value) {
  return value !== undefined && value !== "" && Number.isFinite(Number(value));
}

function parseExpiry(value) {
  const expiry = Number(value);
  if (!Number.isFinite(expiry) || expiry < 15) {
    return {
      valid: false,
      message: "expiry must be 15 minutes or more",
    };
  }

  return { valid: true, value: expiry };
}

function parseRoomLimit(value) {
  const roomLimit = Number(value);
  if (!Number.isInteger(roomLimit) || roomLimit < 1 || roomLimit > 30) {
    return {
      valid: false,
      message: "member limit must be a whole number from 1 to 30",
    };
  }

  return { valid: true, value: roomLimit };
}

function normalizeInlinePassword(value) {
  return noPasswordAnswers.has(value.trim().toLowerCase()) ? "" : value.trim();
}

export function resolveDirectionTwoThemeChoice(value, random = Math.random) {
  const trimmedValue = value.trim().toLowerCase();
  if (!trimmedValue) return null;

  if (trimmedValue === "5" || trimmedValue === "surprise" || trimmedValue === "surprise me") {
    const index = Math.max(0, Math.min(directionTwoThemes.length - 1, Math.floor(random() * directionTwoThemes.length)));
    return directionTwoThemes[index];
  }

  return directionTwoThemes.find(theme => theme.selection === trimmedValue) ?? null;
}
