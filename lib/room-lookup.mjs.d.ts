export function isValidRoomId(roomId: unknown): boolean;

export function resolveRoomLookupOutcome(input: {
  ok: boolean;
  status: number;
  secondsLeft?: number;
}): { stage: "expired" | "error" | "ready"; message?: string };

export function resolveRoomAccessFailureStage(
  status?: number,
): "expired" | "error";
