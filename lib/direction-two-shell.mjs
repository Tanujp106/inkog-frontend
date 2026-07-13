export const commands = ["create", "join", "help", "clear", "style", "sound"];

export const directionTwoCommandReferenceLines = [
  "/create",
  "/join <room code>",
  "/help",
  "/clear",
  "/style <1-4>",
  "/sound on|off|toggle",
  "shortcuts",
  "tab autocomplete",
  "enter submit",
  "arrow up/down history",
  "escape cancel",
];

const slashCommandLabels = {
  create: "create a room",
  join: "join room using code",
  help: "ask anything",
  clear: "clear terminal",
  style: "change color",
  sound: "sound settings",
};
const inlineCommandOptionValues = {
  sound: ["on", "off", "status"],
  style: ["1", "2", "3", "4", "5"],
};

const defaultCreateDraft = {
  topic: "",
  expiry: 60,
  roomLimit: 10,
  password: "",
};

const noPasswordAnswers = new Set(["n", "no", "none", "off", "open"]);
const yesPasswordAnswers = new Set(["y", "yes"]);
const inlineHintByCommand = {
  help: "ask anything",
  join: "room id or link",
  style: "choose 1-5",
  sound: "on/off/status",
};
const slashPromptCommands = new Set(Object.keys(inlineHintByCommand));
const inlinePromptIconByCommand = {
  help: "help",
  join: "key",
  style: "style",
  sound: "sound",
};
const createPromptPixelPatterns = {
  room: [
    "00100",
    "01110",
    "11111",
    "10101",
    "10101",
    "11111",
  ],
  time: [
    "01110",
    "10001",
    "10101",
    "10011",
    "10001",
    "01110",
  ],
  people: [
    "01010",
    "10101",
    "01010",
    "11111",
    "10101",
    "10101",
  ],
  lock: [
    "01110",
    "10001",
    "11111",
    "11011",
    "11011",
    "11111",
  ],
  key: [
    "01100",
    "10010",
    "01100",
    "00111",
    "00010",
    "00011",
  ],
  help: [
    "01110",
    "10001",
    "00010",
    "00100",
    "00000",
    "00100",
  ],
  style: [
    "10101",
    "01010",
    "10101",
    "01010",
    "10101",
    "01010",
  ],
  sound: [
    "01000",
    "01100",
    "01110",
    "01100",
    "01000",
    "00110",
  ],
  list: [
    "11111",
    "10000",
    "11110",
    "10000",
    "11111",
    "00000",
  ],
  enter: [
    "10000",
    "10000",
    "10111",
    "10100",
    "11100",
    "00100",
  ],
};

export const directionTwoThemes = [
  { id: "orange", label: "orange", selection: "1" },
  { id: "blue", label: "blue", selection: "2" },
  { id: "green", label: "green", selection: "3" },
  { id: "purple", label: "purple", selection: "4" },
];
const directionTwoStyleSurpriseChoice = { id: "surprise", label: "surprise me", selection: "5" };

export function completeDirectionTwoCommand(value) {
  const trimmedValue = value.trim();
  if (!trimmedValue || trimmedValue.includes(" ")) return null;
  if (!trimmedValue.startsWith("/")) return null;

  const partial = trimmedValue.toLowerCase().replace(/^\/+/, "");
  if (!partial) return null;
  if (commands.includes(partial)) return null;

  const match = commands.find(command => command.startsWith(partial) && command !== partial);

  return match ? `/${match}` : null;
}

export function completeDirectionTwoCommandArgument(value) {
  const match = value.match(/^\s*\/(sound|style)(\s*\/\s*|\s+)(\S*)\s*$/i);
  if (!match) return null;

  const [, rawCommand, separator, rawArgument] = match;
  const command = rawCommand.toLowerCase();
  const argument = rawArgument.toLowerCase();
  const option = inlineCommandOptionValues[command].find(value => value.startsWith(argument));

  if (!option || option === argument) return null;

  return `/${command}${separator}${option}`;
}

export function getDirectionTwoSlashCommandSuggestions(value) {
  const trimmedValue = value.trim();
  if (!trimmedValue.startsWith("/") || /\s/.test(trimmedValue)) return [];

  const query = trimmedValue.slice(1).toLowerCase();
  if (commands.includes(query)) return [];

  return commands
    .filter(command => command.startsWith(query))
    .map(command => ({
      id: command,
      command: `/${command}`,
      label: slashCommandLabels[command],
    }));
}

export function getDirectionTwoCreateHint(value) {
  const parsed = parseDirectionTwoCreateCommand(value);

  if (parsed.status === "ready") return "tap enter to create";

  if (parsed.status === "not-create" || parsed.status === "invalid") {
    return null;
  }

  switch (parsed.nextStep) {
    case "topic":
      return "what should we call the room?";
    case "expiry":
      return "what should be the total time?";
    case "limit":
      return "maximum participants?";
    case "password-choice":
      return "add password?(y/n)";
    case "password":
      return "write password";
    default:
      return parsed.status === "ready" ? "tap enter to create" : null;
  }
}

export function getDirectionTwoCreateAnswerError(step, rawAnswer) {
  const answer = rawAnswer.trim();

  switch (step) {
    case "topic":
      return answer ? null : "Topic cannot be empty.";
    case "expiry": {
      const expiry = Number(answer);
      return Number.isFinite(expiry) && expiry >= 15 ? null : "Expiry must be 15 minutes or more.";
    }
    case "limit": {
      const roomLimit = Number(answer);
      return Number.isInteger(roomLimit) && roomLimit >= 1 && roomLimit <= 30
        ? null
        : "Member limit must be from 1 to 30.";
    }
    case "password-choice":
      return noPasswordAnswers.has(answer.toLowerCase()) || yesPasswordAnswers.has(answer.toLowerCase())
        ? null
        : "Answer y or n.";
    case "password":
      return answer ? null : "Password cannot be empty.";
    default:
      return null;
  }
}

export function getDirectionTwoInlineFeedbackMessage(message) {
  const trimmedMessage = message.trim().replace(/\.$/, "");
  const lowerMessage = trimmedMessage.toLowerCase();

  if (lowerMessage.includes("15 minutes")) return "use 15 minutes or more";
  if (lowerMessage.includes("1 to 30")) return "use 1 to 30";
  if (lowerMessage.includes("only accepts numbers")) return "numbers only";
  if (lowerMessage.includes("answer y or n")) return "answer y or n";

  return trimmedMessage;
}

export function getDirectionTwoCreateGhostText(value) {
  const hint = getDirectionTwoCreateHint(value);
  if (!hint) return null;

  return buildInlineGhostText(value, hint);
}

export function getDirectionTwoInlineHint(value) {
  const createHint = getDirectionTwoLiveCreateHint(value);
  if (createHint) return createHint;

  const parsed = parseInlineCommandPrefix(value);
  if (!parsed || parsed.command === "create") return null;
  if (!slashPromptCommands.has(parsed.command)) return null;
  if (!hasTrailingInlineSeparator(value)) return null;

  const inlineCommand = parseDirectionTwoInlineCommand(value);
  if (inlineCommand?.argument) return null;

  return inlineHintByCommand[parsed.command] ?? null;
}

export function getDirectionTwoInlineGhostText(value) {
  const hint = getDirectionTwoInlineHint(value);
  if (!hint) return null;

  return buildInlineGhostText(value, hint);
}

export function resolveDirectionTwoEnterAction(value) {
  const parsedCreate = parseDirectionTwoCreateCommand(value);
  if (parsedCreate.status === "partial") {
    const hint = getDirectionTwoCreateHint(value);
    if (!hint) return null;

    const nextCreateValue = formatSlashDelimitedCreateInput(parsedCreate);

    if (nextCreateValue === value) {
      return {
        type: "hold-inline",
        hint,
      };
    }

    return {
      type: "continue-inline",
      value: nextCreateValue,
      hint,
    };
  }

  const parsedPrefix = parseInlineCommandPrefix(value);
  const isBareInlineCommand =
    parsedPrefix &&
    parsedPrefix.command !== "create" &&
    slashPromptCommands.has(parsedPrefix.command) &&
    !parsedPrefix.argument.trim();

  if (!isBareInlineCommand) return null;
  const hint = inlineHintByCommand[parsedPrefix.command];
  if (!hint) return null;

  return {
    type: "continue-inline",
    value: `${value.trimEnd()} / `,
    hint,
  };
}

export function resolveDirectionTwoGhostTapCompletion(value, hasActiveFlow = false) {
  if (hasActiveFlow) return null;

  return completeDirectionTwoCommand(value)
    ?? completeDirectionTwoCommandArgument(value)
    ?? resolveDirectionTwoEnterAction(value)?.value
    ?? completeDirectionTwoCreateField(value);
}

export function getDirectionTwoCreatePromptPresentation(value) {
  const parsed = parseDirectionTwoCreateCommand(value);
  if (parsed.status === "not-create" || parsed.status === "invalid") return null;

  const nextStep = parsed.status === "ready" ? "confirm" : parsed.nextStep;

  switch (nextStep) {
    case "topic":
      return createPromptPresentation("room", "accent");
    case "expiry":
      return createPromptPresentation("time", "muted");
    case "limit":
      return createPromptPresentation("people", "muted");
    case "password-choice":
      return createPromptPresentation("lock", "muted");
    case "password":
      return createPromptPresentation("key", "muted");
    case "confirm":
      return createPromptPresentation("enter", "muted");
    default:
      return null;
  }
}

export function getDirectionTwoInlinePromptPresentation(value) {
  const createPresentation = getDirectionTwoCreatePromptPresentation(value);
  if (createPresentation) return createPresentation;

  if (!hasTrailingInlineSeparator(value)) return null;

  const parsed = parseDirectionTwoInlineCommand(value);
  if (!parsed || parsed.argument || !slashPromptCommands.has(parsed.command)) return null;

  const icon = inlinePromptIconByCommand[parsed.command];
  return icon ? createPromptPresentation(icon, "muted") : null;
}

export function getDirectionTwoStyleGhostChoices(value) {
  const parsed = parseDirectionTwoInlineCommand(value);
  if (parsed?.command !== "style" || parsed.argument || !hasTrailingInlineSeparator(value)) return null;

  return [
    ...directionTwoThemes.map(theme => ({
      selection: theme.selection,
      id: theme.id,
      label: theme.label,
    })),
    directionTwoStyleSurpriseChoice,
  ];
}

export function getDirectionTwoCreateEditingStep(value) {
  const state = getSlashDelimitedCreateInputState(value);
  if (!state) return null;

  const steps = ["topic", "expiry", "limit", "password-choice", "password"];
  return steps[state.activeSegmentIndex] ?? null;
}

export function getDirectionTwoCreateTimeArrowValue(value, direction) {
  const state = getSlashDelimitedCreateInputState(value);
  if (!state || getDirectionTwoCreateEditingStep(value) !== "expiry") return null;

  const topic = state.segments[0]?.trim() ?? "";
  const currentValue = state.segments[1]?.trim() ?? "";
  if (!topic || !/^\d+$/.test(currentValue)) return null;

  const currentTime = Number(currentValue);
  const delta = direction === "up" ? 5 : -5;
  const nextTime = Math.max(15, currentTime + delta);

  return `/create / ${topic} / ${nextTime}`;
}

export function isDirectionTwoCreateTimeInputValid(value) {
  return getDirectionTwoCreateInlineInputError(value) === null;
}

export function getDirectionTwoCreateInlineInputError(value) {
  const state = getSlashDelimitedCreateInputState(value);
  const step = state ? getDirectionTwoCreateEditingStep(value) : null;
  if (!state || !step) return null;

  const currentValue = state.segments[state.activeSegmentIndex]?.trim() ?? "";
  if (!currentValue) return null;

  if ((step === "expiry" || step === "limit") && !/^\d+$/.test(currentValue)) {
    return step === "expiry" ? "Total time only accepts numbers." : "Member limit only accepts numbers.";
  }

  if (step === "password-choice" && !isPasswordChoicePrefix(currentValue)) {
    return "Answer y or n.";
  }

  return null;
}

export function getDirectionTwoCreateVisualSegments(value) {
  const match = value.match(/^(\s*\/(?:create|start|new)\s+\/\s*)([^/]+)([\s\S]*)$/i);
  if (!match) return null;

  const [, prefix, rawTopic, suffix] = match;
  const leadingTopicSpace = rawTopic.match(/^\s*/)?.[0] ?? "";
  const trailingTopicSpace = rawTopic.match(/\s*$/)?.[0] ?? "";
  const topic = rawTopic.trim();
  if (!topic) return null;

  return [
    { text: `${prefix}${leadingTopicSpace}`, tone: "normal" },
    { text: topic, tone: "topic" },
    { text: `${trailingTopicSpace}${suffix}`, tone: "normal" },
  ].filter(segment => segment.text.length > 0);
}

function createPromptPresentation(icon, tone) {
  return {
    icon,
    tone,
    pattern: createPromptPixelPatterns[icon],
  };
}

export function completeDirectionTwoCreateField(value) {
  const parsed = parseDirectionTwoCreateCommand(value);
  if (parsed.status !== "partial") return null;

  switch (parsed.nextStep) {
    case "topic":
      return appendInlineCreateField(value, '"room name"');
    case "expiry":
      return appendInlineCreateField(value, "60");
    case "limit":
      return appendInlineCreateField(value, "10");
    case "password-choice":
      return appendInlineCreateField(value, "n");
    case "password":
      return appendInlineCreateField(value, '"password"');
    default:
      return null;
  }
}

export function parseDirectionTwoCreateCommand(value) {
  const trimmedValue = value.trim();
  const commandMatch = trimmedValue.match(/^\/(create|start|new)(?:\s+(.+))?$/i);

  if (!commandMatch) return { status: "not-create" };

  const rawArguments = commandMatch[2] ?? "";
  const slashDelimitedCreate = parseSlashDelimitedCreateCommand(rawArguments);
  if (slashDelimitedCreate) return slashDelimitedCreate;

  const tokens = tokenizeSlashDelimitedCreateArguments(rawArguments) ?? tokenizeCommandArguments(rawArguments);

  if (!tokens.length) {
    return {
      status: "partial",
      nextStep: "topic",
      draft: { ...defaultCreateDraft },
    };
  }

  const completeWithPassword = parseCreateTokensWithPasswordChoice(tokens);
  if (completeWithPassword) return completeWithPassword;

  const completeWithoutPassword = parseCreateTokensWithoutPassword(tokens);
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

function buildInlineGhostText(value, hint) {
  if (hasTrailingInlineSeparator(value)) return hint;
  return `${value.endsWith(" ") ? "" : " "}/ ${hint}`;
}

function getDirectionTwoLiveCreateHint(value) {
  if (!isCreateCommandInput(value) || !hasTrailingInlineSeparator(value)) return null;
  return getDirectionTwoCreateHint(value);
}

function hasTrailingInlineSeparator(value) {
  return /(?:^|\s)\/\s*$/.test(value);
}

function isCreateCommandInput(value) {
  return /^\s*\/(create|start|new)(?:\s|$)/i.test(value);
}

function getSlashDelimitedCreateInputState(value) {
  const match = value.match(/^\s*\/(create|start|new)(?:\s+([\s\S]*))?$/i);
  const rawArguments = match?.[2] ?? "";
  if (!match || !rawArguments.includes("/")) return null;

  const startsWithSeparator = rawArguments.trimStart().startsWith("/");
  const segments = rawArguments.split("/");
  if (startsWithSeparator) segments.shift();

  return {
    segments,
    activeSegmentIndex: Math.max(0, segments.length - 1),
  };
}

function tokenizeSlashDelimitedCreateArguments(value) {
  if (!value.includes("/")) return null;

  const segments = value
    .split("/")
    .map(segment => segment.trim())
    .filter(Boolean);

  if (!segments.length) return [];

  const topic = stripSegmentLabel(segments[0], ["room name", "room", "topic", "title"]);
  const expiry = stripSegmentLabel(segments[1] ?? "", ["total time", "time", "minutes", "expiry"]);
  const limit = stripSegmentLabel(segments[2] ?? "", ["maximum participants", "participants", "members", "limit"]);
  const passwordChoice = stripSegmentLabel(segments[3] ?? "", ["add password?", "add password", "password"]);
  const password = stripSegmentLabel(segments[4] ?? "", ["write password", "password"]);

  return [topic, expiry, limit, passwordChoice, password]
    .map(token => token.trim())
    .filter(Boolean);
}

function parseSlashDelimitedCreateCommand(value) {
  const state = getSlashDelimitedCreateFields(value);
  if (!state) return null;

  const { fields, segmentCount } = state;
  const topic = fields[0] ?? "";
  const expiryValue = fields[1] ?? "";
  const limitValue = fields[2] ?? "";
  const passwordChoice = fields[3] ?? "";
  const password = fields[4] ?? "";

  if (!topic) {
    return {
      status: "partial",
      nextStep: "topic",
      draft: { ...defaultCreateDraft },
    };
  }

  if (segmentCount < 2 || !expiryValue) {
    return {
      status: "partial",
      nextStep: "expiry",
      draft: {
        ...defaultCreateDraft,
        topic,
      },
    };
  }

  const expiryResult = parseExpiry(expiryValue);
  if (!expiryResult.valid) return { status: "invalid", message: expiryResult.message };

  if (segmentCount < 3 || !limitValue) {
    return {
      status: "partial",
      nextStep: "limit",
      draft: {
        ...defaultCreateDraft,
        topic,
        expiry: expiryResult.value,
      },
    };
  }

  const limitResult = parseRoomLimit(limitValue);
  if (!limitResult.valid) return { status: "invalid", message: limitResult.message };

  if (segmentCount < 4 || !passwordChoice) {
    return {
      status: "partial",
      nextStep: "password-choice",
      draft: {
        ...defaultCreateDraft,
        topic,
        expiry: expiryResult.value,
        roomLimit: limitResult.value,
      },
    };
  }

  const normalizedPasswordChoice = passwordChoice.toLowerCase();
  if (noPasswordAnswers.has(normalizedPasswordChoice)) {
    return {
      status: "ready",
      draft: {
        ...defaultCreateDraft,
        topic,
        expiry: expiryResult.value,
        roomLimit: limitResult.value,
        password: "",
      },
    };
  }

  if (!yesPasswordAnswers.has(normalizedPasswordChoice)) {
    return { status: "invalid", message: "answer y or n" };
  }

  if (segmentCount < 5 || !password) {
    return {
      status: "partial",
      nextStep: "password",
      draft: {
        ...defaultCreateDraft,
        topic,
        expiry: expiryResult.value,
        roomLimit: limitResult.value,
        password: "",
      },
    };
  }

  return {
    status: "ready",
    draft: {
      ...defaultCreateDraft,
      topic,
      expiry: expiryResult.value,
      roomLimit: limitResult.value,
      password,
    },
  };
}

function getSlashDelimitedCreateFields(value) {
  if (!value.includes("/")) return null;

  const rawSegments = value.split("/");
  if (value.trimStart().startsWith("/")) rawSegments.shift();

  const labelsByIndex = [
    ["room name", "room", "topic", "title"],
    ["total time", "time", "minutes", "expiry"],
    ["maximum participants", "participants", "members", "limit"],
    ["add password?", "add password", "password"],
    ["write password", "password"],
  ];
  const fields = labelsByIndex.map((labels, index) => {
    return stripSegmentLabel(rawSegments[index] ?? "", labels).trim();
  });

  return {
    fields,
    segmentCount: rawSegments.length,
  };
}

function stripSegmentLabel(segment, labels) {
  const trimmedSegment = segment.trim();
  const lowerSegment = trimmedSegment.toLowerCase();

  for (const label of labels) {
    if (lowerSegment === label) return "";
    if (lowerSegment.startsWith(`${label} `)) {
      return trimmedSegment.slice(label.length).trim();
    }
  }

  return trimmedSegment;
}

function formatSlashDelimitedCreateInput(parsed) {
  const draft = parsed.draft;

  if (parsed.nextStep === "topic") {
    return "/create / ";
  }

  const parts = [`/create / ${draft.topic}`];

  if (parsed.nextStep === "expiry") {
    return `${parts[0]} / `;
  }

  parts.push(String(draft.expiry));
  if (parsed.nextStep === "limit") {
    return `${parts.join(" / ")} / `;
  }

  parts.push(String(draft.roomLimit));
  if (parsed.nextStep === "password-choice") {
    return `${parts.join(" / ")} / `;
  }

  parts.push("y");
  return `${parts.join(" / ")} / `;
}

function appendInlineCreateField(value, field) {
  const trimmedValue = value.trimEnd();
  const createCommandMatch = trimmedValue.match(/^(\s*\/(?:create|start|new))(?:\s+([\s\S]*))?$/i);

  if (createCommandMatch) {
    const rawArguments = createCommandMatch[2] ?? "";
    const shouldUseSlashSegments = !rawArguments || rawArguments.includes("/");

    if (shouldUseSlashSegments) {
      if (!rawArguments.trim()) return `${createCommandMatch[1]} / ${field}`;
      if (hasTrailingInlineSeparator(trimmedValue)) return `${trimmedValue}${field}`;
      return `${trimmedValue} / ${field}`;
    }
  }

  return `${trimmedValue}${trimmedValue ? " " : ""}${field}`;
}

function parseInlineCommandPrefix(value) {
  const match = value.match(/^\s*\/(create|help|join|style|sound|clear)(\s.*)?$/i);
  if (!match) return null;

  return {
    command: match[1].toLowerCase(),
    argument: match[2] ?? "",
  };
}

export function parseDirectionTwoInlineCommand(value) {
  const match = value.match(/^\s*\/(create|help|join|style|sound|clear)(?:\s+([\s\S]*))?$/i);
  if (!match) return null;

  const rawArgument = match[2] ?? "";
  const usesSlash = rawArgument.trimStart().startsWith("/");
  const argument = usesSlash
    ? rawArgument.replace(/^\s*\/\s*/, "").trim()
    : rawArgument.trim();

  return {
    command: match[1].toLowerCase(),
    argument,
    usesSlash,
  };
}

function parseCreateTokensWithPasswordChoice(tokens) {
  const choiceIndex = tokens.findIndex(token => yesPasswordAnswers.has(token.toLowerCase()));
  if (choiceIndex < 0) return null;
  if (choiceIndex < 3) return null;

  const expiryToken = tokens[choiceIndex - 2];
  const limitToken = tokens[choiceIndex - 1];
  const titleTokens = tokens.slice(0, choiceIndex - 2);
  if (!titleTokens.length || !looksNumeric(expiryToken) || !looksNumeric(limitToken)) return null;

  const expiryResult = parseExpiry(expiryToken);
  if (!expiryResult.valid) return { status: "invalid", message: expiryResult.message };

  const limitResult = parseRoomLimit(limitToken);
  if (!limitResult.valid) return { status: "invalid", message: limitResult.message };

  const password = tokens.slice(choiceIndex + 1).join(" ").trim();
  const draft = {
    ...defaultCreateDraft,
    topic: titleTokens.join(" ").trim(),
    expiry: expiryResult.value,
    roomLimit: limitResult.value,
    password,
  };

  if (!password) {
    return {
      status: "partial",
      nextStep: "password",
      draft,
    };
  }

  return {
    status: "ready",
    draft,
  };
}

function parseCreateTokensWithoutPassword(tokens) {
  if (tokens.length < 3) return null;

  const passwordChoice = tokens[tokens.length - 1].toLowerCase();
  const hasNoPasswordChoice = noPasswordAnswers.has(passwordChoice);
  const expiryToken = tokens[tokens.length - (hasNoPasswordChoice ? 3 : 2)];
  const limitToken = tokens[tokens.length - (hasNoPasswordChoice ? 2 : 1)];
  const titleTokens = tokens.slice(0, tokens.length - (hasNoPasswordChoice ? 3 : 2));

  if (!titleTokens.length) return null;
  if (!looksNumeric(expiryToken) || !looksNumeric(limitToken)) return null;

  const expiryResult = parseExpiry(expiryToken);
  if (!expiryResult.valid) return { status: "invalid", message: expiryResult.message };

  const limitResult = parseRoomLimit(limitToken);
  if (!limitResult.valid) return { status: "invalid", message: limitResult.message };

  return {
    status: hasNoPasswordChoice ? "ready" : "partial",
    ...(hasNoPasswordChoice ? {} : { nextStep: "password-choice" }),
    draft: {
      ...defaultCreateDraft,
      topic: titleTokens.join(" ").trim(),
      expiry: expiryResult.value,
      roomLimit: limitResult.value,
      password: "",
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

function isPasswordChoicePrefix(value) {
  const normalizedValue = value.trim().toLowerCase();
  return ["y", "ye", "yes", "n", "no"].includes(normalizedValue);
}

function parseExpiry(value) {
  const expiry = Number(value);
  if (!Number.isInteger(expiry) || expiry < 15) {
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

export function resolveDirectionTwoThemeChoice(value, random = Math.random) {
  const trimmedValue = value.trim().toLowerCase();
  if (!trimmedValue) return null;

  if (trimmedValue === "5" || trimmedValue === "surprise" || trimmedValue === "surprise me") {
    const index = Math.max(0, Math.min(directionTwoThemes.length - 1, Math.floor(random() * directionTwoThemes.length)));
    return directionTwoThemes[index];
  }

  return directionTwoThemes.find(theme => theme.selection === trimmedValue) ?? null;
}
