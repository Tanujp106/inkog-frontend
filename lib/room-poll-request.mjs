export function createPendingRoomPollRequest(question, options) {
  return {
    question: question.trim(),
    options: options.map(option => option.trim()),
  };
}

export function matchesPendingRoomPollRequest(pendingRequest, poll) {
  if (!pendingRequest || !poll) return false;
  if (pendingRequest.question !== poll.question?.trim()) return false;
  if (!Array.isArray(poll.options) || pendingRequest.options.length !== poll.options.length) return false;

  return pendingRequest.options.every((option, index) => option === poll.options[index]?.trim());
}
