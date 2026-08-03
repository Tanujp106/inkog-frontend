const ROOM_POLL_OPTION_LIMIT = 4;

export function createEmptyRoomPollDraft() {
  return {
    question: "",
    options: [],
  };
}

export function getRoomPollPrompt(state) {
  if (state.step === "question") {
    return "poll question:";
  }

  const nextOptionNumber = state.draft.options.length + 1;
  return nextOptionNumber <= 2
    ? `option ${nextOptionNumber}:`
    : `option ${nextOptionNumber}: type done or press enter to finish`;
}

export function getRoomPollInlinePrompt(state) {
  if (state.step === "question") {
    return {
      prefix: "/poll /",
      placeholder: "what should we ask?",
    };
  }

  const parts = [state.draft.question, ...state.draft.options].filter(Boolean);
  const nextOptionNumber = state.draft.options.length + 1;

  return {
    prefix: `/poll / ${parts.join(" / ")} /`,
    placeholder: nextOptionNumber <= 2 ? `option ${nextOptionNumber}` : `option ${nextOptionNumber} or done`,
  };
}

export function submitRoomPollDraftAnswer(state, value) {
  const trimmedValue = value.trim();

  if (state.step === "question") {
    if (!trimmedValue) {
      return {
        status: "invalid",
        message: "poll question cannot be empty",
      };
    }

    const nextState = {
      step: "option",
      draft: {
        question: trimmedValue,
        options: [],
      },
    };

    return {
      status: "pending",
      state: nextState,
      message: getRoomPollPrompt(nextState),
    };
  }

  if (!trimmedValue || trimmedValue.toLowerCase() === "done") {
    return state.draft.options.length >= 2
      ? {
          status: "ready",
          payload: state.draft,
        }
      : {
          status: "invalid",
          message: "add at least 2 options before finishing",
        };
  }

  if (state.draft.options.some(option => option.toLowerCase() === trimmedValue.toLowerCase())) {
    return {
      status: "invalid",
      message: "poll options must be unique",
    };
  }

  const nextDraft = {
    question: state.draft.question,
    options: [...state.draft.options, trimmedValue],
  };

  if (nextDraft.options.length >= ROOM_POLL_OPTION_LIMIT) {
    return {
      status: "ready",
      payload: nextDraft,
    };
  }

  const nextState = {
    step: "option",
    draft: nextDraft,
  };

  return {
    status: "pending",
    state: nextState,
    message: getRoomPollPrompt(nextState),
  };
}
