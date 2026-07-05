export type RoomPollDraft = {
  question: string;
  options: string[];
};

export type RoomPollState = {
  step: "question" | "option";
  draft: RoomPollDraft;
};

export declare function createEmptyRoomPollDraft(): RoomPollDraft;
export declare function getRoomPollPrompt(state: RoomPollState): string;
export declare function getRoomPollInlinePrompt(state: RoomPollState): {
  prefix: string;
  placeholder: string;
};
export declare function submitRoomPollDraftAnswer(
  state: RoomPollState,
  value: string,
):
  | { status: "pending"; state: RoomPollState; message: string }
  | { status: "invalid"; message: string }
  | { status: "ready"; payload: RoomPollDraft };
