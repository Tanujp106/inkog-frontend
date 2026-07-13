const CREATE_DEFAULT_EXPIRY = 60;
const CREATE_DEFAULT_ROOM_LIMIT = 10;

function getCommandParts(value) {
  const trimmed = value.trim();
  if (!trimmed) return { command: "", args: "" };

  const [, command = "", args = ""] = trimmed.match(/^\/([a-z]+)(?:\s+([\s\S]*))?$/i) ?? [];
  return { command: command.toLowerCase(), args: args.trim() };
}

function getWholeNumber(value) {
  if (!/^\d+$/.test(value)) return null;
  return Number(value);
}

export function parseLandingCommand(value) {
  const trimmed = value.trim();
  if (!trimmed) return { type: "empty" };

  const { command, args } = getCommandParts(trimmed);
  if (!command) return { type: "unknown", command: trimmed };

  if (command === "create" && !args) return { type: "create" };
  if (command === "join") return { type: "join", target: args };
  if (command === "help") return { type: "help", question: args.replace(/^\/+\s*/, "").trim() };
  if (command === "cancel" && !args) return { type: "cancel" };

  return { type: "unknown", command: trimmed };
}

export function getLandingInlineTemplate(session) {
  if (session.type === "join") {
    return {
      prefix: "/join / ",
      placeholder: "<enter room ID or link>",
      inputType: "text",
    };
  }

  if (session.type === "help") {
    return {
      prefix: "/help / ",
      placeholder: "<ask question>",
      inputType: "text",
    };
  }

  if (session.type !== "create") return null;

  const templates = {
    topic: { prefix: "/create / ", placeholder: "<room topic>", inputType: "text" },
    expiry: { prefix: "/create / expires in ", placeholder: "<minutes, default 60>", inputType: "text" },
    roomLimit: { prefix: "/create / max members ", placeholder: "<1–30, default 10>", inputType: "text" },
    password: { prefix: "/create / password ", placeholder: "<optional>", inputType: "password" },
  };

  return templates[session.step];
}

export function advanceLandingCreateSession(session, value) {
  const submitted = value.trim();

  if (session.step === "topic") {
    if (!submitted) {
      return { kind: "error", submitted, message: "topic is required" };
    }
    return {
      kind: "next",
      submitted,
      session: { type: "create", step: "expiry", draft: { ...session.draft, topic: submitted } },
    };
  }

  if (session.step === "expiry") {
    const expiry = submitted ? getWholeNumber(submitted) : CREATE_DEFAULT_EXPIRY;
    if (!expiry || expiry < 15) {
      return { kind: "error", submitted, message: "expiry must be at least 15 minutes" };
    }
    return {
      kind: "next",
      submitted,
      session: { type: "create", step: "roomLimit", draft: { ...session.draft, expiry } },
    };
  }

  if (session.step === "roomLimit") {
    const roomLimit = submitted ? getWholeNumber(submitted) : CREATE_DEFAULT_ROOM_LIMIT;
    if (!roomLimit || roomLimit < 1 || roomLimit > 30) {
      return { kind: "error", submitted, message: "room limit must be a whole number from 1 to 30" };
    }
    return {
      kind: "next",
      submitted,
      session: { type: "create", step: "password", draft: { ...session.draft, roomLimit } },
    };
  }

  return {
    kind: "create",
    submitted,
    draft: { ...session.draft, password: submitted },
  };
}

export function redactLandingTranscriptValue(session, value) {
  if (session.type === "create" && session.step === "password") {
    return value ? "•".repeat(value.length) : "<no password>";
  }
  return value;
}
