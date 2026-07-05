export type PendingRoomPollRequest = {
  question: string;
  options: string[];
};

export declare function createPendingRoomPollRequest(
  question: string,
  options: string[],
): PendingRoomPollRequest;

export declare function matchesPendingRoomPollRequest(
  pendingRequest: PendingRoomPollRequest | null | undefined,
  poll: { question: string; options: string[] } | null | undefined,
): boolean;
