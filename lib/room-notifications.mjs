export function getRoomCountdownNotification(previousSecondsLeft, nextSecondsLeft) {
  if (!Number.isFinite(previousSecondsLeft) || !Number.isFinite(nextSecondsLeft)) {
    return null;
  }

  if (previousSecondsLeft <= 300 || nextSecondsLeft <= 0 || nextSecondsLeft > 300) {
    return null;
  }

  return {
    sound: "countdownWarning",
    message: "5 minutes left",
  };
}
