const POLL_OPTION_LIMIT = 4;

function cleanCommandName(value) {
  return value.trim().toLowerCase().replace(/^\/+/, "");
}

function parsePoll(rawArgs) {
  const segments = rawArgs
    .split("|")
    .map(segment => segment.trim())
    .filter(Boolean);
  const [question, ...options] = segments;

  if (!question || options.length < 2) {
    return {
      type: "invalid",
      message: "poll needs a question and at least 2 options",
    };
  }

  return {
    type: "poll-inline",
    question,
    options: options.slice(0, POLL_OPTION_LIMIT),
  };
}

export function parseRoomCommand(rawValue) {
  const value = rawValue.trim();

  if (!value) {
    return {
      type: "empty",
    };
  }

  if (!value.startsWith("/")) {
    return {
      type: "message",
      text: value,
    };
  }

  const [, rawName = "", rawArgs = ""] = value.match(/^\/([a-z]+)(?:\s+([\s\S]*))?$/i) ?? [];
  const name = cleanCommandName(rawName);
  const args = rawArgs.trim();

  if (name === "poll") {
    return args
      ? parsePoll(args)
      : {
          type: "invalid",
          message: "usage: /poll question | option a | option b",
        };
  }

  if (name === "style") {
    return {
      type: "style",
      argument: args,
    };
  }

  if (name === "command" || name === "commands") {
    return {
      type: "commands",
    };
  }

  if (["share", "leave", "exit", "close", "help"].includes(name)) {
    return {
      type: name,
    };
  }

  return {
    type: "unknown",
    command: value,
  };
}
