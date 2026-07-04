const POLL_OPTION_LIMIT = 4;
const BARE_UTILITY_COMMANDS = new Set(["share", "leave", "exit", "close", "help"]);

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

function parseNamedRoomCommand(name, args, rawValue) {
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
    return args
      ? {
          type: "message",
          text: rawValue,
        }
      : {
          type: "commands",
        };
  }

  if (BARE_UTILITY_COMMANDS.has(name)) {
    return args
      ? {
          type: "message",
          text: rawValue,
        }
      : {
          type: name,
        };
  }

  return null;
}

export function parseRoomCommand(rawValue) {
  const value = rawValue.trim();

  if (!value) {
    return {
      type: "empty",
    };
  }

  if (!value.startsWith("/")) {
    const bareMatch = value.match(/^([a-z]+)(?:\s+([\s\S]*))?$/i);
    const bareName = cleanCommandName(bareMatch?.[1] ?? "");
    const bareArgs = (bareMatch?.[2] ?? "").trim();
    const bareCommand = parseNamedRoomCommand(bareName, bareArgs, value);

    if (bareCommand) {
      return bareCommand;
    }

    return {
      type: "message",
      text: value,
    };
  }

  const [, rawName = "", rawArgs = ""] = value.match(/^\/([a-z]+)(?:\s+([\s\S]*))?$/i) ?? [];
  const name = cleanCommandName(rawName);
  const args = rawArgs.trim();
  const parsedCommand = parseNamedRoomCommand(name, args, value);

  if (parsedCommand) {
    if ((name === "command" || name === "commands" || BARE_UTILITY_COMMANDS.has(name)) && args) {
      return {
        type: "unknown",
        command: value,
      };
    }

    return parsedCommand;
  }

  return {
    type: "unknown",
    command: value,
  };
}
