export type RoomCommand =
  | { type: "empty" }
  | { type: "message"; text: string }
  | { type: "poll-inline"; question: string; options: string[] }
  | { type: "invalid"; message: string }
  | { type: "share" }
  | { type: "leave" }
  | { type: "close" }
  | { type: "help" }
  | { type: "unknown"; command: string };
