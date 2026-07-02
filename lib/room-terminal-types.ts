export type RoomCommand =
  | { type: "empty" }
  | { type: "message"; text: string }
  | { type: "poll-inline"; question: string; options: string[] }
  | { type: "style"; argument: string }
  | { type: "invalid"; message: string }
  | { type: "commands" }
  | { type: "share" }
  | { type: "leave" }
  | { type: "exit" }
  | { type: "close" }
  | { type: "help" }
  | { type: "unknown"; command: string };
