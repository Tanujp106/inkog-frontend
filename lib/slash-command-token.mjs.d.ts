export type SlashCommandTokenDeletionDirection = "backward" | "forward";

export declare function getSlashCommandTokenDeletionRange(
  value: string,
  selectionStart: number | null,
  selectionEnd: number | null,
  direction: SlashCommandTokenDeletionDirection,
): { start: number; end: number } | null;
