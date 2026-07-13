export type LandingCreateDraft = {
  topic?: string;
  expiry?: number;
  roomLimit?: number;
  password?: string;
};

export type LandingCreateSession = {
  type: "create";
  step: "topic" | "expiry" | "roomLimit" | "password";
  draft: LandingCreateDraft;
};

export type LandingSession = { type: "join" } | { type: "help" } | LandingCreateSession;

export function parseLandingCommand(value: string):
  | { type: "create" }
  | { type: "join"; target: string }
  | { type: "help"; question: string }
  | { type: "cancel" }
  | { type: "unknown"; command: string }
  | { type: "empty" };

export function getLandingSlashCommandSuggestions(query: string): Array<{
  command: "/create" | "/join" | "/help" | "/cancel";
  label: string;
}>;

export function getLandingInlineTemplate(session: LandingSession):
  | { prefix: string; placeholder: string; inputType: "text" | "password" }
  | null;

export function advanceLandingCreateSession(session: LandingCreateSession, value: string):
  | { kind: "next"; session: LandingCreateSession; submitted: string }
  | { kind: "create"; draft: Required<LandingCreateDraft>; submitted: string }
  | { kind: "error"; message: string; submitted: string };

export function redactLandingTranscriptValue(session: LandingSession, value: string): string;
