import assert from "node:assert/strict";
import test from "node:test";

import {
  createEmptyRoomPollDraft,
  getRoomPollInlinePrompt,
  getRoomPollPrompt,
  submitRoomPollDraftAnswer,
} from "./room-poll-command.mjs";

test("starts the room poll flow at the question prompt", () => {
  assert.equal(getRoomPollPrompt({ step: "question", draft: createEmptyRoomPollDraft() }), "poll question:");
});

test("renders an inline create-style prompt for the question step", () => {
  assert.deepEqual(
    getRoomPollInlinePrompt({ step: "question", draft: createEmptyRoomPollDraft() }),
    {
      prefix: "/poll /",
      placeholder: "what should we ask?",
    },
  );
});

test("renders an inline create-style prompt for option steps", () => {
  assert.deepEqual(
    getRoomPollInlinePrompt({
      step: "option",
      draft: {
        question: "Where should we go?",
        options: ["Goa"],
      },
    }),
    {
      prefix: "/poll / Where should we go? / Goa /",
      placeholder: "option 2",
    },
  );
});

test("advances from question to first option", () => {
  assert.deepEqual(
    submitRoomPollDraftAnswer(
      { step: "question", draft: createEmptyRoomPollDraft() },
      "Where should we go?",
    ),
    {
      status: "pending",
      state: {
        step: "option",
        draft: {
          question: "Where should we go?",
          options: [],
        },
      },
      message: "option 1:",
    },
  );
});

test("requires at least two options before allowing completion", () => {
  assert.deepEqual(
    submitRoomPollDraftAnswer(
      {
        step: "option",
        draft: {
          question: "Where should we go?",
          options: ["Goa"],
        },
      },
      "",
    ),
    {
      status: "invalid",
      message: "add at least 2 options before finishing",
    },
  );
});

test("allows finishing a room poll after at least two options", () => {
  assert.deepEqual(
    submitRoomPollDraftAnswer(
      {
        step: "option",
        draft: {
          question: "Where should we go?",
          options: ["Goa", "Bali"],
        },
      },
      "done",
    ),
    {
      status: "ready",
      payload: {
        question: "Where should we go?",
        options: ["Goa", "Bali"],
      },
    },
  );
});

test("caps the room poll flow at four options", () => {
  assert.deepEqual(
    submitRoomPollDraftAnswer(
      {
        step: "option",
        draft: {
          question: "Where should we go?",
          options: ["Goa", "Bali", "Sri Lanka"],
        },
      },
      "Japan",
    ),
    {
      status: "ready",
      payload: {
        question: "Where should we go?",
        options: ["Goa", "Bali", "Sri Lanka", "Japan"],
      },
    },
  );
});

test("rejects duplicate room poll options", () => {
  assert.deepEqual(
    submitRoomPollDraftAnswer(
      {
        step: "option",
        draft: {
          question: "Where should we go?",
          options: ["Goa", "Bali"],
        },
      },
      "Goa",
    ),
    {
      status: "invalid",
      message: "poll options must be unique",
    },
  );
});
