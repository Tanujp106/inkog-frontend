import type { InkogThemeChoice } from "./inkog-theme.mjs";

export declare function getRoomStylePrompt(): string;
export declare function resolveRoomStyleSelection(
  value: string,
  random?: () => number,
):
  | { ok: false; message: string }
  | { ok: true; theme: InkogThemeChoice; transcriptMessage: string };
